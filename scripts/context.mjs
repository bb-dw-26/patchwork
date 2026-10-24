import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig } from './engine.mjs';

export const sentryTools = ['get_sentry_resource', 'search_issues', 'search_events'];
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function verifyTree(path) {
  if (lstatSync(path).isSymbolicLink()) throw new Error('Skills não podem conter links simbólicos.');
  if (lstatSync(path).isDirectory()) for (const child of readdirSync(path)) verifyTree(resolve(path, child));
}

export function prepareContext({ config, automation = 'automation', app = 'app', home, mcpRoot = packageRoot }) {
  const trustedSkills = resolve(automation, '.agents/skills');
  verifyTree(trustedSkills);
  if (!existsSync(resolve(trustedSkills, 'service-regression/SKILL.md'))) throw new Error('Skill service-regression ausente.');
  const appRoot = realpathSync(app);
  const agents = resolve(appRoot, '.agents');
  if (existsSync(agents) && lstatSync(agents).isSymbolicLink()) throw new Error('.agents fora do checkout.');
  mkdirSync(agents, { recursive: true });
  const destination = resolve(agents, 'skills');
  // A única remoção é a pasta de skills da cópia descartável da aplicação.
  if (!destination.startsWith(appRoot + sep)) throw new Error('Destino fora do app.');
  if (existsSync(destination)) {
    if (lstatSync(destination).isSymbolicLink()) throw new Error('Destino de skills é symlink.');
    rmSync(destination, { recursive: true });
  }
  cpSync(trustedSkills, destination, { recursive: true });
  cpSync(resolve(packageRoot, 'skills/patchwork-investigation'), resolve(destination, 'patchwork-investigation'), { recursive: true });
  cpSync(resolve(automation, 'AGENTS.md'), resolve(appRoot, 'AGENTS.md'));
  const githubDir = resolve(appRoot, '.github');
  if (existsSync(githubDir) && lstatSync(githubDir).isSymbolicLink()) throw new Error('.github fora do checkout.');
  mkdirSync(githubDir, { recursive: true });
  const configFile = resolve(githubDir, 'patchwork.json');
  if (existsSync(configFile) && lstatSync(configFile).isSymbolicLink()) throw new Error('Configuração da aplicação é symlink.');
  writeFileSync(configFile, JSON.stringify(config, null, 2));
  const names = readdirSync(destination).filter(name => existsSync(resolve(destination, name, 'SKILL.md')));
  mkdirSync(home, { recursive: true });
  const server = resolve(mcpRoot, 'node_modules/@sentry/mcp-server/dist/index.js');
  if (!existsSync(server)) throw new Error('Instale as dependências do Patchwork antes de configurar o MCP.');
  // Persistir apenas referências. O executor injeta o secret diretamente no MCP.
  const context = {
    app: appRoot,
    skillDirectories: [destination],
    mcp: { command: process.execPath, args: [server, '--organization-slug', config.sentry.org, '--project-slug', config.sentry.project, '--skills=inspect', '--sentry-dsn='], tools: sentryTools, timeout: 60000 },
  };
  writeFileSync(resolve(home, 'context.json'), JSON.stringify(context, null, 2));
  return { skills: names, server: 'sentry', project: config.sentry.project, tools: sentryTools };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const config = loadConfig(process.env.PATCHWORK_CONFIG ?? '.github/patchwork.json');
  const result = prepareContext({ config, home: resolve(process.env.RUNNER_TEMP, 'patchwork-copilot') });
  writeFileSync(resolve(process.env.RUNNER_TEMP, 'agent-context.json'), JSON.stringify(result, null, 2));
  console.log(`Skills disponíveis: ${result.skills.join(', ')}. MCP sentry restrito a ${result.project}.`);
}
