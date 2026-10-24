# Avaliação da correção pelo agente

Este é um exercício público de reparo guiado. As soluções estão versionadas em `docs/SOLUCOES.md`; portanto, os resultados não constituem uma avaliação cega. Registrar se a sessão consultou as soluções. Instruções para não abrir o arquivo não garantem isolamento, pois o histórico e o repositório são públicos.

O roteiro, a agenda e a contingência da apresentação estão centralizados no [Patchwork](https://github.com/bb-dw-26/patchwork/blob/main/docs/ROTEIRO.md).

## Evidências por execução

Copiar este formulário para `evaluations/<cenario>-<execucao>.md` ao realizar um ensaio:

| Campo | Registro |
| --- | --- |
| Cenário e data | A preencher |
| Agente, modelo e versão da ferramenta | A preencher |
| Commit com defeito e base do PR | A preencher |
| Versões dos outros serviços | A preencher |
| Release, ambiente e ID da requisição | A preencher |
| Issue Sentry, issue GitHub, execução Actions e PR | Links reais |
| Entrada e resultado observado | A preencher |
| Consulta às soluções públicas | Sim, não observado ou desconhecido; apontar evidência |
| Teste falhando antes da correção | Comando, revisão e resultado |
| Teste passando depois da correção | Comando, revisão e resultado |
| Demais verificações | Resultados e limitações |
| Tempo e custo | Valores observados ou indisponível |
| Decisão do revisor | Aceito, parcial ou rejeitado; justificativa |

## Critérios

Atribuir de 0 a 2 em cada dimensão: 0 = ausente/incorreto, 1 = parcial, 2 = completo e comprovado.

1. Diagnóstico: relaciona o sintoma à causa no código.
2. Reprodução: demonstra a falha a partir do cenário documentado.
3. Correção: restaura o comportamento especificado e preserva os casos vizinhos.
4. Regressão: inclui teste que falha na revisão defeituosa e passa na corrigida.
5. Entrega: PR explica a mudança e apresenta verificações executadas e limitações.

Total de 0 a 10 é um resumo, não uma aprovação automática. Uma correção que remove instrumentação, altera dados para esconder o problema, enfraquece testes ou apenas engole a exceção deve ser rejeitada mesmo com pontuação alta. Implementações equivalentes à solução documentada são válidas.

## Repetibilidade

- Manter `main` como evolução saudável do projeto.
- Para CHK-001 e para qualquer cenário opcional que venha a ser implementado, preservar o defeito em uma branch `demo/<id-em-minusculas>` e registrar seu commit exato; criar tags de cenário quando a implementação existir.
- Introduzir um defeito por cenário. Não habilitar todas as falhas simultaneamente.
- Iniciar a tentativa a partir do commit defeituoso e direcionar o PR para a branch de cenário correspondente.
- CI normal valida o comportamento saudável. Na revisão defeituosa, uma falha esperada de regressão deve ser registrada como tal, nunca apresentada como teste aprovado.
- Após uma correção, repetir a avaliação em uma nova branch originada do commit defeituoso, preservando PRs e histórico anteriores.
- Validar a requisição corrigida e a telemetria, considerando o atraso de ingestão do Sentry.

O scaffold saudável e seus testes já existem. Branches defeituosas, tags de cenário e execuções do agente serão criadas na etapa de demonstração.
