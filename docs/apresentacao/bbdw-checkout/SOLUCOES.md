# Soluções de referência

Material público para revisão e comparação. O agente pode consultá-lo, e esse uso deve aparecer no registro da avaliação. Não é obrigatório produzir o mesmo código; o comportamento e as evidências determinam a aceitação.

## CHK-001 — Retirada sem endereço

**Escopo do cenário:** Principal — único cenário obrigatório.

**Causa planejada:** O checkout acessa customer.address.postalCode antes de verificar fulfillment.

**Correção de referência:** Condicionar a validação e o acesso ao endereço à modalidade delivery; retirada deve funcionar sem endereço.

**Regressões obrigatórias:**

- Retirada sem endereço cria pedido de 8000 centavos.
- Entrega sem endereço retorna 422 ADDRESS_REQUIRED.
- Entrega com endereço continua funcionando.
- Erro de dependência continua sendo tratado como 503.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.


## CHK-002 — Carrinho vazio

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Causa planejada:** O cálculo usa reduce sem acumulador inicial e antes de validar o carrinho.

**Correção de referência:** Rejeitar o carrinho vazio antes de consultar dependências ou calcular totais. Usar acumulador adequado sem permitir pedidos vazios de valor zero.

**Regressões obrigatórias:**

- Carrinho vazio retorna 422 e não persiste pedido.
- Carrinho vazio não consulta users nem catalog.
- Carrinho válido preserva cálculo em centavos e quantidades.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.
