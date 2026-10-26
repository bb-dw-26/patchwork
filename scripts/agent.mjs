import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CopilotClient } from '@github/copilot-sdk';
import { sentryTools } from './context.mjs';

export function redact(text, secrets = []) {
  let result = String(text);
  for (const secret of secrets.filter(Boolean)) result = result.split(secret).join('[REDACTED]');
  return result.replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sntrys_[A-Za-z0-9_]+)\b/g, '[REDACTED]');
}

// Resolve também os pais de arquivos novos para recusar escapes por symlink.
export function inside(root, path) {
  if (typeof path !== 'string' || !path) return false;
  const target = resolve(root, path);
  if (target !== root && !target.startsWith(root + sep)) return false;
  let parent = target;
  while (!existsSync(parent)) parent = dirname(parent);
  const canonical = realpathSync(parent);
  return canonical === root || canonical.startsWith(root + sep);
}

export function permissionHandler(app, fail) {
  return request => {
    if (request.managedApprovalRequired) {
      fail(new Error('A política da organização exige aprovação humana; execução desassistida interrompida.'));
      return { kind: 'user-not-available' };
    }
    if (request.requestSandboxBypass) return { kind: 'reject' };
    let allowed = false;
    if (request.kind === 'read') allowed = inside(app, request.path);
    if (request.kind === 'write') allowed = inside(app, request.fileName) &&
      (request.fileEdits ?? []).every(edit => [edit.before, edit.after].filter(Boolean).every(file => inside(app, file.path)));
    // Shell só é habilitado após a criação da sessão com sandbox obrigatório.
    if (request.kind === 'shell') allowed = true;
    if (request.kind === 'mcp') allowed = request.serverName === 'sentry' &&
      sentryTools.some(name => request.toolName === name || request.toolName === `sentry-${name}`);
    return { kind: allowed ? 'approve-once' : 'reject' };
  };
}

export function sessionOptions(context, { model, token, sentryToken, fail, onEvent }) {
  return {
    ...(model ? { model } : {}),
    workingDirectory: context.app,
    enableConfigDiscovery: false,
    enableFileHooks: false,
    enableManagedSettings: true,
    enforceManagedModelDefaults: true,
    gitHubToken: token,
    enableSkills: true,
    enableSessionStore: false,
    skillDirectories: context.skillDirectories,
    disabledMcpServers: ['github'],
    availableTools: ['builtin:view', 'builtin:grep', 'builtin:glob', 'builtin:bash',
      'builtin:write_bash', 'builtin:read_bash', 'builtin:stop_bash', 'builtin:apply_patch',
      'builtin:str_replace_editor', 'builtin:create', 'builtin:edit', 'builtin:skill',
      ...sentryTools.map(name => `mcp:sentry-${name}`)],
    onPermissionRequest: permissionHandler(context.app, fail),
    onEvent,
    sandboxConfig: {
      enabled: true, allowBypass: false, sandboxMcpServers: true,
      addCurrentWorkingDirectory: true,
      userPolicy: {
        filesystem: { readonlyPaths: [resolve(dirname(context.mcp.args[0]), '../../..'), process.env.GOMODCACHE, process.env.PLAYWRIGHT_BROWSERS_PATH].filter(Boolean) },
        network: { allowOutbound: true, allowLocalNetwork: true, allowedHosts: ['sentry.io', '*.sentry.io', 'localhost', '127.0.0.1', '::1'] },
      },
    },
    infiniteSessions: { enabled: false },
    mcpServers: { sentry: { type: 'local', ...context.mcp, env: { SENTRY_ACCESS_TOKEN: sentryToken } } },
  };
}

export async function runAgent({ context, prompt, token, sentryToken, model = '', home,
  timeoutMs = 15 * 60 * 1000, signal, Client = CopilotClient, onMetadata = () => {} }) {
  if (!token) throw new Error('GITHUB_TOKEN ausente. Conceda copilot-requests: write ao chamador e ao job propose.');
  if (!sentryToken) throw new Error('SENTRY_ACCESS_TOKEN ausente.');
  const env = Object.fromEntries(['PATH', 'SystemRoot', 'GOROOT', 'GOMODCACHE', 'JAVA_HOME', 'PLAYWRIGHT_BROWSERS_PATH']
    .filter(key => process.env[key]).map(key => [key, process.env[key]]));
  Object.assign(env, { PATH: process.env.PATCHWORK_TOOL_PATH ?? env.PATH,
    HOME: home, USERPROFILE: home, TMPDIR: home, TEMP: home, TMP: home,
    COPILOT_GITHUB_TELEMETRY_DISABLED: 'true' });
  const client = new Client({ gitHubToken: token, useLoggedInUser: false,
    workingDirectory: context.app, env, logLevel: 'error' });
  let session, timer, finished = false;
  const checkpoint = () => { if (finished) throw new Error('Execução encerrada.'); };
  let fail;
  const failure = new Promise((_, reject) => { fail = reject; });
  // Register before startup; all RPCs, including MCP startup, share the deadline.
  const abort = () => fail(new Error('Execução cancelada.'));
  signal?.addEventListener('abort', abort, { once: true });
  timer = setTimeout(() => fail(new Error('Tempo limite do Copilot excedido.')), timeoutMs);
  const secrets = [token, sentryToken];
  const metadata = { agent: 'copilot-sdk', sdkVersion: '1.0.26', requestedModel: model || null,
    model: null, modelsUsed: [], mcpConnected: false, toolsUsed: [], mcpCalls: [], skillsUsed: [] };
  const mcpCalls = new Map();
  const onEvent = event => {
    if (event.type === 'session.error') fail(new Error('A sessão Copilot falhou; verifique autenticação, política e modelo.'));
    if (event.type === 'session.warning' && event.data.warningType === 'sandbox') {
      fail(new Error('Runtime sinalizou limitação do sandbox; proposta interrompida.'));
    }
    if (event.type === 'assistant.usage' && typeof event.data.model === 'string' && !metadata.modelsUsed.includes(event.data.model)) metadata.modelsUsed.push(event.data.model);
    if (event.type === 'tool.execution_start') {
      const name = event.data.toolName;
      if (typeof name === 'string' && !metadata.toolsUsed.includes(name)) metadata.toolsUsed.push(name);
      if (event.data.mcpServerName === 'sentry' && sentryTools.includes(event.data.mcpToolName)) {
        mcpCalls.set(event.data.toolCallId, event.data.mcpToolName);
      }
    }
    if (event.type === 'tool.execution_complete' && mcpCalls.has(event.data.toolCallId)) {
      metadata.mcpCalls.push({ tool: mcpCalls.get(event.data.toolCallId), success: event.data.success === true });
      mcpCalls.delete(event.data.toolCallId);
    }
    if (event.type === 'skill.invoked' && typeof event.data.name === 'string') metadata.skillsUsed.push(event.data.name);
  };
  const work = async () => {
    if (signal?.aborted) throw new Error('Execução cancelada.');
    await client.start();
    checkpoint();
    if ((await client.getStatus()).version !== '1.0.103') throw new Error('Runtime diverge da versão fixada pelo SDK.');
    checkpoint();
    const auth = await client.getAuthStatus();
    checkpoint();
    if (!auth.isAuthenticated) throw new Error('Copilot recusou GITHUB_TOKEN. Verifique a política de cobrança da organização.');
    session = await client.createSession(sessionOptions(context, { model, token, sentryToken, fail, onEvent }));
    if (finished) { await session.disconnect(); checkpoint(); }
    await session.rpc.mcp.startServer({ serverName: 'sentry' });
    checkpoint();
    const { servers } = await session.rpc.mcp.listConfigured();
    checkpoint();
    if (!servers.some(server => server.name === 'sentry' && server.enabled && server.live?.status === 'connected')) {
      throw new Error('MCP Sentry obrigatório não conectou.');
    }
    metadata.mcpConnected = true;
    const response = await session.sendAndWait({ prompt }, timeoutMs);
    checkpoint();
    metadata.model = (await session.rpc.model.getCurrent()).modelId ?? null;
    if (!metadata.model) throw new Error('Runtime não informou o modelo utilizado.');
    if (!response?.data?.content?.trim()) throw new Error('Copilot terminou sem relatório.');
    return redact(response.data.content, secrets);
  };
  try {
    return await Promise.race([work(), failure]);
  } catch (error) {
    throw new Error(redact(error.message, secrets));
  } finally {
    finished = true;
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    try { await stopClient(client, session); }
    finally { onMetadata(JSON.parse(redact(JSON.stringify(metadata), secrets))); }
  }
}

export async function stopClient(client, session) {
  let timer;
  try {
    await Promise.race([
      (async () => { if (session) await session.disconnect(); const errors = await client.stop(); if (errors?.length) throw errors[0]; })(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout de encerramento.')), 5000); }),
    ]);
  } catch { await client.forceStop(); }
  finally { clearTimeout(timer); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.env.PATCHWORK_AGENT_DIR;
  if (!directory) throw new Error('Execute pelo launcher run-agent.sh.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once('SIGTERM', abort); process.once('SIGINT', abort);
  try {
    const context = JSON.parse(readFileSync(resolve(directory, 'context.json'), 'utf8'));
    const report = await runAgent({ context, prompt: readFileSync(resolve(directory, 'prompt.md'), 'utf8'),
      token: process.env.GITHUB_TOKEN, sentryToken: process.env.SENTRY_ACCESS_TOKEN,
      model: process.env.COPILOT_MODEL ?? '', home: resolve(directory, 'home'), signal: controller.signal,
      onMetadata: metadata => {
        writeFileSync(resolve(directory, 'execution.json'), JSON.stringify(metadata, null, 2));
        for (const call of metadata.mcpCalls) console.log(`MCP Sentry: ${call.tool}; sucesso=${call.success}`);
      } });
    writeFileSync(resolve(directory, 'report.md'), report);
  } catch (error) {
    console.error(redact(error.message, [process.env.GITHUB_TOKEN, process.env.SENTRY_ACCESS_TOKEN]));
    process.exitCode = 1;
  } finally { process.removeListener('SIGTERM', abort); process.removeListener('SIGINT', abort); }
}
