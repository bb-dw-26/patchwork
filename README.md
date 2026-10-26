# Patchwork — workshop

Um incidente Sentry vira uma correção proposta ou uma issue vinculada ao serviço responsável. O Copilot CLI oficial executa diretamente no GitHub Actions.

## Fluxo

**Preparar contexto → Copilot → verificar aplicação → abrir PR em rascunho.** Tudo ocorre em um único job, com dois checkouts: Patchwork e aplicação. Se a investigação apontar outro responsável, o workflow cria uma issue vinculada e não executa testes locais.

O workflow instala `@github/copilot` e o MCP Sentry, lê a issue e disponibiliza as skills. O Copilot modifica o checkout e responde com um JSON curto. O step seguinte executa `check_command` uma vez; somente o resultado aprovado permite abrir o PR. A publicação usa o GitHub App já configurado.

Não há upload/download de artefatos, patches intermediários, relatórios de auditoria, assinatura de encaminhamento ou prova automática antes/depois. Logs do Actions, diff do PR e comentário curto na issue são os pontos de acompanhamento.

## Uso

O consumidor mantém `.github/patchwork.json`, `AGENTS.md`, `docs/SPEC.md` e `.agents/skills/service-regression/SKILL.md`. Veja [o exemplo completo](examples/consumer.yml).

```yaml
jobs:
  patchwork:
    permissions:
      contents: read
      issues: read
      pull-requests: read
      copilot-requests: write
    uses: bb-dw-26/patchwork/.github/workflows/patchwork.yml@main
    with:
      issue_number: ${{ format('{0}', github.event.issue.number || inputs.issue_number) }}
      install_command: npm ci
      check_command: npm run check
    secrets:
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
      PATCHWORK_PUBLISH_APP_PRIVATE_KEY: ${{ secrets.PATCHWORK_PUBLISH_APP_PRIVATE_KEY }}
```

Os consumidores acompanham `@main`; as actions usam tags legíveis. Publique primeiro o motor e depois os consumidores. `job.workflow_repository` e `job.workflow_sha` apenas obtêm o motor correspondente à chamada; a aplicação vem da branch atual do consumidor, `main` nos três aplicativos do workshop.

O gatilho permanece restrito a issues Sentry com `sentry` e `agent:repair`, issues do App de encaminhamento autorizado ou disparo manual por colaborador com escrita. Não existe merge ou deploy automático.

## Configuração

```json
{
  "repository": "bb-dw-26/bbdw-checkout",
  "baseBranch": "main",
  "runtime": "node",
  "sentry": { "org": "bbdw-workshop-jj", "project": "bbdw-checkout", "projectId": "4512294853869568" },
  "sourceFiles": ["src/modules/orders/services/orders.service.ts"],
  "testPattern": "^src/modules/orders/services/[a-z0-9.-]+\\.test\\.ts$"
}
```

`sourceFiles` e `testPattern` delimitam as mudanças publicáveis. Remoções e mudanças em configuração, workflows ou fixtures são recusadas. A release do evento ajuda a investigação, mas não precisa coincidir com HEAD. `runtime`, `projectId` e `scenario` podem permanecer na configuração existente; `scenario` também mantém a identidade da branch de reparo.

| Input | Padrão / uso |
| --- | --- |
| `issue_number` | Número obrigatório da issue |
| `config_path` | `.github/patchwork.json`; checkout também usa a configuração de CHK-004 |
| `node_version` | `24` |
| `go_version_file` | Vazio; catalog usa `go.mod` |
| `install_command` | `npm ci`; catalog usa `go mod download` |
| `check_command` | `npm run check`; catalog informa formatação, vet, testes com race e build |
| `copilot_model` | Vazio usa o modelo padrão permitido pela organização |

Os comandos vêm do workflow do consumidor, nunca do corpo da issue. Checkout e storefront usam `npm run check`. Storefront instala Chromium antes da investigação.

## Copilot, skills e Sentry

A autenticação usa `GITHUB_TOKEN` com `copilot-requests: write`. A organização precisa permitir o uso de Copilot CLI cobrado à organização. Não é necessário PAT pessoal. Consulte a [integração oficial](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-in-actions).

As skills compartilhadas ficam em `COPILOT_HOME/skills`, no diretório temporário do Copilot. O prompt informa seus caminhos completos e o CLI recebe acesso a esse diretório; a skill do serviço e AGENTS.md são lidos do checkout atual. O escopo efetivo vem da configuração selecionada pelo consumidor. O MCP usa o projeto de origem, inclusive em encaminhamentos, e permite somente `get_sentry_resource`, `search_issues` e `search_events`. O token Sentry entra pelo secret do Actions, que o mascara nos logs; a configuração MCP contém apenas a referência à variável de ambiente.

O Copilot acrescenta uma regressão pertinente e resume a causa e a mudança. O workflow executa a verificação completa uma vez após sua resposta. Formato final:

```json
{"outcome":"repair","summary":"Causa e alteração em até dois parágrafos curtos."}
```

Também são aceitos `noop`, sem alterações, e `handoff`, com `destination` autorizado e resumo da hipótese. Uma resposta inválida encerra a execução. Sem alteração nem encaminhamento, nenhum PR é aberto.

Prompt, configuração MCP, resposta e estado local do CLI são temporários e removidos no encerramento. O shell encerra o grupo de processos do CLI em sucesso, falha, timeout ou cancelamento. O limite do CLI é 15 minutos e o da verificação é 8 minutos.

Reparo e smoke mostram o prompt enviado e a saída normal do CLI em tempo real, com `--stream on`, sem `--silent`: mensagens de progresso, explicações, chamadas, resultados, erros e estatísticas que o próprio CLI exibir. `--log-level none` desliga os arquivos de diagnóstico; não há despejo de traces, requisições internas ou raciocínio extraído de arquivos de debug. A saída padrão é copiada para o temporário da resposta, de onde o step seguinte lê o JSON final; as estatísticas nativas ficam em stderr. A Action desativa a interpretação de comandos durante essa saída. Os temporários são removidos ao encerrar, sem upload de artefatos. As opções estão na [referência do CLI](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#command-line-options).

O agente pode executar um teste direcionado quando necessário, com saída e código de erro preservados. A suíte completa roda uma vez no step de verificação. Resumo e PR distinguem a análise do Copilot da verificação executada pelo workflow.

Este desenho usa um runner descartável para o workshop. Agente, testes e publicação compartilham esse runner; não existe isolamento por usuário ou por runners independentes. Os tokens do App são emitidos somente depois do CLI e, no reparo, dos testes.

## Publicação e encaminhamento

O PR é draft; sua descrição e o comentário na issue contêm causa, alteração, resultado da verificação e links. A branch por issue evita PR duplicado. Se um push anterior criou uma branch sem PR, a execução pede revisão dessa publicação e não faz force-push. Não há garantia de retomada de todos os passos de uma execução interrompida.

O [App publicador](docs/PUBLISHER.md) usa `PATCHWORK_PUBLISH_APP_CLIENT_ID` e `PATCHWORK_PUBLISH_APP_PRIVATE_KEY` tanto para PRs quanto para o [encaminhamento opcional](docs/HANDOFF.md). O encaminhamento recebe um token restrito a Issues, com origem/destino permitidos e apenas um salto. O receptor valida o autor pelo ID público do bot, configurado em `PATCHWORK_PUBLISH_BOT_ID`; nenhum App ou secret adicional é necessário. O protocolo simplificado vale para novas issues; encaminhamentos antigos não são migrados.

## Verificação local

```sh
npm ci --ignore-scripts
npm test
```

Os testes simulam CLI e APIs e usam repositórios Git temporários. Casos de shell, timeout e limpeza executam em Linux; os demais também executam no Windows. O CI roda todos em Linux e valida os workflows com actionlint.

Para conferir a integração real, o consumidor oferece `sentry-smoke.yml`: o Copilot realiza uma consulta curta e informa o resultado. Esse smoke não publica nada, não guarda artefatos e não inspeciona eventos internos do SDK. Seu resultado é a resposta do CLI, não uma auditoria independente da consulta.

O actionlint 1.7.12 ainda não reconhece os contextos de identidade do workflow, a permissão Copilot e o input `client-id` da [action de token v3](https://github.com/actions/create-github-app-token/blob/v3/action.yml). O CI ignora somente esses diagnósticos; os testes verificam o contrato usado.

## Arquivos para acompanhar

- `.github/workflows/patchwork.yml`: sequência completa, CLI e verificação.
- `scripts/patchwork.js`: contexto, resultado e publicação.
- `skills/`: orientação do agente.
- `tools/upload-sourcemaps.js`: utilitário operacional, fora do fluxo de reparo; mantém `npm run sentry:upload`.

O [roteiro](docs/ROTEIRO.md) e o [material da apresentação](docs/apresentacao/README.md) ficam fora das skills e prompts. Registros históricos descrevem a arquitetura e os resultados da época em que foram produzidos.
