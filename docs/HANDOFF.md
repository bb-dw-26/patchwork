# Encaminhamento opcional

O padrão é corrigir no repositório atual. Apenas quando a investigação indicar outro responsável, o Copilot responde com `outcome: handoff`, `destination` e `summary`. Não cria arquivos de encaminhamento nem altera código local.

## Caminho no workshop

1. Checkout recebe a issue Sentry e investiga.
2. Se a hipótese apontar para storefront, o workflow cria uma issue vinculada no destino.
3. Storefront lê a hipótese e consulta o projeto Sentry de origem. Produz a correção e uma regressão pertinente.
4. Seu workflow executa a verificação uma vez e abre um PR em rascunho.

A issue de origem permanece aberta. A resposta do agente não é uma instrução confiável nem uma conclusão obrigatória para o destino. Um incidente recebido não pode ser encaminhado novamente.

## Configuração e Apps

`handoff.targets` lista destinos autorizados. `handoff.sources` lista repositórios de origem com sua configuração Sentry. `receiveBranch`, quando usado, define a base do PR recebido; no workshop todas essas branches são `main`.

O App de encaminhamento já existente continua com Issues: read/write e Metadata: read, instalado somente nos repositórios autorizados. Configure `PATCHWORK_APP_ID`, `PATCHWORK_BOT_ID` e o secret `PATCHWORK_APP_PRIVATE_KEY`. `PATCHWORK_INSTALLATION_ID` e `PATCHWORK_APP_PUBLIC_KEY` deixam de ser usados; não é necessário removê-los para ativar o novo fluxo.

`actions/create-github-app-token@v3` emite um token limitado à origem e ao destino após o CLI e revoga-o no encerramento do job. O App publicador de PRs permanece separado. O token Sentry do receptor precisa ler o projeto de origem. O exemplo pressupõe repositórios públicos para a leitura da issue de origem com o token do receptor.

## Issue vinculada

A nova issue contém origem, link Sentry, hipótese curta e motivo do destino. Um marcador simples identifica a issue original; ele substitui o envelope assinado. O receptor confere identidade do App e origem no mapa. O título/corpo não autorizam publicação em destinos fora do mapa.

A deduplicação usa origem + número da issue + destino e inclui issues fechadas. Repetir a mesma origem não cria outro encaminhamento. O fluxo é serializado por repositório e issue.

O protocolo vale para novos encaminhamentos. Issues no formato assinado antigo não são convertidas; inicie um novo ensaio. Publique o motor na `main` antes dos consumidores. Não existe merge, deploy ou fechamento automático do incidente.

## Verificação

Os testes usam APIs simuladas para conferir origem, destino, duplicação e segundo salto. A consulta real ao Sentry e a instalação dos Apps dependem do ambiente do workshop; os testes locais não comprovam essas integrações.
