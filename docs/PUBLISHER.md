# GitHub App publicador

O App `bbdw-patchwork-publisher` publica branches, PRs e comentários em checkout, catalog e storefront. Suas permissões são Contents, Pull requests e Issues com leitura/escrita, além de Metadata: read. O App de encaminhamento continua separado e restrito a Issues.

Cada consumidor mantém `PATCHWORK_PUBLISH_APP_CLIENT_ID` e o secret `PATCHWORK_PUBLISH_APP_PRIVATE_KEY`. Nunca versionar a chave. Não há mudança nessas credenciais.

Após o CLI e uma execução aprovada de `check_command`, `actions/create-github-app-token@v3` emite um token para o repositório atual. O step de publicação faz commit e push da correção, abre um PR draft e comenta a issue com um resumo curto. A action revoga o token ao encerrar o job.

O Copilot usa `GITHUB_TOKEN` e não recebe o token nem a chave do App no seu step. Todos os steps compartilham o mesmo runner descartável; essa separação temporal não é isolamento entre processos ou máquinas.

Uma branch por issue e a busca de PRs existentes evitam duplicação. Não se faz force-push. Se o push tiver ocorrido e a abertura do PR falhar, revise a branch existente antes de repetir a publicação. Não há comparação de árvores nem pacote de evidências para retomar jobs.

PRs criados pelo App disparam o CI. A correção continua dependendo de revisão humana; não há merge ou deploy automático.

Referências: [action de token](https://github.com/actions/create-github-app-token) e [eventos disparados por tokens](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs).
