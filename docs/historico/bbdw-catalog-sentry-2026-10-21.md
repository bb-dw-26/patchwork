# Registros Sentry — bbdw-catalog

Evidências registradas em 21/10/2026, antes da migração GitHub para `bb-dw-26`. IDs, releases, contagens de testes e vínculos abaixo são históricos; não atestam a configuração atual.

Alerta registrado na época: [Patchwork — bbdw-catalog](https://bbdw-workshop-jj.sentry.io/monitors/alerts/6206912/). O monitor do próprio projeto cria a issue com os dois labels; os eventos anteriores não foram reenviados.

## Validação histórica na organização anterior — 21/10/2026

- Evento: [*errors.errorString: BBDW SDK validation catalog sdk-20261021-110837](https://bbdw-workshop.sentry.io/issues/7804712243/).
- ID: `9912388552844b64ae1d00f5bc73f4e0`.
- Release exclusiva de teste: `bbdw-catalog@sdk-20261021-110837`; ambiente `bbdw-sdk-validation`, cenário `SDK-SMOKE`.
- Um evento observado no projeto correto, sem erros de processamento do Sentry.
- Stack: `catalog.go:94`; `telemetry.go:44`; `catalog.go:54`.
- A falha foi introduzida somente em uma cópia temporária da aplicação e percorreu a inicialização real e o tratamento de erros. Nenhuma rota ou falha de teste foi adicionada à aplicação versionada.
- Os processos temporários foram encerrados. Este registro não representa deploy remoto nem execução do agente de reparo.

## Checks

`go vet ./...` e `go test ./...`: contratos HTTP e captura concorrente de panics. O teste usa um coletor HTTP local, confirma dois IDs isolados e nenhum evento para 404. `go test -race ./...` permanece no CI Linux; o ambiente Windows local não tem compilador C para o detector de corridas.

## Migração validada — 21/10/2026

Organização `bbdw-workshop-jj`, projeto próprio e repositório homônimo conectados. O `.env` local usa o novo DSN. A organização antiga e seus eventos foram preservados.

- Evento de migração (issue 7804862846 posteriormente excluída a pedido do responsável); ID `d9fdc75018bf435c98158d2fe91194c5`.
- Release: `bbw-catalog@migration-jj-20261021-122004`.
- Ambiente histórico: `bbw-migration-validation`; cenário `SDK-SMOKE`; execução `migration-jj-20261021-122004`.
- Um evento no projeto correto, sem erros de processamento.
- Panic HTTP recuperado com resposta 500, stack com arquivo, função e linha; build de validação com `-trimpath`. Frames Go classificados como externos pelo SDK nesta execução, sem contexto de código inline.
- Mapeamento: `github.com/bbdw-gh-action/bbdw-catalog/` → raiz do repositório, branch `main`.

A exceção foi gerada apenas em uma cópia isolada da aplicação, sem modificar o código saudável versionado. Todos os processos temporários foram encerrados. Os processos que já existiam antes da migração não foram reiniciados; precisam recarregar o ambiente para usar os novos DSNs.

## Nomes corrigidos para BBDW

Projeto atual: `bbdw-catalog`, vinculado a `bbdw-gh-action/bbdw-catalog`. O ID do projeto e o DSN foram preservados. Pacote/serviço, Compose, CI e documentação usam o novo nome. Os identificadores de releases acima pertencem ao ensaio anterior à renomeação. As instâncias locais antigas foram encerradas durante essa correção.
