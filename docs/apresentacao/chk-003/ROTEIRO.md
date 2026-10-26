# CHK-003 — material exclusivo do operador

Não copiar este diretório, roteiro ou gabarito para `.agents`, prompts ou docs das aplicações. O motor disponibiliza somente as skills técnicas ao CLI. O material de apresentação fica no checkout do motor, no mesmo runner, sem isolamento de leitura.

## Preparação e gabarito

A revisão defeituosa está na `main` do storefront; a versão healthy será preparada depois. A cobertura prévia de lock imediato e segundo clique durante a requisição foi removida por decisão do operador. O agente deve criar o teste de regressão durante a investigação. `create-scenario.mjs` pertence à preparação histórica em branches e não deve ser executado sobre esta main.

Checkout e storefront usam `main` em `bb-dw-26`. Configure `CHECKOUT_DEMO_DELAY_MS=1500` somente no checkout do ensaio. Configure `SENTRY_RELEASE` e `VITE_SENTRY_RELEASE` com os SHAs exatos executados e publique seus source maps. Fora do ensaio, atraso zero. A captura de concorrência recebe `scenario=CHK-003` independentemente da modalidade.

Antes da execução remota, confira o App publicador conforme `docs/HANDOFF.md`, o workflow publicado e as permissões dos repositórios. O mesmo App abre PRs e issues de encaminhamento, com tokens de escopos diferentes. A investigação continua local por padrão; encaminhamento requer evidências.

## Apresentação

1. Abra **Carrinho** (duas canecas, retirada). Clique para finalizar e clique novamente durante os 1,5 segundos de processamento.
2. O backend reserva a intenção antes de aguardar, devolve 409 à concorrência e registra um único `CheckoutInProgressError`. A primeira requisição pode concluir normalmente. O evento fica no projeto Sentry do checkout e traz hashes de correlação e `client_release`, sem corpo do pedido.
3. Aguarde a issue criada pelo App oficial Sentry com `sentry` e `agent:repair`. O agente investiga no checkout; só encaminha se as evidências justificarem responsabilidade externa.
4. O resultado de encaminhamento cria issue vinculada no storefront. A original permanece aberta, com comentário. O receptor confere a identidade do App e a origem permitida antes de investigar; um segundo salto é recusado.
5. O Copilot CLI no storefront confirma a hipótese, acrescenta uma regressão pertinente e aplica a correção. O workflow executa `npm run check` uma vez e abre PR em rascunho se passar, sem merge/deploy automáticos.

O gabarito é restaurar exclusão mútua imediata até a requisição terminar e o botão desabilitado. Debounce isolado não basta. O teste novo criado pelo agente deve manter a requisição pendente, aguardar além de uma janela usual de debounce e repetir o clique. Exercitar também cliques no mesmo ciclo e fechamento/reabertura do painel é útil. Não há etapa de prova automatizada antes/depois.

Repetir depois do sucesso com a mesma chave recupera o pedido original. Alterar endereço normalizado de entrega, modalidade ou itens cria outra intenção. Pagamento demonstrativo não altera payload nem chave. O cache é limitado a 1000 intenções por instância e retém sucessos por dez minutos; reinício perde o cache. Não demonstrar garantia distribuída.

## Contingência e encerramento

CHK-004 é o caso secundário de reparo local: consulte [o roteiro de CEP](../chk-004/ROTEIRO.md). CHK-001 permanece apenas no histórico.

Guarde links do incidente, issues, execuções e PR quando o ensaio remoto realmente ocorrer. Sem credenciais de escrita/App, registre apenas o ensaio local, sem fabricar links. Encerre todos os servidores e navegadores iniciados pelo ensaio.
