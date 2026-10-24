# Registros Sentry — bbdw-users

Evidências registradas em 21/10/2026, antes da migração GitHub para `bb-dw-26`. IDs, releases, contagens de testes e vínculos abaixo são históricos; não atestam a configuração atual.

Alerta registrado na época: [Patchwork — bbdw-users](https://bbdw-workshop-jj.sentry.io/monitors/alerts/6206911/). O monitor do próprio projeto cria a issue com os dois labels; os eventos anteriores não foram reenviados.

## Validação histórica na organização anterior — 21/10/2026

- Evento: [Error: BBDW SDK validation users sdk-20261021-110837](https://bbdw-workshop.sentry.io/issues/7804712661/).
- ID: `20fddd7c913b4461a51efdeb0928f061`.
- Release exclusiva de teste: `bbdw-users@sdk-20261021-110837`; ambiente `bbdw-sdk-validation`, cenário `SDK-SMOKE`.
- Um evento observado no projeto correto, sem erros de processamento do Sentry.
- Stack: `app.ts:56`.
- A falha foi introduzida somente em uma cópia temporária da aplicação e percorreu a inicialização real e o tratamento de erros. Nenhuma rota ou falha de teste foi adicionada à aplicação versionada.
- Os processos temporários foram encerrados. Este registro não representa deploy remoto nem execução do agente de reparo.

## Checks

`npm run check`: lint, tipos e quatro testes aprovados; duas requisições simultâneas geram eventos separados, e 404 não gera evento. Source maps confirmados com contexto TypeScript no Sentry.

## Migração validada — 21/10/2026

Organização `bbdw-workshop-jj`, projeto próprio e repositório homônimo conectados. O `.env` local usa o novo DSN. A organização antiga e seus eventos foram preservados.

- Evento de migração (issue 7804863069 posteriormente excluída a pedido do responsável); ID `0ff8ffad2f5648c49aab5168775af8b8`.
- Release: `bbw-users@migration-jj-20261021-122004`.
- Ambiente histórico: `bbw-migration-validation`; cenário `SDK-SMOKE`; execução `migration-jj-20261021-122004`.
- Um evento no projeto correto, sem erros de processamento.
- Source maps reenviados para esta organização e contexto TypeScript/TSX confirmado no evento.
- Mapeamento: `../../src/` → `src/`, branch `main`.

A exceção foi gerada apenas em uma cópia isolada da aplicação, sem modificar o código saudável versionado. Todos os processos temporários foram encerrados. Os processos que já existiam antes da migração não foram reiniciados; precisam recarregar o ambiente para usar os novos DSNs.

## Nomes corrigidos para BBDW

Projeto atual: `bbdw-users`, vinculado a `bbdw-gh-action/bbdw-users`. O ID do projeto e o DSN foram preservados. Pacote/serviço, Compose, CI e documentação usam o novo nome. Os identificadores de releases acima pertencem ao ensaio anterior à renomeação. As instâncias locais antigas foram encerradas durante essa correção.
