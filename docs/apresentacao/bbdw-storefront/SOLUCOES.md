# Soluções de referência

Material público para revisão e comparação. O agente pode consultá-lo, e esse uso deve aparecer no registro da avaliação. Não é obrigatório produzir o mesmo código; o comportamento e as evidências determinam a aceitação.

## WEB-001 — Miniatura ausente

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Causa planejada:** O componente chama thumbnailUrl.trim() sem tratar null.

**Correção de referência:** Tratar miniatura ausente no componente e usar o placeholder local; preservar o restante do cartão e os produtos com imagem.

**Regressões obrigatórias:**

- Miniatura null não quebra a renderização.
- Placeholder possui texto alternativo apropriado.
- Produto com imagem preserva a imagem.
- Produto sem imagem pode ser adicionado ao carrinho.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.


## WEB-002 — Confirmação de retirada

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Causa planejada:** A confirmação lê deliveryAddress.postalCode mesmo quando fulfillment=pickup.

**Correção de referência:** Renderizar dados de endereço somente para entrega e manter a confirmação completa para retirada.

**Regressões obrigatórias:**

- Retirada sem endereço exibe confirmação.
- Entrega com endereço continua exibindo o endereço.
- Renderizar a confirmação não dispara outra criação de pedido.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.
