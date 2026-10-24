import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { runAgent, permissionHandler, redact, inside } from '../scripts/agent.mjs';

function fixture(t, behavior = {}) {
  const root = mkdtempSync(resolve(tmpdir(), 'patchwork-agent-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const app = resolve(root, 'app'); mkdirSync(app);
  const state = { calls: [] };
  class Client {
    constructor(options) { state.options = options; }
    async start() { state.calls.push('start'); if (behavior.startError) throw new Error(behavior.startError); }
    async getStatus() { return { version: behavior.runtime ?? '1.0.103' }; }
    async getAuthStatus() { return { isAuthenticated: behavior.auth !== false }; }
    async createSession(options) {
      state.session = options;
      return {
        rpc: {
          mcp: {
            startServer: async () => { state.calls.push('mcp'); if (behavior.mcpError) throw new Error('MCP ausente'); },
            listConfigured: async () => ({ servers: [{ name: 'sentry', live: { status: behavior.mcpStatus ?? 'connected' } }] }),
          },
          model: { getCurrent: async () => ({ modelId: 'test-model' }) },
        },
        sendAndWait: async () => {
          state.calls.push('send');
          if (behavior.managed) options.onPermissionRequest({ kind: 'shell', managedApprovalRequired: true });
          if (behavior.sessionError) options.onEvent({ type: 'session.error', data: {} });
          if (behavior.sandboxWarning) options.onEvent({ type: 'session.warning', data: { warningType: 'sandbox' } });
          if (behavior.hang) return new Promise(() => {});
          options.onEvent({ type: 'skill.invoked', data: { name: 'service-regression' } });
          options.onEvent({ type: 'tool.execution_start', data: { toolName: 'sentry-search_issues' } });
          return { data: { content: behavior.empty ? '' : 'Relatório token-test sentry-secret' } };
        },
        disconnect: async () => { state.calls.push('disconnect'); if (behavior.disconnectError) throw new Error('disconnect'); },
      };
    }
    async stop() { state.calls.push('stop'); return behavior.stopError ? [new Error('stop')] : []; }
    async forceStop() { state.calls.push('forceStop'); }
  }
  const options = { Client, context: { app, skillDirectories: [resolve(app,'.agents/skills')],
    mcp: { command: 'node', args: [resolve(root,'node_modules/@sentry/mcp-server/dist/index.js')], tools: ['search_issues'] } },
    token: 'token-test', sentryToken: 'sentry-secret', prompt: 'Investigue', home: root,
    timeoutMs: 1000, onMetadata: value => { state.metadata = value; } };
  return { state, options, app, root };
}

test('token explícito, ambiente sem secrets, MCP restrito, relatório redigido e encerramento', async t => {
  const { state, options } = fixture(t);
  const result = await runAgent(options);
  assert.equal(result, 'Relatório [REDACTED] [REDACTED]');
  assert.equal(state.options.useLoggedInUser, false);
  assert.equal(state.options.gitHubToken, 'token-test');
  assert.equal(state.options.env.GITHUB_TOKEN, undefined);
  assert.equal(state.options.env.SENTRY_ACCESS_TOKEN, undefined);
  assert.equal(state.session.gitHubToken, 'token-test');
  assert.equal(state.session.enableManagedSettings, true);
  assert.equal(state.session.sandboxConfig.enabled, true);
  assert.equal(state.session.sandboxConfig.allowBypass, false);
  assert.equal(state.session.enableFileHooks, false);
  assert.equal(state.session.enableConfigDiscovery, false);
  assert.ok(!state.session.availableTools.includes('builtin:*'));
  assert.equal(state.session.model, undefined);
  assert.equal(state.metadata.model, 'test-model');
  assert.deepEqual(state.metadata.skillsUsed, ['service-regression']);
  assert.deepEqual(state.calls, ['start', 'mcp', 'send', 'disconnect', 'stop']);
  assert.ok(!JSON.stringify(state.metadata).includes('sentry-secret'));
});

test('modelo solicitado é preservado e nenhum fallback pessoal é usado', async t => {
  const { state, options } = fixture(t);
  await runAgent({ ...options, model: 'chosen-model' });
  assert.equal(state.session.model, 'chosen-model');
});

test('credenciais ausentes não iniciam runtime', async t => {
  const { state, options } = fixture(t);
  await assert.rejects(runAgent({ ...options, token: '' }), /GITHUB_TOKEN ausente/);
  await assert.rejects(runAgent({ ...options, sentryToken: '' }), /SENTRY_ACCESS_TOKEN ausente/);
  assert.deepEqual(state.calls, []);
});

for (const [name, behavior, pattern] of [
  ['autenticação negada', { auth: false }, /recusou/],
  ['runtime incompatível', { runtime: 'old' }, /Runtime diverge/],
  ['sandbox indisponível', { sandboxWarning: true }, /limitação do sandbox/],
  ['startup falha sem vazar token', { startError: 'falhou token-test' }, /falhou \[REDACTED\]/],
  ['MCP indisponível', { mcpStatus: 'failed' }, /MCP Sentry/],
  ['startup MCP falha', { mcpError: true }, /MCP ausente/],
  ['modelo falha', { sessionError: true }, /sessão Copilot falhou/],
  ['política exige humano', { managed: true }, /aprovação humana/],
  ['relatório vazio', { empty: true }, /sem relatório/],
  ['timeout', { hang: true }, /Tempo limite/],
]) test(name, async t => {
  const { state, options } = fixture(t, behavior);
  await assert.rejects(runAgent({ ...options, timeoutMs: 30 }), pattern);
  assert.ok(state.calls.includes('stop'));
  if (behavior.auth === false || behavior.mcpStatus || behavior.mcpError) assert.ok(!state.calls.includes('send'));
});

test('cancelamento e falhas de encerramento forçam término', async t => {
  const { state, options } = fixture(t, { hang: true, disconnectError: true });
  const controller = new AbortController();
  const result = runAgent({ ...options, signal: controller.signal });
  const timer = setTimeout(() => controller.abort(), 20);
  try { await assert.rejects(result, /cancelada/); } finally { clearTimeout(timer); }
  assert.ok(state.calls.includes('forceStop'));
});

test('erro retornado por stop usa forceStop', async t => {
  const { state, options } = fixture(t, { stopError: true });
  await runAgent(options);
  assert.ok(state.calls.includes('forceStop'));
});

test('permissões recusam escapes, bypass, tools desconhecidas e exigência humana', t => {
  const { app, root } = fixture(t);
  let failed = false;
  const permission = permissionHandler(app, () => { failed = true; });
  assert.equal(permission({ kind: 'write', fileName: resolve(app, 'test/new.ts'), fileEdits: [{after:{path:resolve(app,'test/new.ts')}}] }).kind, 'approve-once');
  assert.equal(permission({ kind: 'write', fileName: resolve(app, 'test/new.ts'), fileEdits: [{after:{path:resolve(root,'outside')}}] }).kind, 'reject');
  assert.equal(permission({ kind: 'read', path: '../outside' }).kind, 'reject');
  assert.equal(permission({ kind: 'shell', requestSandboxBypass: true }).kind, 'reject');
  assert.equal(permission({ kind: 'custom-tool' }).kind, 'reject');
  assert.equal(permission({ kind: 'mcp', serverName: 'sentry', toolName: 'delete_issue' }).kind, 'reject');
  assert.equal(permission({ kind: 'mcp', serverName: 'sentry', toolName: 'sentry-search_issues' }).kind, 'approve-once');
  assert.equal(permission({ kind: 'shell', managedApprovalRequired: true }).kind, 'user-not-available');
  assert.equal(failed, true);
  const outside = resolve(root, 'outside'); mkdirSync(outside);
  symlinkSync(outside, resolve(app, 'escape'), 'junction');
  assert.equal(inside(app, 'escape/new.ts'), false);
  assert.equal(redact('github_pat_abc sntrys_xyz'), '[REDACTED] [REDACTED]');
});
