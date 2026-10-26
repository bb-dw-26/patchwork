# Validação — remoção de users e endereço

Registro exclusivo do operador. Não enviar aos agentes.

## Revisões publicadas e executadas

- patchwork: [10afeca001ef2360674a1df41f72e7a4a4f836b7](https://github.com/bbdw-gh-action/patchwork/commit/10afeca001ef2360674a1df41f72e7a4a4f836b7).
- bbdw-checkout: [bff4a7ef80b97f34fec0d89e39c3cbfbc170be02](https://github.com/bbdw-gh-action/bbdw-checkout/commit/bff4a7ef80b97f34fec0d89e39c3cbfbc170be02).
- bbdw-storefront: [c6b13bd91febafe79e2e83f0efa3e761fe0b68a7](https://github.com/bbdw-gh-action/bbdw-storefront/commit/c6b13bd91febafe79e2e83f0efa3e761fe0b68a7).
- bbdw-catalog: [18dd5d63b8be87a524b990d4e2e0f3783d6973f4](https://github.com/bbdw-gh-action/bbdw-catalog/commit/18dd5d63b8be87a524b990d4e2e0f3783d6973f4).

Checkout e storefront tiveram source maps publicados nas releases acima. Os eventos reais apresentam frames TypeScript e nenhum erro de processamento de source maps. O runtime de ensaio usa uma instância do checkout com atraso de 1500 ms; padrão do código permanece zero.

## Verificações locais

- Checkout: 18 testes passaram; 1 falhou, exigindo 404 para CEP inexistente e recebendo o 500 deliberado.
- Storefront: 16 testes passaram; 3 falharam pela submissão repetida deliberada (dois cliques imediatos e segundo clique após 1,6 segundo).
- Controles isolados: 19 testes no checkout e 19 no storefront passaram após correções mínimas. Controles não publicados.
- Formulário final: 3 testes passaram, incluindo edição, preservação, resposta antiga, erro e layout a 390 px.
- Smoke integrado passou: retirada sem CEP e entrega com API local. Processos encerrados pelo próprio script.
- Lint, tipos e builds passaram. Compose validado. Imagens Docker não foram construídas nesta validação.
- Patchwork: 42 testes Node passaram; 1 teste Go com race foi omitido por falta do compilador C. Os 6 testes Python do workflow passaram. Cobertura inclui reparo local, autenticidade, deduplicação, ciclos, revisões e encaminhamento simulado.
- ViaCEP real: uma consulta válida e uma inexistente confirmaram 200/endereço e 200/erro textual true; o navegador também reproduziu o caso inexistente pelo checkout.

## Captura remota observada

- CHK-004: [BBDW-CHECKOUT-6](https://bbdw-workshop-jj.sentry.io/issues/7812882024/), evento `f04502a11c074486ad8ddb1affa6914d`; 1 evento neste ensaio. Release `bff4a7ef80b97f34fec0d89e39c3cbfbc170be02`. Sem request HTTP, CEP, endereço ou corpo da compra no evento inspecionado.
- CHK-003: [BBDW-CHECKOUT-4](https://bbdw-workshop-jj.sentry.io/issues/7812781726/), evento `aea1228fa1ed45d59adba069f28ac675`; 1 evento neste ensaio. Release `bff4a7ef80b97f34fec0d89e39c3cbfbc170be02`. Sem request HTTP, CEP, endereço ou corpo da compra no evento inspecionado.

## Etapas remotas separadas

- CHK-004: [issue original #2](https://github.com/bbdw-gh-action/bbdw-checkout/issues/2) criada automaticamente por sentry[bot], com sentry, agent:repair e scenario:CHK-004.
- CHK-003: evento entrou no agrupamento Sentry já existente. Não foi criada nova issue GitHub neste ensaio; o alerta configurado reage a issue nova ou regressão, não retroativamente.
- Alertas dos dois cenários ativos no Sentry: 6231508 (CHK-003), 6231509 (CHK-004). Histórico CHK-001 preservado.
- Execução Patchwork, encaminhamento, issue vinculada e PR remoto: NÃO COMPROVADOS. Actions está desativado nos mirrors; não há secrets/variáveis do App de encaminhamento nem Sentry configurados neles. Não há credencial local desse App disponível para concluir a configuração.
- Próxima dependência externa: instalar/configurar o App restrito a Issues, IDs e chave pública/privada conforme docs/HANDOFF.md, prover SENTRY_AUTH_TOKEN de leitura e habilitar Actions. Então repetir o ensaio; não inventar links nem declarar fluxo completo.
- Nenhum merge ou deploy de reparo foi realizado. Users, histórico Git e incidentes antigos foram preservados.

## Encerramento

Servidores iniciados para esta validação devem ser encerrados ao final; usar o procedimento de execução integrada para novo ensaio.
