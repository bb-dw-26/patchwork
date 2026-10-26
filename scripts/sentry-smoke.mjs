import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadConfig } from './engine.mjs';
import { prepareContext } from './context.mjs';

export function verifySentrySmoke(metadata) {
  if (!metadata.mcpConnected) throw new Error('MCP Sentry não conectado.');
  if (!metadata.skillsUsed?.includes('patchwork-sentry')) throw new Error('Agente não invocou a skill patchwork-sentry.');
  if (!metadata.mcpCalls?.some(call => call.tool === 'search_issues' && call.success)) {
    throw new Error('Agente não concluiu uma consulta search_issues pelo MCP.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const temp = process.env.RUNNER_TEMP;
  if (!temp) throw new Error('RUNNER_TEMP ausente.');
  if (process.argv[2] === 'prepare') {
    const config = loadConfig(process.env.PATCHWORK_CONFIG ?? '.github/patchwork.json');
    if (config.repository !== process.env.GITHUB_REPOSITORY) throw new Error('Repositório divergente da configuração.');
    const result = prepareContext({ config, home: resolve(temp, 'patchwork-copilot') });
    writeFileSync(resolve(temp, 'agent-context.json'), JSON.stringify(result, null, 2));
    writeFileSync(resolve(temp, 'prompt.md'), `Esta execução verifica apenas conectividade. Invoque a skill patchwork-sentry usando a ferramenta skill. Use o MCP sentry para executar search_issues com organizationSlug=${config.sentry.org}, projectSlugOrId=${config.sentry.project}, query="is:unresolved", limit=1. Um resultado vazio é válido. Não altere arquivos, não execute testes e não investigue nem corrija incidentes. Responda somente com o nome da skill, ferramenta, projeto e se a consulta foi concluída; não reproduza conteúdo de incidentes. Se falhar, relate a falha sem tentar outras credenciais.`);
  } else if (process.argv[2] === 'verify') {
    const metadata = JSON.parse(readFileSync(resolve(temp, 'execution.json'), 'utf8'));
    verifySentrySmoke(metadata);
    console.log(JSON.stringify({ verified: true, model: metadata.model, mcpConnected: true,
      skillsUsed: metadata.skillsUsed, mcpCalls: metadata.mcpCalls }));
  } else throw new Error('Use prepare ou verify.');
}
