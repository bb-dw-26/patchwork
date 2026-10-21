// Verificação explícita de conectividade. Sem chamadas a modelos ou mutações Sentry.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolve } from 'node:path';
import { sentryTools } from './context.mjs';
const project = process.argv[2];
if (!/^bbdw-(checkout|users|catalog|storefront)$/.test(project) || !process.env.SENTRY_ACCESS_TOKEN) throw new Error('Informe projeto e SENTRY_ACCESS_TOKEN.');
const client = new Client({ name: 'patchwork-verification', version: '2.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve('node_modules/@sentry/mcp-server/dist/index.js'), '--organization-slug', 'bbdw-workshop-jj', '--project-slug', project, '--skills=inspect', '--sentry-dsn='],
  env: { PATH: process.env.PATH, SENTRY_ACCESS_TOKEN: process.env.SENTRY_ACCESS_TOKEN },
  stderr: 'pipe',
});
transport.stderr?.resume();
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const names = tools.map(tool => tool.name);
  for (const expected of sentryTools) if (!names.includes(expected)) throw new Error(`Ferramenta ausente: ${expected}`);
  // Só buscar incidentes do próprio projeto, com o token fora de arquivos e logs.
  const response = await fetch(`https://sentry.io/api/0/projects/bbdw-workshop-jj/${project}/issues/?limit=1`, {
    headers: { Authorization: `Bearer ${process.env.SENTRY_ACCESS_TOKEN}` }, redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Consulta de projeto retornou HTTP ${response.status}.`);
  const issues = await response.json();
  const search = await client.callTool({ name: 'search_issues', arguments: { query: 'is:unresolved', limit: 1 } });
  if (search.isError) throw new Error('MCP não conseguiu consultar o projeto.');
  let read = false;
  if (issues.length) {
    const result = await client.callTool({ name: 'get_sentry_resource', arguments: { url: `https://bbdw-workshop-jj.sentry.io/issues/${issues[0].id}/` } });
    if (result.isError) throw new Error('MCP não conseguiu ler o incidente do projeto.');
    read = true;
  }
  console.log(JSON.stringify({ project, connected: true, allowedToolsAvailable: sentryTools, issueRead: read }));
} finally {
  await client.close();
  await transport.close();
}
