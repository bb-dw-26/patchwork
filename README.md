# Patchwork v3

Incidentes viram propostas de correção verificadas. Um workflow compartilhado atende `bbdw-checkout`, `bbdw-catalog` e `bbdw-storefront`, com regras próprias para cada aplicação.

## Apresentação BBDW

O [roteiro da apresentação](docs/ROTEIRO.md) reúne a agenda de 50 minutos, os papéis dos aplicativos, a preparação, a avaliação e a contingência. Este repositório centraliza o [material da sessão, cenários e soluções](docs/apresentacao/README.md). Esse diretório não integra as skills do agente.

## Uso

O consumidor mantém `.github/patchwork.json`, `.agents/skills/service-regression/SKILL.md` e uma chamada curta em `.github/workflows/repair.yml`. Veja [o exemplo](examples/consumer.yml).

```yaml
jobs:
  patchwork:
    permissions:
      contents: write
      issues: write
      pull-requests: write
      copilot-requests: write
    uses: bbdw-gh-action/patchwork/.github/workflows/patchwork.yml@v3
    with:
      issue_number: ${{ format('{0}', github.event.issue.number || inputs.issue_number) }}
      config_path: .github/patchwork.json
      node_version: '24'
      install_command: npm ci
    secrets:
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

Em produção, fixe o SHA completo da versão revisada. O próprio workflow usa `job.workflow_sha` e `job.workflow_repository` para obter o motor na mesma revisão. Esses contextos exigem GitHub.com e não estão disponíveis no GitHub Enterprise Server. As versões antigas permanecem nas tags existentes. A v3 substitui a Action Codex pelo Copilot SDK 1.0.26 e seu runtime 1.0.103, fixados pelo lockfile; Node 24 é mantido.

O exemplo completo restringe gatilhos ao App oficial Sentry ou disparo manual autorizado. Mantenha esse filtro. O motor confere novamente autor, iniciador, labels, organização, projeto, release e duplicidade. O secret Sentry precisa ler organização, projeto e eventos. Configure os secrets no consumidor ou disponibilize secrets de organização aos consumidores. Não envie valores de credenciais em issues ou PRs.

## Disparo e integração Sentry

O consumidor usa `issues:opened` para issues do App oficial Sentry com labels `sentry` e `agent:repair`, ou `workflow_dispatch` iniciado por colaborador com escrita. O motor confere autor, iniciador, vínculo Sentry, projeto, release e duplicidade antes de iniciar o reparo.

Para uma issue elegível, execute no checkout do aplicativo:

```sh
gh workflow run repair.yml --ref main -f issue_number=NUMERO
```

A integração GitHub do Sentry deve apontar para a organização e o repositório atuais. Exports antigos de alertas estão apenas no [histórico](docs/historico/alertas-sentry-pre-migracao/README.md); não são configuração de implantação.

## Configuração por aplicação

```json
{
  "repository": "bbdw-gh-action/bbdw-checkout",
  "baseBranch": "main",
  "runtime": "node",
  "sentry": { "org": "bbdw-workshop-jj", "project": "bbdw-checkout", "projectId": "4512294853869568" },
  "sourceFiles": ["src/modules/orders/services/orders.service.ts"],
  "testPattern": "^src/modules/orders/services/[a-z0-9.-]+\\.test\\.ts$"
}
```

A release do evento deve ser o SHA completo do HEAD da branch autorizada e a tag `service` deve corresponder ao projeto. `scenario` é opcional; o checkout tem configurações para `CHK-003` e `CHK-004`. As branches ativas são `main`. Eventos sintéticos de SDK, releases abreviadas ou incidentes de revisões antigas são recusados. Esta integração não cria defeitos de demonstração.

| Runtime | Instalação no chamador | Validação |
| --- | --- | --- |
| `node` | `npm ci` | Build, testes novos compilados via node:test antes, `npm run check` depois |
| `go` | `go_version_file: go.mod`, `install_command: go mod download` | Compilação dos testes, funções `Test*` dos arquivos alterados antes; gofmt, vet, testes com race e build depois |
| `playwright` | `npm ci` e `npx playwright install --with-deps chromium` | Tipos e descoberta, testes novos antes, `npm run check` depois |

O código de produção autorizado deve existir; apenas modificações nesses arquivos e adições de regressões são publicáveis. Prefira acrescentar casos às suítes existentes, sem remover nem reescrever suas linhas. Arquivos novos usam nomes do comportamento, sem prefixos do agente ou IDs de cenário. Dependências, telemetria, configuração e fixtures permanecem fora do patch. A validação exige falha funcional anterior; erro de compilação ou falha global de infraestrutura Playwright não contam. O publicador compara a árvore do patch com a árvore aprovada pelo validador.

Entradas adicionais: `config_path` (padrão `.github/patchwork.json`), `node_version` (24), `go_version_file` (vazio), `install_command` (`npm ci`) e `copilot_model` (vazio: padrão da organização). O comando de instalação deve vir do workflow confiável, nunca do corpo de uma issue. Há uma chamada por execução; os artifacts têm nomes fixos, portanto não use matrix ou múltiplas chamadas no mesmo run.

## Skills e MCP

Cada aplicação versiona suas skills em `.agents/skills/`. O Patchwork acrescenta [patchwork-investigation](skills/patchwork-investigation/SKILL.md), que orienta a investigação, e [patchwork-sentry](skills/patchwork-sentry/SKILL.md), que orienta as consultas de leitura ao MCP e a conferência de projeto, evento e release. `service-regression` descreve os contratos e testes da aplicação.

Antes do agente, `scripts/context.mjs` copia as skills, AGENTS.md, documentação técnica e configuração da revisão confiável para o checkout descartável. A preparação retira catálogos de cenários, gabaritos e adaptadores legados de revisões antigas e recusa uma revisão confiável que ainda contenha esse material. Isso também funciona com branches antigas que ainda não possuem as skills. O prompt manda explicitamente ler e usar as três skills antes de editar. O relatório deve declarar as skills efetivamente lidas.

O MCP oficial `@sentry/mcp-server` é instalado pelo lockfile e iniciado via stdio. A sessão recebe `--organization-slug`, `--project-slug` e `--skills=inspect`. A sessão Copilot permite somente `get_sentry_resource`, `search_issues` e `search_events`, sem gateways de execução ou ferramentas de mutação. As buscas usam sintaxe Sentry explícita; o servidor não recebe uma chave de modelo para tradução de linguagem natural.

O contexto temporário `patchwork-copilot/context.json` contém caminhos das skills e configuração MCP sem secrets. O executor injeta `SENTRY_ACCESS_TOKEN` somente no ambiente do MCP. A sessão verifica a conexão antes de enviar o prompt; falha de autenticação, MCP ou política interrompe a proposta. O SDK e o runtime recebem `GITHUB_TOKEN` explicitamente, sem descoberta de credenciais pessoais. A API de preparação usa o secret Sentry em outro job. Os overrides de MCP, Zod e body-parser fixam versões corrigidas.

`agent-context.json` registra os nomes das skills e ferramentas disponibilizadas, sem credenciais. Esse artifact comprova configuração, não leitura efetiva. O relatório do agente deve indicar as consultas realmente executadas e qualquer indisponibilidade.

## Execução e publicação

`prepare → propose → validate → publish`, em quatro runners. O motor vem do SHA do workflow reutilizável, a política do SHA do workflow consumidor e a aplicação do SHA do incidente. Agente e validador não recebem escrita no GitHub. O validador não recebe secrets. Somente o publicador recebe escrita e nunca executa a aplicação.

O PR é draft, com base definida na configuração. O título segue `fix: [CÓDIGO-SENTRY] <título da issue> (#número)`, usando o título da issue GitHub e o `shortId` obtido da API Sentry na preparação; esses valores são tratados como texto. Após publicá-lo, o publicador comenta na issue um resumo de causa, correção, validação e links para PR e execução. O comentário é idempotente; uma retomada após falha não duplica o PR ou o comentário. Somente esse job recebe `issues: write`; o agente continua sem escrita no GitHub. Sem merge ou deploy automáticos. PRs criados ou atualizados com `GITHUB_TOKEN` geram execuções de `pull_request` que aguardam aprovação de alguém com escrita no repositório. A validação do Patchwork já ocorreu em runner separado. Aprove o CI na página do PR. Para CI sem essa aprovação, a publicação precisa usar um token de instalação de GitHub App ou PAT, conforme a [documentação do GitHub](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs); isso não aprova o merge.

Os artifacts `incident`, `proposal` e `validation` duram sete dias. Se a publicação falhar depois do push, use **Re-run failed jobs** enquanto os artifacts existirem. O motor confere base, conteúdo e proposta remota, sem force-push ou duplicação de PRs.

## Publicação de source maps

O [upload centralizado](docs/SOURCEMAPS.md) atende checkout e storefront (e preserva suporte a releases históricas de users). Os aplicativos mantêm somente comandos de desenvolvimento, build e testes; o smoke integrado permanece no storefront. Os adaptadores antigos de reparo foram removidos.

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

O actionlint 1.7.12 ainda desconhece `job.workflow_sha`, `job.workflow_repository` e `copilot-requests`; o CI ignora somente esses diagnósticos específicos, e os testes verificam suas posições e valores. Os demais erros de YAML/expressões continuam bloqueando a publicação.

## Referências

O [encaminhamento opcional entre repositórios](docs/HANDOFF.md) é uma saída alternativa quando a investigação encontra evidências de outro responsável. Reparos locais continuam usando o mesmo fluxo e exigindo regressão antes/depois; não existe triagem prévia obrigatória.

- [Identidade de workflows reutilizáveis](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#example-usage-of-job-context-workflow-identity)
- [Copilot SDK](https://github.com/github/copilot-sdk)
- [Autenticação no Actions](https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/server-to-server-tokens)
- [Servidor oficial Sentry e transporte stdio](https://github.com/getsentry/toolkit#stdio-vs-remote)

## Autenticação, isolamento e ativação

O chamador e `propose` precisam de `copilot-requests: write`. O owner deve habilitar **Allow use of Copilot CLI billed to the organization**; o uso é atribuído à organização do repositório consumidor. Créditos e cobertura do benefício precisam de confirmação no billing. Não há fallback para PAT, login pessoal ou BYOK.

O launcher Linux cria uma conta exclusiva sem sudo, dá escrita apenas ao checkout descartável e à sua pasta temporária e instala bubblewrap/slirp4netns. A sessão usa sandbox sem bypass, discovery/hooks externos desativados, tools explícitas e MCP de leitura. Políticas que exigem humano encerram a execução. O timeout do agente é de 15 minutos dentro do job de 20 minutos. O launcher encerra todos os processos da conta dedicada mesmo em falha ou cancelamento.

`execution.json` registra versão do SDK, modelo, MCP conectado, ferramentas/skills observadas e sucesso ou falha das consultas MCP concluídas, sem argumentos, respostas privadas ou credenciais. `report.md` é coletado da resposta final e redacta tokens conhecidos. Esses registros complementam `agent-context.json`; a evidência de validação permanece em outro runner.

Teste sem inferência: `node scripts/copilot-smoke.mjs --offline`. Para verificar token/modelo com uma resposta mínima, publique e dispare `copilot-smoke.yml`; `copilot_model` é opcional. A execução mínima não comprova o benefício de créditos ilimitados: confira a atribuição no billing.

Para conferir o agente com o secret Sentry real de cada consumidor, dispare `sentry-smoke.yml` no aplicativo. Ele chama o workflow compartilhado de mesmo nome por SHA, prepara a skill `patchwork-sentry` e executa o mesmo launcher isolado do reparo. O aceite exige a invocação da skill e uma consulta `search_issues` concluída pelo agente; lista vazia é válida. O artifact `sentry-smoke` contém os metadados e o relatório. Essa execução usa o Copilot, mas não publica issues, patches ou PRs e não precisa de um incidente elegível.

O último [registro de migração](docs/historico/migracao-2026-10-24.md) documenta as pendências observadas em 24/10/2026. Antes da ativação, conferir permissões, integração Sentry e publicação dos SHAs usados pelos consumidores. Esse registro não é uma consulta ao estado remoto atual.
