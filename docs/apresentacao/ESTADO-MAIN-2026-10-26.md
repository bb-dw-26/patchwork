# Casos executáveis na main — 26/10/2026

Material do operador; manter fora do contexto fornecido aos agentes.

Por decisão do operador, a `main` reúne os defeitos já implementados. Os demais cenários permanecem somente documentados; não foram acrescentadas novas falhas nesta etapa.

| Caso | Repositório | Estado |
| --- | --- | --- |
| CHK-001 — retirada sem endereço | bbdw-checkout | Adaptado à estrutura modular atual e levado à main; leitura do CEP antes de verificar a modalidade |
| CHK-003 — envio duplicado | bbdw-storefront | Na main; botão habilitado e ausência de exclusão mútua no envio |

As branches `demo/chk-001`, `demo/chk-003` e `demo/chk-003-base` permanecem preservadas. O checkpoint `checkpoint/pre-chk001-20261026` do checkout guarda a árvore anterior ao defeito. O storefront anterior ao CHK-003 está em `05e5f1ac923e630c04b0a2f31197e0c9501cc23d`. Esses pontos permitem preparar a versão healthy depois, sem reescrever a main nem enfraquecer testes.

## Interação entre os casos

Com os dois defeitos ativos, uma compra de retirada sem endereço falha com 500 mesmo com um único envio. Um segundo envio enquanto a chave está reservada recebe 409, antes de a primeira tentativa terminar com 500. A reserva é liberada após essa falha.

Para observar CHK-003 separadamente, selecionar **Cliente Entrega**, que tem endereço, e **Receber em casa**. Repetir o clique durante a espera: o envio concorrente recebe 409 e a primeira tentativa pode concluir com 201. O replay de uma tentativa concluída devolve o mesmo pedido. Os defeitos não são acionados por flags de cenário.

O atraso do ensaio é configurável por `CHECKOUT_DEMO_DELAY_MS`; padrão zero, recomendado 1500 ms. A identificação de cenário na telemetria não injeta nem corrige falhas. Captura no Sentry não comprova encaminhamento nem PR remoto.

Os testes continuam expressando o contrato correto. Na main defeituosa, as regressões afetadas devem falhar; o reparo deverá fazê-las passar.

Verificação nesta etapa: lint, tipos e build passaram. No checkpoint modular, 13 de 14 testes passaram; a validação de entradas inválidas pelo DTO já falhava. Após CHK-001, passaram 9 de 14: quatro falhas adicionais decorrem do acesso prematuro ao endereço. O checkpoint não deve ser apresentado como uma versão totalmente healthy sem resolver e validar também a falha preexistente do DTO.

## Casos apenas documentados

| Caso | Reprodução prevista | Falha prevista | Contrato correto |
| --- | --- | --- | --- |
| USR-001 | Preferências de cliente sem preferências | Acesso a objeto nulo, 500 | Preferências padrão false; endpoint ainda precisa ser implementado |
| USR-002 | Cliente inexistente | Acesso a resultado indefinido, 500 | 404 USER_NOT_FOUND |
| CAT-001 | Produto sem imagem | Índice fora da slice, panic e 500 | 200 com miniatura nula |
| CAT-002 | Produto inexistente | Ponteiro nil, panic e 500 | 404 PRODUCT_NOT_FOUND |
| CHK-002 | Carrinho vazio | reduce sem acumulador, 500 | 422 EMPTY_CART antes de consultar dependências |
| WEB-001 | Renderizar produto sem miniatura | trim em null quebra a tela | Placeholder acessível e produto utilizável |
| WEB-002 | Mostrar confirmação de retirada | Acesso a endereço nulo quebra a tela | Confirmação sem endereço e sem nova compra |
