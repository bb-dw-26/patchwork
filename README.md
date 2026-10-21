# Patchwork

Incidentes viram propostas de correção verificadas. Um workflow compartilhado atende `bbdw-checkout`, `bbdw-users`, `bbdw-catalog` e `bbdw-storefront`, com regras próprias para cada aplicação.

## Uso

O consumidor mantém `.github/patchwork.json`, `.agents/skills/service-regression/SKILL.md` e uma chamada curta em `.github/workflows/repair.yml`. Veja [o exemplo](examples/consumer.yml).

```yaml
jobs:
  patchwork:
    permissions:
      contents: write
      issues: read
      pull-requests: write
    uses: bbdw-gh-action/patchwork/.github/workflows/patchwork.yml@v2
    with:
      issue_number: ${{ format('{0}', github.event.issue.number || inputs.issue_number) }}
      config_path: .github/patchwork.json
      node_version: '24'
      install_command: npm ci
      allow_bot_users: sentry[bot]
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

Em produção, fixe o SHA completo da versão revisada. O próprio workflow usa `job.workflow_sha` e `job.workflow_repository` para obter o motor na mesma revisão. Esses contextos exigem GitHub.com e não estão disponíveis no GitHub Enterprise Server. O adaptador e o protocolo da v1 continuam disponíveis nas tags antigas; a v2 usa configuração declarativa e motor central.

O exemplo completo restringe gatilhos ao App oficial Sentry ou disparo manual autorizado. Mantenha esse filtro. O motor confere novamente autor, iniciador, labels, organização, projeto, release e duplicidade. O secret Sentry precisa ler organização, projeto e eventos. Configure os secrets no consumidor ou disponibilize secrets de organização aos consumidores. Não envie valores de credenciais em issues ou PRs.

## Configuração por aplicação

```json
{
  "repository": "bbdw-gh-action/bbdw-users",
  "baseBranch": "main",
  "runtime": "node",
  "sentry": { "org": "bbdw-workshop-jj", "project": "bbdw-users", "projectId": "4512294855901184" },
  "sourceFiles": ["src/app.ts"],
  "testPattern": "^test/patchwork-[a-z0-9-]+\\.test\\.ts$"
}
```

A release do evento deve ser o SHA completo do HEAD da branch autorizada e a tag `service` deve corresponder ao projeto. `scenario` é opcional; no checkout vale `CHK-001`, com base `demo/chk-001`. Nos demais, a base é `main`. Eventos sintéticos de SDK, releases abreviadas ou incidentes de revisões antigas são recusados. Esta integração não cria defeitos de demonstração.

| Runtime | Instalação no chamador | Validação |
| --- | --- | --- |
| `node` | `npm ci` | Build, testes novos compilados via node:test antes, `npm run check` depois |
| `go` | `go_version_file: go.mod`, `install_command: go mod download` | Compilação dos testes, funções `TestPatchwork*` antes; gofmt, vet, testes com race e build depois |
| `playwright` | `npm ci` e `npx playwright install --with-deps chromium` | Tipos e descoberta, testes novos antes, `npm run check` depois |

O código de produção autorizado deve existir; apenas modificações nesses arquivos e adições de testes são publicáveis. Testes existentes, dependências, telemetria, configuração e fixtures permanecem fora do patch. A validação exige falha funcional anterior; erro de compilação ou falha global de infraestrutura Playwright não contam. O publicador compara a árvore do patch com a árvore aprovada pelo validador.

Entradas adicionais: `config_path` (padrão `.github/patchwork.json`), `node_version` (24), `go_version_file` (vazio), `install_command` (`npm ci`) e `allow_bot_users` (vazio). O comando de instalação deve vir do workflow confiável, nunca do corpo de uma issue. Há uma chamada por execução; os artifacts têm nomes fixos, portanto não use matrix ou múltiplas chamadas no mesmo run.

## Skills e MCP

Cada aplicação versiona suas skills em `.agents/skills/`. O Patchwork acrescenta [patchwork-investigation](skills/patchwork-investigation/SKILL.md), que orienta a investigação e o uso das evidências. `service-regression` descreve os contratos e testes da aplicação.

Antes do agente, `scripts/context.mjs` copia as skills, AGENTS.md e configuração da revisão confiável para o checkout descartável. Isso também funciona com branches antigas que ainda não possuem as skills. O prompt manda explicitamente ler e usar as duas skills antes de editar. O relatório deve declarar as skills efetivamente lidas.

O MCP oficial `@sentry/mcp-server` é instalado pelo lockfile e iniciado via stdio. A sessão recebe `--organization-slug`, `--project-slug` e `--skills=inspect`. O Codex permite somente `get_sentry_resource`, `search_issues` e `search_events`, sem gateways de execução ou ferramentas de mutação. As buscas usam sintaxe Sentry explícita; o servidor não recebe uma chave de modelo para tradução de linguagem natural.

O `config.toml` fica em um diretório temporário passado como `codex-home`. Ele contém somente o nome da variável `SENTRY_ACCESS_TOKEN`, nunca seu valor. Essa variável é fornecida apenas ao passo do agente; a API de preparação usa o mesmo secret em um job separado. `required=true` faz a sessão falhar se o MCP não inicializar. A biblioteca MCP é fixada em versão corrigida por override, exercitada pelos testes de conectividade.

`agent-context.json` registra os nomes das skills e ferramentas disponibilizadas, sem credenciais. Esse artifact comprova configuração, não leitura efetiva. O relatório do agente deve indicar as consultas realmente executadas e qualquer indisponibilidade.

## Execução e publicação

`prepare → propose → validate → publish`, em quatro runners. O motor vem do SHA do workflow reutilizável, a política do SHA do workflow consumidor e a aplicação do SHA do incidente. Agente e validador não recebem escrita no GitHub. O validador não recebe secrets. Somente o publicador recebe escrita e nunca executa a aplicação.

O PR é draft, com base definida na configuração. Sem merge ou deploy automáticos. O `GITHUB_TOKEN` não dispara outro CI de PR; a validação já ocorreu em runner separado. Para nova verificação, dispare o CI da aplicação manualmente.

Os artifacts `incident`, `proposal` e `validation` duram sete dias. Se a publicação falhar depois do push, use **Re-run failed jobs** enquanto os artifacts existirem. O motor confere base, conteúdo e proposta remota, sem force-push ou duplicação de PRs.

## Verificação

```sh
npm ci --ignore-scripts
npx playwright install --with-deps chromium
npm test
python -m pip install -r tests/requirements.txt
python -m unittest discover -s tests -v
```

O CI Linux executa regressões reais em fixtures Node, Go e Playwright, incluindo o teste que já passa antes (recusado), além de autorização, escopo, skills, isolamento e retomada de publicação. No Windows o teste Go com race é omitido porque requer compilador C. As fixtures encerram seus processos.

Para verificar apenas MCP, forneça `SENTRY_ACCESS_TOKEN` no ambiente e execute `node scripts/check-mcp.mjs bbdw-checkout` (ou outro consumidor). O script inicializa o servidor oficial, confere as ferramentas, consulta o projeto e lê um incidente quando disponível; fecha o transporte ao terminar. Não invoca modelos nem altera Sentry.

O actionlint 1.7.12 ainda desconhece `job.workflow_sha` e `job.workflow_repository`; o CI ignora somente esses dois diagnósticos, e os testes verificam suas posições e valores. Os demais erros de YAML/expressões continuam bloqueando a publicação.

## Referências

- [Identidade de workflows reutilizáveis](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#example-usage-of-job-context-workflow-identity)
- [Descoberta de skills](https://learn.chatgpt.com/docs/build-skills)
- [Configuração MCP do agente](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Servidor oficial Sentry e transporte stdio](https://github.com/getsentry/toolkit#stdio-vs-remote)
