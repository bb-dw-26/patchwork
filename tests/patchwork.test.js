import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { changedFiles, clean, findPr, interpretResponse, loadConfig, main, prepareFiles, publishHandoff, publishRepair, readContext } from '../scripts/patchwork.js';

const config = { repository: 'demo/source', baseBranch: 'main', sourceFiles: ['app.js'], testPattern: '^test-[a-z]+\\.js$',
  sentry: { org: 'demo', project: 'source' }, handoff: { targets: [{ repository: 'demo/target' }], sources: [] } };
const context = { config, number: '42', title: 'Falha ao finalizar', url: 'https://github.com/demo/source/issues/42',
  sentry: config.sentry, sentryUrl: 'https://demo.sentry.io/issues/123/', incoming: false };
const repair = { outcome: 'repair', summary: 'Causa encontrada e correção aplicada.' };
const handoff = { outcome: 'handoff', summary: 'A interface envia duas requisições; investigar o estado do formulário.', destination: 'demo/target' };
const original = { number: 42, title: context.title, state: 'open', body: context.sentryUrl,
  user: { id: 39604003, login: 'sentry[bot]', type: 'Bot' }, labels: [{ name: 'sentry' }, { name: 'agent:repair' }] };
const env = { GITHUB_REPOSITORY: config.repository, ISSUE_NUMBER: '42', GITHUB_EVENT_NAME: 'issues', GITHUB_ACTOR_ID: '39604003' };

function temp(t) {
  const dir = mkdtempSync(resolve(tmpdir(), 'patchwork-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('origem Sentry e disparo manual autorizado; sem conferir SHA da release', () => {
  const result = readContext(config, env, () => original);
  assert.equal(result.sentryUrl, context.sentryUrl);
  assert.equal(result.incoming, false);
  const manual = { ...env, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: 'operator' };
  const api = args => args[1].endsWith('/permission') ? { permission: 'write' } : original;
  assert.equal(readContext(config, manual, api).number, '42');
  assert.throws(() => readContext(config, manual, args => args[1].endsWith('/permission') ? { permission: 'read' } : original), /manual não autorizado/);
  assert.throws(() => readContext(config, { ...env, GITHUB_ACTOR_ID: '999' }, () => original), /Disparo não autorizado/);
  assert.throws(() => readContext(config, env, () => ({ ...original, user: { id: 1, type: 'User' } })), /Origem/);
});

test('encaminhamento aceita apenas App e origem permitidos; formato antigo não é migrado', () => {
  const receiver = { ...config, repository: 'demo/target', handoff: { targets: [], sources: [{ repository: 'demo/source', sentry: config.sentry }] } };
  const issue = { ...original, number: 70, body: '<!-- patchwork:handoff:demo/source#42 -->\nHipótese.',
    user: { id: 99, type: 'Bot' }, performed_via_github_app: { id: 88 }, labels: [{ name: 'agent:repair' }, { name: 'agent:handoff' }] };
  const receiverEnv = { ...env, GITHUB_REPOSITORY: receiver.repository, ISSUE_NUMBER: '70', GITHUB_ACTOR_ID: '99', PATCHWORK_APP_ID: '88', PATCHWORK_BOT_ID: '99' };
  const runGh = args => args[1].endsWith('/70') ? issue : original;
  const received = readContext(receiver, receiverEnv, runGh);
  assert.equal(received.incoming, true);
  assert.equal(received.sourceUrl, context.url);
  assert.equal(received.sentry.project, 'source');
  assert.throws(() => interpretResponse(JSON.stringify(handoff), received, []), /Segundo/);
  assert.throws(() => readContext(receiver, { ...receiverEnv, PATCHWORK_APP_ID: '87' }, runGh), /Origem/);
  assert.throws(() => readContext(receiver, receiverEnv, () => ({ ...issue, body: '<!-- patchwork-handoff:v1 antigo -->' })), /antigo/);
});

test('resposta pequena diferencia correção, encaminhamento e ausência de alterações', () => {
  assert.equal(interpretResponse(JSON.stringify(repair), context, ['app.js']).outcome, 'repair');
  assert.equal(interpretResponse(`Execução direcionada apenas do arquivo de teste de endereços.\n\n${JSON.stringify(repair)}\n`, context, ['app.js']).outcome, 'repair');
  assert.equal(interpretResponse(`Vou consultar o incidente.\n\n✓ Consultar Sentry (sentry-get_sentry_resource)\n  └ Consulta concluída.\n\n${JSON.stringify(repair)}\n\n`, context, ['app.js']).outcome, 'repair');
  assert.equal(interpretResponse(`Consultando Sentry.\n\n\`\`\`json\n${JSON.stringify(repair, null, 2)}\n\`\`\``, context, ['app.js']).outcome, 'repair');
  assert.throws(() => interpretResponse(`${JSON.stringify(repair)}\nresposta interrompida`, context, ['app.js']), /inválida/);
  assert.equal(interpretResponse(JSON.stringify(repair), context, []).outcome, 'noop');
  assert.equal(interpretResponse(JSON.stringify(handoff), context, []).destination, 'demo/target');
  assert.throws(() => interpretResponse('não é JSON', context, []), /inválida/);
  assert.throws(() => interpretResponse('{}', context, []), /incompleta/);
  assert.throws(() => interpretResponse(JSON.stringify({ ...handoff, destination: 'other/repo' }), context, []), /Destino/);
  assert.throws(() => interpretResponse(JSON.stringify(handoff), context, ['app.js']), /alterações locais/);
  assert.throws(() => interpretResponse(JSON.stringify({ ...repair, outcome: 'noop' }), context, ['app.js']), /contém alterações/);
});

function repository(t) {
  const dir = temp(t), app = resolve(dir, 'app'), remote = resolve(dir, 'remote.git');
  mkdirSync(app);
  const git = (args, cwd = app) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
  git(['init', '--bare', remote], dir); git(['init', '-b', 'main']);
  git(['config', 'user.name', 'Fixture']); git(['config', 'user.email', 'fixture@example.invalid']);
  writeFileSync(resolve(app, 'app.js'), 'export const answer = 1;\n');
  writeFileSync(resolve(app, '.gitignore'), 'node_modules/\n');
  git(['add', '.']); git(['commit', '-m', 'fixture']); git(['remote', 'add', 'origin', remote]); git(['push', '-u', 'origin', 'main']);
  return { app, git };
}

test('limite de arquivos inclui alterações staged e untracked e rejeita configuração e remoção', t => {
  const { app, git } = repository(t);
  writeFileSync(resolve(app, 'app.js'), 'export const answer = 2;\n');
  writeFileSync(resolve(app, 'test-answer.js'), '// regressão\n');
  git(['add', 'app.js']);
  assert.deepEqual(changedFiles(config, app, git).sort(), ['app.js', 'test-answer.js']);
  mkdirSync(resolve(app, '.github')); writeFileSync(resolve(app, '.github/workflow.yml'), 'changed');
  assert.throws(() => changedFiles(config, app, git), /fora do escopo/);
  rmSync(resolve(app, '.github'), { recursive: true }); rmSync(resolve(app, 'app.js'));
  assert.throws(() => changedFiles(config, app, git), /remoção/);
});

test('contexto do CLI usa MCP de leitura e skills sem alterar o checkout ou gravar secrets', async t => {
  const dir = temp(t);
  const work = prepareFiles(context, { temp: dir });
  const mcp = JSON.parse(readFileSync(resolve(work, 'mcp.json'), 'utf8')).mcpServers.sentry;
  assert.deepEqual(mcp.tools, ['get_sentry_resource', 'search_issues', 'search_events']);
  assert.deepEqual(mcp.env, { SENTRY_ACCESS_TOKEN: '${SENTRY_ACCESS_TOKEN}' });
  assert.ok(mcp.args.includes('source'));
  assert.ok(existsSync(resolve(work, 'home/skills/patchwork-handoff/SKILL.md')));
  const prompt = readFileSync(resolve(work, 'prompt.md'), 'utf8');
  assert.match(prompt, /Não execute a suíte completa/);
  assert.match(prompt, /sem grep, tail|Encadeie build e teste com &&/);
  assert.match(prompt, /verificação do workflow será registrada separadamente/);
  for (const skill of ['patchwork-investigation', 'patchwork-sentry', 'patchwork-handoff']) {
    assert.ok(prompt.includes(resolve(work, `home/skills/${skill}/SKILL.md`)));
  }
  assert.doesNotMatch(prompt, /~\/\.copilot/);
  const smoke = prepareFiles(context, { temp: dir, smoke: true });
  assert.ok(readFileSync(resolve(smoke, 'prompt.md'), 'utf8').includes(resolve(smoke, 'home/skills/patchwork-sentry/SKILL.md')));
  await main('cleanup', { RUNNER_TEMP: dir, PATCHWORK_DIR: smoke });
  await main('cleanup', { RUNNER_TEMP: dir, PATCHWORK_DIR: work });
  assert.ok(!existsSync(work));
  await assert.rejects(main('cleanup', { RUNNER_TEMP: dir, PATCHWORK_DIR: resolve(dir, '..') }), /inesperado/);
  mkdirSync(resolve(dir, 'app')); writeFileSync(resolve(dir, 'app/config.json'), JSON.stringify(config));
  assert.equal(loadConfig('config.json', resolve(dir, 'app')).repository, config.repository);
});

test('teste reprovado impede qualquer publicação e teste aprovado abre PR draft sem duplicar', t => {
  const { app, git } = repository(t);
  writeFileSync(resolve(app, 'app.js'), 'export const answer = 2;\n');
  let pr, createCalls = 0, comments = [];
  const runGh = (args, body) => {
    if (args[0] === 'pr') return pr ? [{ url: pr.html_url }] : [];
    if (args[1].startsWith('users/')) return { id: 7, login: 'publisher[bot]' };
    if (args.includes('--paginate')) return [comments];
    if (args[1].endsWith('/pulls')) { createCalls++; pr = { ...body, html_url: 'https://github.com/demo/source/pull/8' }; return pr; }
    if (args[1].endsWith('/comments')) { comments.push({ ...body, user: { login: 'publisher[bot]' } }); return {}; }
    throw new Error(args.join(' '));
  };
  const check = code => spawnSync(process.execPath, ['-e', `process.exit(${code})`]).status === 0 ? 'success' : 'failure';
  const options = { runGh, runGit: git, files: changedFiles(config, app, git), appSlug: 'publisher', runId: '71' };
  assert.throws(() => publishRepair(context, repair, { ...options, checkStatus: check(1) }), /verificação aprovada/);
  assert.equal(createCalls, 0);
  const url = publishRepair(context, repair, { ...options, checkStatus: check(0) });
  assert.equal(pr.draft, true); assert.equal(pr.base, 'main');
  assert.match(pr.body, /Análise do Copilot:/);
  assert.match(pr.body, /Verificação pelo workflow: aprovada/);
  assert.match(comments[0].body, /Análise do Copilot:[\s\S]*Verificação pelo workflow:/);
  assert.match(pr.body, /Comando: npm run check/);
  assert.equal(publishRepair(context, repair, { ...options, checkStatus: 'success' }), url);
  assert.equal(findPr(context, runGh), url);
  assert.equal(createCalls, 1); assert.equal(comments.length, 1);
});

test('branch já existente sem PR não é sobrescrita nem anunciada como recém validada', () => {
  const calls = [];
  assert.throws(() => publishRepair(context, repair, { checkStatus: 'success', files: ['app.js'],
    runGh: () => [], runGit: args => { calls.push(args); return 'remote branch'; } }), /já existe sem PR/);
  assert.equal(calls.length, 1);
});

test('encaminhamento cria issue com origem e deduplica inclusive issue fechada', () => {
  const issues = [], comments = [];
  const runGh = (args, body) => {
    const path = args.find(arg => arg.startsWith('repos/'));
    if (args.includes('--paginate')) return [path.includes('/comments') ? comments : path.includes('/labels') ? [] : issues];
    if (path.endsWith('/labels')) return {};
    if (path.endsWith('/comments')) { comments.push({ ...body, user: { login: 'forwarder[bot]' } }); return {}; }
    if (path.endsWith('/issues')) {
      const issue = { ...body, number: 70, html_url: 'https://github.com/demo/target/issues/70',
        state: 'closed', user: { id: 99, type: 'Bot' }, performed_via_github_app: { id: 88 } };
      issues.push(issue); return issue;
    }
    throw new Error(path);
  };
  const options = { runGh, appSlug: 'forwarder', appId: '88', botId: '99', runId: '71' };
  const url = publishHandoff(context, handoff, options);
  assert.equal(publishHandoff(context, handoff, options), url);
  assert.equal(issues.length, 1); assert.equal(comments.length, 1);
  assert.match(issues[0].body, /patchwork:handoff:demo\/source#42/);
  assert.ok(issues[0].body.includes(context.sentryUrl));
  assert.doesNotMatch(issues[0].body, /targetRevision|sourceRevision|signature/);
  assert.equal(clean('github_pat_secret\n@person'), '[REDACTED] @\u200bperson');
});
