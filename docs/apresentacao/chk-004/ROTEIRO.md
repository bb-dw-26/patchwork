# CHK-004 — consulta de CEP (somente operador)

Caso secundário de reparo local. CHK-003 continua sendo a demonstração principal. O serviço users e CHK-001 estão fora do exemplo ativo; histórico, repositório e incidentes antigos são preservados.

## Preparação e reprodução

Execute storefront, checkout e catalog das revisões publicadas em `main`. Use a release exata de cada build e publique os source maps correspondentes. Não distribua este roteiro ou o gabarito ao agente.

1. Abra Carrinho e escolha **Receber em casa**.
2. Informe `99999-999` e clique em **Buscar endereço**.
3. O ViaCEP documenta a resposta `erro: true` para CEP inexistente. O adaptador da revisão defeituosa presume campos de endereço e lança TypeError: resposta 500, uma captura no Sentry do checkout com `scenario=CHK-004`.
4. Confira release, request ID e ausência de CEP/endereço/corpo/resposta bruta no evento. O erro aparece junto ao formulário; o rascunho é preservado.
5. A issue deve ser investigada e corrigida no checkout. Para dispatch manual, selecione CHK-004, que usa `.github/patchwork-chk004.json` sem encaminhamento.

## Gabarito e aceite

Tratar `erro: true` (inclusive representação textual) antes do mapeamento, retornando `404 POSTAL_CODE_NOT_FOUND`. Não usar CEP especial, fixture alterada, exceção suprimida ou fallback fictício. Transporte continua sendo 503 e formato inválido 422.

O teste de contrato usa servidor local e deve falhar antes e passar depois. O teste novo do agente precisa demonstrar regressão; os existentes são preservados. Não realizar merge ou deploy do reparo. Encerre processos iniciados.

Fonte do contrato externo: [ViaCEP](https://viacep.com.br/). O ensaio real deve ser pequeno; testes automatizados usam servidor simulado.
