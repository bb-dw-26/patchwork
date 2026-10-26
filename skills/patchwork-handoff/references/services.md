# Mapa técnico

| Serviço / repositório | Responsabilidade | Interface |
| --- | --- | --- |
| bbdw-gh-action/bbdw-storefront | Interface React, estado do carrinho e interação de compra | Consome as APIs de catalog e checkout |
| bbdw-gh-action/bbdw-checkout | Validação e criação de pedidos, cálculo de totais | POST /orders e GET /addresses/:postalCode; consulta catalog e ViaCEP |
| bbdw-gh-action/bbdw-catalog | Produtos, disponibilidade e preços em centavos | GET /products e GET /products/:id |

O evento Sentry identifica o serviço que observou o erro. A responsabilidade pela causa precisa ser demonstrada pela investigação. Este mapa descreve contratos, não soluções. Somente os destinos listados em `handoff.targets` da configuração confiável estão autorizados para publicação; as demais relações são contexto técnico.
