# Cenários de falha

Os cenários abaixo são planejados. Ainda não há defeitos executáveis, branches de cenário ou eventos Sentry gerados. As reproduções usam os contratos de `SPEC.md`.

## CAT-001 — Produto sem imagem

**Escopo do cenário:** Reserva opcional — preparar somente após o cenário principal.

**Preparação:** executar a revisão correspondente a `demo/cat-001` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `GET /products/product-no-image`

**Comportamento defeituoso esperado:** Panic de índice fora dos limites, capturado pela instrumentação, e HTTP 500.

**Comportamento correto:** HTTP 200 com imageUrls=[] e thumbnailUrl=null.

**Telemetria:** registrar serviço `bbdw-catalog`, cenário `CAT-001`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).


## CAT-002 — Produto inexistente

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Preparação:** executar a revisão correspondente a `demo/cat-002` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `GET /products/product-missing`

**Comportamento defeituoso esperado:** Panic de ponteiro nil, evento no Sentry e HTTP 500.

**Comportamento correto:** HTTP 404 com error.code=PRODUCT_NOT_FOUND.

**Telemetria:** registrar serviço `bbdw-catalog`, cenário `CAT-002`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).
