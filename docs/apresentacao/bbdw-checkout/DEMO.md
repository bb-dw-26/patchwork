# Preparação de CHK-001

Este documento orienta a sessão com retirada sem endereço. A agenda está no [roteiro](../../ROTEIRO.md), a reprodução em [FALHAS.md](FALHAS.md) e os critérios de correção em [SOLUCOES.md](SOLUCOES.md). A operação comum do workflow está no [README do Patchwork](../../../README.md).

## Antes do ensaio

Conferir as pendências do [registro de migração](../../historico/migracao-2026-10-24.md): acesso à organização, publicação do Patchwork e dos consumidores, políticas Copilot e vínculo GitHub do Sentry. O motor local usa Copilot SDK; evidências antigas de Codex ou de `OPENAI_API_KEY` não comprovam a ativação desse fluxo.

A aplicação saudável fica em `main`; `demo/chk-001` preserva o defeito. Users, catalog e storefront devem executar versões saudáveis e fixadas. O PR deve apontar para a branch autorizada em `.github/patchwork.json`.

## Revisão e telemetria

Em um checkout separado e limpo do serviço:

```sh
git fetch origin
git switch demo/chk-001
git rev-parse HEAD
npm ci
npm run build
```

Configure `SENTRY_RELEASE` com o SHA completo exibido, `SENTRY_ENVIRONMENT=bbdw-demo`, `DEMO_SCENARIO=CHK-001` e um `DEMO_RUN_ID` identificável. Use o DSN do projeto `bbdw-checkout`. A tag de cenário identifica a execução; não injeta o defeito.

Publique os source maps pelo Patchwork, informando a pasta desse mesmo checkout:

```sh
npm run sentry:upload -- ../bbdw-checkout
```

Esse comando é executado no Patchwork. Confira a [configuração de upload](../../SOURCEMAPS.md), aguarde os mapas ficarem disponíveis e execute o mesmo build com `npm start`. A execução das quatro aplicações está documentada no [storefront](https://github.com/bb-dw-26/bbdw-storefront/blob/main/docs/EXECUCAO.md).

## Integração e disparo

O projeto Sentry deve estar vinculado ao checkout na organização `bb-dw-26`. Configure a regra nativa para criar issue pelo App oficial Sentry, com labels `sentry` e `agent:repair`, para evento novo ou regressão elegível. O consumidor exige projeto, serviço, cenário e release compatíveis com sua configuração.

Os [exports de alertas anteriores à migração](../../historico/alertas-sentry-pre-migracao/README.md) preservam os IDs antigos; não devem ser aplicados como configuração atual. Os adaptadores locais de ponte foram removidos.

O secret `SENTRY_AUTH_TOKEN` é usado na preparação e no MCP de leitura. O Copilot recebe `GITHUB_TOKEN` pelo Actions, com `copilot-requests: write`; o validador não recebe secrets. Os quatro apps têm consumidores do Patchwork, mas esta sessão exercita o incidente do checkout.

Ao finalizar a compra de retirada com `customer-pickup` e duas unidades de `product-standard`, confira o erro na interface, o evento Sentry, a issue e o início do Actions. A preparação reconstrói o contexto a partir do incidente validado; gabaritos e exemplos deste diretório não são fornecidos ao agente.

Para retomar uma issue elegível, execute no checkout do aplicativo:

```sh
gh workflow run repair.yml --ref main -f issue_number=NUMERO
```

Uma nova execução identificada por `DEMO_RUN_ID` não garante novo grupo Sentry ou nova issue. Conferir agrupamento e vínculo GitHub no ensaio e evitar execuções concorrentes no mesmo projeto. Uma issue que já possui PR não inicia outro reparo.

## Resultado, revisão e repetição

O motor executa `prepare → propose → validate → publish`. Exige teste novo que falhe antes da correção e verificações aprovadas depois. O PR é draft e inclui relatório e evidências. Não há merge nem deploy automáticos. Se apenas a publicação falhar, usar **Re-run failed jobs** enquanto os artifacts estiverem disponíveis.

Revisar o diff e os testes de retirada, entrega sem endereço e entrega válida. Após aprovação, reconstruir somente o checkout corrigido e repetir a compra: HTTP 201, total de R$ 80,00 e `deliveryAddress=null`. Preservar o commit defeituoso e registrar SHAs, eventos, issue, execução e PR. Usar a contingência do roteiro se o resultado não estiver pronto.

## Verificação local e encerramento

`npm run check` verifica os contratos do checkout. No storefront, `npm run smoke` testa a compra integrada com versões saudáveis e encerra os processos que inicia. A revisão defeituosa deve expor a falha nos testes de contrato; não enfraquecer o CI para ocultá-la.

Ao concluir, encerrar os terminais iniciados e executar `docker compose down` se tiver usado Compose.

As [evidências de 21/10/2026](../../historico/bbdw-checkout-verificacao-2026-10-21.md) registram validações anteriores; não representam um novo ensaio da versão atual.
