import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { responseJson } from '../scripts/patchwork.js';

const workflow = parse(readFileSync(new URL('../.github/workflows/patchwork.yml', import.meta.url), 'utf8'));
const script = workflow.jobs.repair.steps.find(s => s.id === 'copilot').run;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

for (const mode of ['success', 'failure', 'timeout', 'cancel']) {
  test(`shell real do workflow: ${mode}, argumentos e limpeza de processos`, { skip: process.platform !== 'linux' }, async t => {
    const dir = mkdtempSync(resolve(tmpdir(), 'patchwork-cli-test-'));
    const bin = resolve(dir, 'bin'); mkdirSync(bin);
    const program = resolve(dir, 'fake.mjs');
    writeFileSync(program, `
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const dir = process.env.PATCHWORK_DIR;
const args = process.argv.slice(2);
writeFileSync(dir + '/args.json', JSON.stringify(args));
const logs = dir + '/logs';
mkdirSync(logs, { recursive: true });
writeFileSync(logs + '/process-fixture.log', '[DEBUG] Diagnóstico simulado do CLI.');
const child = spawn('sleep', ['60'], { stdio: 'ignore' }); child.unref();
writeFileSync(dir + '/child.pid', String(child.pid));
console.log('Vou consultar o incidente e ler o código.');
console.log('✓ Consultar incidente (sentry-get_sentry_resource)');
console.log('  └ Consulta concluída.');
console.log('::warning::Texto da ferramenta, não um comando do Actions.');
if (process.env.FIXTURE_MODE === 'success') {
  console.log(JSON.stringify({outcome:'repair', summary:'Correção simulada.'}));
  console.error('Changes    +11 -0\\nAI Credits 6.58 (4s)\\nTokens     ↑ 49.4k • ↓ 150');
} else if (process.env.FIXTURE_MODE === 'failure') {
  console.error('Falha simulada do Copilot.');
  process.exitCode = 7;
} else { setInterval(() => {}, 1000); }
`);
    writeFileSync(resolve(bin, 'copilot'), `#!/bin/bash\nexec "${process.execPath}" "${program}" "$@"\n`);
    chmodSync(resolve(bin, 'copilot'), 0o755);
    writeFileSync(resolve(dir, 'prompt.md'), 'Investigue o incidente.');
    writeFileSync(resolve(dir, 'mcp.json'), '{}');
    const launcher = spawn('bash', ['-c', script], { cwd: dir, detached: true,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, PATCHWORK_DIR: dir,
        PATCHWORK_TIMEOUT: mode === 'timeout' ? '0.3s' : '5s', FIXTURE_MODE: mode, COPILOT_MODEL: 'test-model' },
      stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = '';
    launcher.stdout.on('data', data => { logs += data; });
    launcher.stderr.on('data', data => { logs += data; });
    const completed = new Promise((resolve, reject) => { launcher.on('error', reject); launcher.on('close', (code, signal) => resolve({code, signal})); });
    t.after(async () => {
      if (launcher.exitCode === null && launcher.signalCode === null) {
        launcher.kill('SIGTERM');
        await Promise.race([completed, pause(1000)]);
        if (launcher.exitCode === null && launcher.signalCode === null) process.kill(-launcher.pid, 'SIGKILL');
        await completed;
      }
      rmSync(dir, { recursive: true, force: true });
    });
    if (mode === 'cancel') {
      for (let i = 0; i < 100 && !existsSync(resolve(dir, 'child.pid')); i++) await pause(20);
      assert.ok(existsSync(resolve(dir, 'child.pid')), logs);
      launcher.kill('SIGTERM');
    }
    const result = await completed;
    assert.equal(result.code, { success: 0, failure: 7, timeout: 124, cancel: 143 }[mode], logs);
    const args = JSON.parse(readFileSync(resolve(dir, 'args.json'), 'utf8'));
    assert.ok(args.includes('--additional-mcp-config'));
    assert.ok(args.includes(`@${dir}/mcp.json`));
    assert.ok(args.includes('test-model'));
    assert.equal(args[args.indexOf('--log-level') + 1], 'none');
    assert.equal(args[args.indexOf('--stream') + 1], 'on');
    assert.equal(args[args.indexOf('--add-dir') + 1], `${dir}/home/skills`);
    assert.ok(!args.includes('-s') && !args.includes('--silent'));
    assert.ok(!args.includes('--log-dir'));
    assert.ok(!args.includes('--share'));
    assert.match(logs, /Prompt enviado ao Copilot:\n\nInvestigue o incidente\./);
    assert.match(logs, /Vou consultar o incidente e ler o código/);
    assert.match(logs, /✓ Consultar incidente \(sentry-get_sentry_resource\)/);
    assert.doesNotMatch(logs, /\[DEBUG\]|Diagnóstico do Copilot/);
    const marker = logs.match(/::stop-commands::([a-f0-9-]+)/)?.[1];
    assert.ok(marker);
    assert.ok(logs.indexOf('::stop-commands::') < logs.indexOf('Investigue o incidente.'));
    assert.ok(logs.indexOf(`::${marker}::`) > logs.indexOf('::warning::'));
    if (mode === 'success') assert.match(logs, /AI Credits 6.58/);
    if (mode === 'failure') assert.match(logs, /Falha simulada do Copilot/);
    const child = Number(readFileSync(resolve(dir, 'child.pid'), 'utf8'));
    await pause(50);
    const stat = `/proc/${child}/stat`;
    assert.ok(!existsSync(stat) || readFileSync(stat, 'utf8').split(' ')[2] === 'Z', 'Processo iniciado pelo CLI sobreviveu.');
    const response = readFileSync(resolve(dir, 'response.json'), 'utf8');
    assert.ok(!response.includes('[DEBUG]'), 'Diagnóstico contaminou o JSON da resposta.');
    assert.doesNotMatch(response, /AI Credits|Prompt enviado|Investigue o incidente/);
    if (mode === 'success') assert.equal(responseJson(response).outcome, 'repair');
  });
}
