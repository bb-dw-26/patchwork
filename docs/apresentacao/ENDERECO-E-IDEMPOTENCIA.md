# Estado ativo: endereço e idempotência

Material exclusivo do operador. Não fornecer aos agentes de reparo.

- **CHK-003 principal:** `main` do storefront permite submissões repetidas. Retirada é o padrão, sem consulta de CEP ou perfis. O checkout reserva a chave, devolve 409 para concorrência, registra uma ocorrência por tentativa e confirma somente um pedido. Repetição após sucesso devolve o mesmo ID.
- **CHK-004 secundário:** entrega tem formulário e busca de CEP via checkout/ViaCEP. A resposta documentada de CEP inexistente provoca TypeError/500 na revisão defeituosa. O reparo esperado é local no checkout.
- Users e CHK-001 foram retirados do fluxo ativo. Repositórios, branches, histórico Git e eventos antigos não são apagados. A versão healthy será preparada depois.
- Revisões ativas e destinos autorizados usam `main` nos mirrors `bbdw-gh-action`. Atraso de 1500 ms só no processo do ensaio; padrão zero. Uma instância, limite de 1000 intenções e retenção de dez minutos.

## Evidência local

Os testes de comportamento correto permanecem ativos. Na revisão defeituosa, o contrato de CEP inexistente falha com 500 em vez de 404; os três testes de envio repetido falham. Controles temporários, fora dos repositórios das aplicações, confirmam que tratar o retorno do ViaCEP e restaurar o lock imediato com botão desabilitado fazem as suítes passarem. Nenhum controle é publicado como versão healthy.

O smoke integrado testa retirada sem consulta de CEP, entrega com API simulada e layout mobile. Coletores Sentry locais verificam captura única e ausência de dados pessoais. O motor mantém investigação local como padrão; somente evidência de causa externa permite propor encaminhamento, publicado por job separado.

## Evidência remota exigida

Registrar separadamente: evento Sentry com release exata; issue GitHub original; execução de investigação; issue encaminhada e comentário na original; execução no destino; PR em rascunho. Um evento ou teste local não comprova os passos seguintes. App de issues, assinatura, permissões e Actions precisam estar configurados nos mirrors. Não fazer merge ou deploy automáticos.

Roteiros: [CHK-003](chk-003/ROTEIRO.md), [CHK-004](chk-004/ROTEIRO.md).
