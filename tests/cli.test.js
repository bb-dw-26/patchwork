import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parse } from 'yaml';

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
const logs = args[args.indexOf('--log-dir') + 1];
mkdirSync(logs, { recursive: true });
writeFileSync(logs + '/process-fixture.log', '[DEBUG] Diagnóstico simulado do CLI.');
const child = spawn('sleep', ['60'], { stdio: 'ignore' }); child.unref();
writeFileSync(dir + '/child.pid', String(child.pid));
if (process.env.FIXTURE_MODE === 'success') {
  console.log(JSON.stringify({outcome:'repair', summary:'Correção simulada.'}));
} else if (process.env.FIXTURE_MODE === 'failure') {
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
    assert.equal(args[args.indexOf('--log-level') + 1], 'debug');
    assert.equal(args[args.indexOf('--log-dir') + 1], `${dir}/logs`);
    assert.ok(!args.includes('--share'));
    assert.match(logs, /::group::Diagnóstico do Copilot \(debug\)/);
    assert.ok(logs.includes('[DEBUG] Diagnóstico simulado do CLI.'));
    assert.match(logs, /::stop-commands::[a-f0-9-]+/);
    assert.ok(logs.includes('::endgroup::'));
    const child = Number(readFileSync(resolve(dir, 'child.pid'), 'utf8'));
    await pause(50);
    const stat = `/proc/${child}/stat`;
    assert.ok(!existsSync(stat) || readFileSync(stat, 'utf8').split(' ')[2] === 'Z', 'Processo iniciado pelo CLI sobreviveu.');
    const response = readFileSync(resolve(dir, 'response.json'), 'utf8');
    assert.ok(!response.includes('[DEBUG]'), 'Diagnóstico contaminou o JSON da resposta.');
    if (mode === 'success') assert.equal(JSON.parse(response).outcome, 'repair');
  });
}
