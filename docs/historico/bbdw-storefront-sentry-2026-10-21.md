# Registros Sentry — bbdw-storefront

Evidências registradas em 21/10/2026, antes da migração GitHub para `bb-dw-26`. IDs, releases, contagens de testes e vínculos abaixo são históricos; não atestam a configuração atual.

Alerta registrado na época: [Patchwork — bbdw-storefront](https://bbdw-workshop-jj.sentry.io/monitors/alerts/6206913/). O monitor do próprio projeto cria a issue com os dois labels; os eventos anteriores não foram reenviados.

## Validação histórica na organização anterior — 21/10/2026

- Evento: [Error: BBDW SDK validation storefront sdk-20261021-110837](https://bbdw-workshop.sentry.io/issues/7804712407/).
- ID: `cc150b88cb23496797591a875c8cf4ed`.
- Release exclusiva de teste: `bbdw-storefront@sdk-20261021-110837`; ambiente `bbdw-sdk-validation`, cenário `SDK-SMOKE`.
- Um evento observado no projeto correto, sem erros de processamento do Sentry.
- Stack: `main.tsx:8`; `App.tsx:13`; `App.tsx:13`.
- A falha foi introduzida somente em uma cópia temporária da aplicação e percorreu a inicialização real e o tratamento de erros. Nenhuma rota ou falha de teste foi adicionada à aplicação versionada.
- Os processos temporários foram encerrados. Este registro não representa deploy remoto nem execução do agente de reparo.

## Checks

`npm run check`: lint, tipos, build e dois testes Playwright. O teste de telemetria provoca uma falha real de renderização com resposta de catálogo inválida, verifica evento único, ausência de dados HTTP e botão de recuperação. O teste de compra confirma preservação do carrinho e sucesso na nova tentativa. Source maps confirmados com contexto TSX no evento do build minificado.

## Migração validada — 21/10/2026

Organização `bbdw-workshop-jj`, projeto próprio e repositório homônimo conectados. O `.env` local usa o novo DSN. A organização antiga e seus eventos foram preservados.

- Evento de migração (issue 7804863418 posteriormente excluída a pedido do responsável); ID `655b141d21a14180ba70242a06777663`.
- Release: `bbw-storefront@migration-jj-20261021-122004`.
- Ambiente histórico: `bbw-migration-validation`; cenário `SDK-SMOKE`; execução `migration-jj-20261021-122004`.
- Um evento no projeto correto, sem erros de processamento.
- Source maps reenviados para esta organização e contexto TypeScript/TSX confirmado no evento.
- Mapeamento: `../../src/` → `src/`, branch `main`.

A exceção foi gerada apenas em uma cópia isolada da aplicação, sem modificar o código saudável versionado. Todos os processos temporários foram encerrados. Os processos que já existiam antes da migração não foram reiniciados; precisam recarregar o ambiente para usar os novos DSNs.

## Nomes corrigidos para BBDW

Projeto atual: `bbdw-storefront`, vinculado a `bbdw-gh-action/bbdw-storefront`. O ID do projeto e o DSN foram preservados. Pacote/serviço, Compose, CI e documentação usam o novo nome. Os identificadores de releases acima pertencem ao ensaio anterior à renomeação. As instâncias locais antigas foram encerradas durante essa correção.

## EXECUCAO.md: Estado desta etapa

As quatro aplicações executam a compra saudável. Não há defeito intencional, conexão Sentry, workflow de agente ou deploy remoto nesta etapa. O próximo passo é preservar esta base e preparar CHK-001 em uma revisão isolada.

## EXECUCAO.md: conferência anterior

1. Abra a interface e aguarde o catálogo e os clientes.
2. Mantenha Cliente Retirada, duas Canecas Demo e Retirar na loja.
3. Finalize: a confirmação deve mostrar R$ 80,00 e retirada, sem endereço.
4. Com o mesmo cliente, selecione Receber em casa: deve aparecer a validação de endereço; o carrinho permanece.
5. Selecione Cliente Entrega: entrega deve concluir normalmente.

O pedido é fictício e não tem persistência. Cada nova submissão manual cria uma nova confirmação.
