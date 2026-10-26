# CHK-003 — material exclusivo do operador

Não copiar este diretório, roteiro ou gabarito para `.agents`, prompts ou docs das aplicações. O motor copia somente a skill técnica; `docs/apresentacao` fica fora do checkout da aplicação e do ambiente do agente.

## Preparação e gabarito

A revisão defeituosa está na `main` do storefront; a versão healthy será preparada depois. Os testes de lock imediato e bloqueio durante a requisição continuam exigindo o comportamento correto. `create-scenario.mjs` pertence à preparação histórica em branches e não deve ser executado sobre esta main.

Checkout e storefront usam `main` nos mirrors `bbdw-gh-action`. Configure `CHECKOUT_DEMO_DELAY_MS=1500` somente no checkout do ensaio. Configure `SENTRY_RELEASE` e `VITE_SENTRY_RELEASE` com os SHAs exatos executados e publique seus source maps. Fora do ensaio, atraso zero. A captura de concorrência recebe `scenario=CHK-003` independentemente da modalidade.

Antes da execução remota, confira o App conforme `docs/HANDOFF.md`, o workflow publicado e as permissões dos mirrors. A investigação continua local por padrão; encaminhamento requer evidências.

## Apresentação

1. Abra **Carrinho** (duas canecas, retirada). Clique para finalizar e clique novamente durante os 1,5 segundos de processamento.
2. O backend reserva a intenção antes de aguardar, devolve 409 à concorrência e registra um único `CheckoutInProgressError`. A primeira requisição pode concluir normalmente. O evento fica no projeto Sentry do checkout e traz hashes de correlação e `client_release`, sem corpo do pedido.
3. Aguarde a issue criada pelo App oficial Sentry com `sentry` e `agent:repair`. O agente investiga no checkout; só encaminha se as evidências justificarem responsabilidade externa.
4. A proposta assinada cria issue vinculada no storefront. A original permanece aberta, com comentário e `agent:forwarded`. O receptor verifica assinatura, origem, evento e SHAs antes de investigar.
5. O agente no storefront confirma a hipótese, acrescenta teste novo e propõe a correção. A validação exige falha antes e sucesso depois. O PR é rascunho no próprio storefront, sem merge/deploy automáticos.

O gabarito é restaurar exclusão mútua imediata até a requisição terminar e o botão desabilitado. Debounce isolado não basta. `tests/pending-submission.spec.ts` mantém a requisição pendente, aguarda 1,6 segundo e repete o clique; os testes existentes também exercitam dois cliques no mesmo ciclo e fechamento/reabertura do painel.

Repetir depois do sucesso com a mesma chave recupera o pedido original. Alterar endereço normalizado de entrega, modalidade ou itens cria outra intenção. Pagamento demonstrativo não altera payload nem chave. O cache é limitado a 1000 intenções por instância e retém sucessos por dez minutos; reinício perde o cache. Não demonstrar garantia distribuída.

## Contingência e encerramento

CHK-004 é o caso secundário de reparo local: consulte [o roteiro de CEP](../chk-004/ROTEIRO.md). CHK-001 permanece apenas no histórico.

Guarde links do incidente, issues, execuções e PR quando o ensaio remoto realmente ocorrer. Sem credenciais de escrita/App, registre apenas o ensaio local, sem fabricar links. Encerre todos os servidores e navegadores iniciados pelo ensaio.
