# Soluções de referência

Material público para revisão e comparação. O agente pode consultá-lo, e esse uso deve aparecer no registro da avaliação. Não é obrigatório produzir o mesmo código; o comportamento e as evidências determinam a aceitação.

## CAT-001 — Produto sem imagem

**Escopo do cenário:** Reserva opcional — preparar somente após o cenário principal.

**Causa planejada:** O mapeamento calcula a miniatura com imageUrls[0], sem verificar o tamanho da slice.

**Correção de referência:** Verificar se há imagens antes de acessar a primeira posição; representar a miniatura ausente como null no JSON.

**Regressões obrigatórias:**

- Slice vazia retorna thumbnailUrl=null.
- Slice nil também é aceita e imageUrls é serializado como [].
- Uma ou mais imagens retornam a primeira miniatura.
- A listagem de produtos aceita produtos sem imagens.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.


## CAT-002 — Produto inexistente

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Causa planejada:** A busca retorna um ponteiro nil e o handler acessa seus campos.

**Correção de referência:** Tratar produto não encontrado antes de acessar o ponteiro e manter falhas internas distintas de ausência de produto.

**Regressões obrigatórias:**

- Produto inexistente retorna 404.
- Produto existente retorna o contrato completo.
- A aplicação continua respondendo após a requisição inválida.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.
