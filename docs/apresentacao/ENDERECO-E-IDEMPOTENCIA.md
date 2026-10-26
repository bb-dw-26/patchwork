# Estado ativo: endereço e idempotência

Material exclusivo do operador. Não fornecer aos agentes de reparo.

- **CHK-003 principal:** `main` do storefront permite submissões repetidas. Retirada é o padrão, sem consulta de CEP ou perfis. O checkout reserva a chave, devolve 409 para concorrência, registra uma ocorrência por tentativa e confirma somente um pedido. Repetição após sucesso devolve o mesmo ID.
- **CHK-004 secundário:** entrega tem formulário e busca de CEP via checkout/ViaCEP. A resposta documentada de CEP inexistente provoca TypeError/500 na revisão defeituosa. O reparo esperado é local no checkout.
- Users e CHK-001 foram retirados do fluxo ativo. Repositórios, branches, histórico Git e eventos antigos não são apagados. A versão healthy será preparada depois.
- Revisões ativas e destinos autorizados usam `main` nos mirrors `bbdw-gh-action`. Atraso de 1500 ms só no processo do ensaio; padrão zero. Uma instância, limite de 1000 intenções e retenção de dez minutos.

## Evidência local

Por decisão do operador, foram removidos os três testes que exigiam bloqueio de envio repetido no storefront e o teste que exigia 404 para CEP inexistente no checkout. As falhas de produção permanecem na main. Cabe ao agente de reparo criar esses testes de regressão e demonstrar falha antes e sucesso depois da correção. A suíte inicial verde não comprova a correção de CHK-003 ou CHK-004.

Permanecem os testes de idempotência do backend (reserva, concorrência, captura única e replay), estabilidade da chave, validações, formulário, catálogo e telemetria. Os resultados anteriores com testes deliberadamente falhando são registros históricos da validação anterior a essa decisão.

O smoke integrado testa retirada sem consulta de CEP, entrega com API simulada e layout mobile. Coletores Sentry locais verificam captura única e ausência de dados pessoais. O motor mantém investigação local como padrão; somente evidência de causa externa permite propor encaminhamento, publicado por job separado.

## Evidência remota exigida

Registrar separadamente: evento Sentry com release exata; issue GitHub original; execução de investigação; issue encaminhada e comentário na original; execução no destino; PR em rascunho. Um evento ou teste local não comprova os passos seguintes. App de issues, assinatura, permissões e Actions precisam estar configurados nos mirrors. Não fazer merge ou deploy automáticos.

Roteiros: [CHK-003](chk-003/ROTEIRO.md), [CHK-004](chk-004/ROTEIRO.md).
