// --offline verifica SDK/runtime sem autenticação, rede ou inferência.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { CopilotClient } from '@github/copilot-sdk';
import { redact, stopClient } from './agent.mjs';

const offline = process.argv.includes('--offline');
const token = offline ? undefined : process.env.GITHUB_TOKEN;
if (!offline && !token) throw new Error('GITHUB_TOKEN ausente; execute pelo workflow copilot-smoke.yml.');
const home = mkdtempSync(resolve(tmpdir(), 'patchwork-copilot-smoke-'));
const env = { PATH: process.env.PATH, HOME: home, USERPROFILE: home, TEMP: home, TMP: home,
  ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), COPILOT_GITHUB_TELEMETRY_DISABLED: 'true' };
const client = new CopilotClient({ gitHubToken: token, useLoggedInUser: false, env, workingDirectory: home, logLevel: 'error' });
let session, timer, fail, finished = false;
const checkpoint = () => { if (finished) throw new Error('Smoke encerrado.'); };
const cancelled = new Promise((_, reject) => { fail = reject; });
const abort = () => fail(new Error('Smoke cancelado.'));
process.once('SIGTERM', abort); process.once('SIGINT', abort);
timer = setTimeout(() => fail(new Error('Smoke excedeu 90 segundos.')), 90000);
try {
  await Promise.race([(async () => {
    await client.start();
    checkpoint();
    const status = await client.getStatus();
    checkpoint();
    if (status.version !== '1.0.103') throw new Error('Runtime diverge da versão fixada pelo SDK.');
    if (offline) { console.log(JSON.stringify({ offline: true, sdk: '1.0.26', runtime: status.version })); return; }
    if (!(await client.getAuthStatus()).isAuthenticated) throw new Error('Token recusado pelo Copilot.');
    checkpoint();
    session = await client.createSession({ gitHubToken: token, enableManagedSettings: true,
      enforceManagedModelDefaults: true, enableConfigDiscovery: false, enableFileHooks: false,
      enableSkills: false, availableTools: [], disabledMcpServers: ['github'],
      ...(process.env.COPILOT_MODEL ? { model: process.env.COPILOT_MODEL } : {}),
      onPermissionRequest: () => ({ kind: 'reject' }) });
    if (finished) { await session.disconnect(); checkpoint(); }
    const response = await session.sendAndWait({ prompt: 'Responda apenas OK. Não use ferramentas.' }, 60000);
    if (!response?.data?.content?.trim()) throw new Error('Resposta vazia.');
    const model = (await session.rpc.model.getCurrent()).modelId;
    if (!model) throw new Error('Modelo não informado.');
    console.log(JSON.stringify({ authenticated: true, runtime: status.version, model,
      repository: process.env.GITHUB_REPOSITORY, responseReceived: true }));
  })(), cancelled]);
} catch (error) {
  console.error(redact(error.message, [token])); process.exitCode = 1;
} finally {
  finished = true;
  clearTimeout(timer); process.removeListener('SIGTERM', abort); process.removeListener('SIGINT', abort);
  await stopClient(client, session);
  rmSync(home, { recursive: true, force: true });
}
