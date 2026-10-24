# Cenários de falha

CHK-001 está implementado em `demo/chk-001`, com captura validada por coletor local e por evento real na organização Sentry `bbdw-workshop-jj`, incluindo resolução TypeScript pelos source maps. As evidências da etapa anterior estão no [registro de 21/10/2026](../../historico/bbdw-checkout-verificacao-2026-10-21.md). CHK-002 continua apenas especificado. Consultar [operação da demo](DEMO.md).

## CHK-001 — Retirada sem endereço

**Escopo do cenário:** Principal — único cenário obrigatório.

**Preparação:** executar a revisão correspondente a `demo/chk-001` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `POST /orders com {"customerId":"customer-pickup","fulfillment":"pickup","items":[{"productId":"product-standard","quantity":2}]}`

**Comportamento defeituoso esperado:** HTTP 500 e TypeError, apesar de a retirada ser válida.

**Comportamento correto:** HTTP 201, totalCents=8000 e deliveryAddress=null.

**Telemetria:** registrar serviço `bbdw-checkout`, cenário `CHK-001`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).


## CHK-002 — Carrinho vazio

**Escopo do cenário:** Complementar — fora da implementação obrigatória.


**Preparação:** executar a revisão correspondente a `demo/chk-002` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `POST /orders com {"customerId":"customer-delivery","fulfillment":"delivery","items":[]}`

**Comportamento defeituoso esperado:** HTTP 500 e TypeError de redução de array vazio.

**Comportamento correto:** HTTP 422 com error.code=EMPTY_CART; nenhum pedido é criado.

**Telemetria:** registrar serviço `bbdw-checkout`, cenário `CHK-002`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).
