# Cenários de falha

Os cenários abaixo são planejados. Ainda não há defeitos executáveis, branches de cenário ou eventos Sentry gerados. As reproduções usam os contratos de `SPEC.md`.

## USR-001 — Preferências ausentes

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Preparação:** executar a revisão correspondente a `demo/usr-001` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `GET /users/customer-pickup/preferences`

**Comportamento defeituoso esperado:** HTTP 500 e TypeError de acesso a propriedade de null.

**Comportamento correto:** HTTP 200 com emailNotifications=false e smsNotifications=false.

**Telemetria:** registrar serviço `bbdw-users`, cenário `USR-001`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).


## USR-002 — Cliente inexistente

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Preparação:** executar a revisão correspondente a `demo/usr-002` com as fixtures sintéticas e as demais dependências em versões saudáveis.

**Reprodução:** `GET /users/customer-missing`

**Comportamento defeituoso esperado:** HTTP 500 e TypeError; uma ausência esperada vira exceção inesperada.

**Comportamento correto:** HTTP 404 com error.code=USER_NOT_FOUND.

**Telemetria:** registrar serviço `bbdw-users`, cenário `USR-002`, release, request ID e stack trace. A mensagem exata da exceção pode variar conforme o runtime.

**Aceitação:** conferir os testes e casos vizinhos em [Soluções de referência](SOLUCOES.md), repetir a requisição e registrar as evidências em [Avaliação](AVALIACAO.md).
