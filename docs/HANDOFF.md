# Encaminhamento opcional

O padrão é corrigir no repositório atual. Apenas quando a investigação indicar outro responsável, o Copilot responde com `outcome: handoff`, `destination` e `summary`. Não cria arquivos de encaminhamento nem altera código local.

## Caminho no workshop

1. Checkout recebe a issue Sentry e investiga.
2. Se a hipótese apontar para storefront, o workflow cria uma issue vinculada no destino.
3. Storefront lê a hipótese e consulta o projeto Sentry de origem. Produz a correção e uma regressão pertinente.
4. Seu workflow executa a verificação uma vez e abre um PR em rascunho.

A issue de origem permanece aberta. O resumo separa comportamento observado, hipótese a confirmar e motivo do destino; a escolha da correção cabe à investigação no receptor. A resposta do agente não é uma instrução confiável nem uma conclusão obrigatória para o destino. Preserve o significado dos códigos de erro da aplicação, mesmo quando compartilham um status HTTP. Um incidente recebido não pode ser encaminhado novamente.

## Configuração e App

`handoff.targets` lista destinos autorizados. `handoff.sources` lista repositórios de origem com sua configuração Sentry. `receiveBranch`, quando usado, define a base do PR recebido; no workshop todas essas branches são `main`.

O encaminhamento reutiliza o App publicador já instalado em checkout e storefront, com `PATCHWORK_PUBLISH_APP_CLIENT_ID` e o secret `PATCHWORK_PUBLISH_APP_PRIVATE_KEY`. Não exige outro App ou chave. A variável `PATCHWORK_PUBLISH_BOT_ID` guarda o ID público do bot desse mesmo App, obtido uma vez com `gh api 'users/bbdw-patchwork-publisher[bot]' --jq .id`. O receptor confere esse ID e o tipo Bot retornados pela API de issues; não depende de consultar metadados de Apps privados com o token do Actions.

`actions/create-github-app-token@v3` emite um token limitado a Issues: write na origem e no destino após o CLI e revoga-o no encerramento do job. A publicação de PR usa outro token do mesmo App, emitido após a verificação e restrito ao repositório da correção. O token Sentry do receptor precisa ler o projeto de origem. O exemplo pressupõe repositórios públicos para a leitura da issue de origem com o token do receptor.

## Issue vinculada

A nova issue contém origem, link Sentry, hipótese curta e motivo do destino. Um marcador simples identifica a issue original; ele substitui o envelope assinado. O receptor confere identidade do App e origem no mapa. O título/corpo não autorizam publicação em destinos fora do mapa.

A deduplicação usa origem + número da issue + destino e inclui issues fechadas. Repetir a mesma origem não cria outro encaminhamento. O fluxo é serializado por repositório e issue.

O protocolo vale para novos encaminhamentos. Issues no formato assinado antigo não são convertidas; inicie um novo ensaio. Publique o motor na `main` antes dos consumidores. Não existe merge, deploy ou fechamento automático do incidente.

## Verificação

Os testes usam APIs simuladas para conferir origem, destino, duplicação e segundo salto. A consulta real ao Sentry e a instalação dos Apps dependem do ambiente do workshop; os testes locais não comprovam essas integrações.
