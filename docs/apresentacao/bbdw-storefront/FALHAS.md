# Cenários de falha

Os cenários abaixo são planejados. Ainda não há defeitos executáveis, branches de cenário ou eventos Sentry gerados. As reproduções usam os contratos de `SPEC.md`.

## WEB-001 — Miniatura ausente

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Preparação:** executar a revisão correspondente a `demo/web-001` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `Abrir o catálogo com a resposta válida que contém product-no-image e thumbnailUrl=null.`

**Comportamento defeituoso esperado:** Erro de renderização capturado pelo limite de erro e enviado ao Sentry; a listagem não é exibida normalmente.

**Comportamento correto:** Produto visível com placeholder acessível, preço e botão de adicionar funcionais.

**Telemetria:** registrar serviço `bbdw-storefront`, cenário `WEB-001`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).


## WEB-002 — Confirmação de retirada

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Preparação:** executar a revisão correspondente a `demo/web-002` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `Exibir o pedido pickup-confirmation, já criado com sucesso, com deliveryAddress=null.`

**Comportamento defeituoso esperado:** Erro de renderização após um pedido bem-sucedido; evento no Sentry.

**Comportamento correto:** Confirmação mostra retirada, ID do pedido e R$ 80,00, sem campo de endereço.

**Telemetria:** registrar serviço `bbdw-storefront`, cenário `WEB-002`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).
