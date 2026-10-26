# GitHub App publicador

O App privado `bbdw-patchwork-publisher`, da organização `bb-dw-26`, publica branches, PRs e comentários nos repositórios `bbdw-checkout`, `bbdw-catalog` e `bbdw-storefront`.

Permissões de repositório: **Contents**, **Pull requests** e **Issues** com leitura e escrita; Metadata com leitura. Instalação apenas nos três aplicativos, sem webhooks, OAuth de usuário, acesso a Actions, secrets ou edição de workflows. O App de encaminhamento entre repositórios continua separado e restrito a Issues.

Cada consumidor configura a variável `PATCHWORK_PUBLISH_APP_CLIENT_ID` e o secret `PATCHWORK_PUBLISH_APP_PRIVATE_KEY`, com a chave PEM do App. Nunca versionar a chave. Para rotação, gerar uma nova chave, atualizar os três secrets, validar a emissão do token e revogar a chave anterior.

Somente `publish` usa esses dados, depois da validação independente. `actions/create-github-app-token` está fixado por SHA e emite um token limitado ao repositório chamador e às três permissões. O checkout usa o mesmo token para push; a API usa-o para abrir o PR e comentar. A action revoga o token ao encerrar o job, inclusive em falha. Agente e validador não recebem a chave nem esse token. O Copilot continua autenticado pelo `GITHUB_TOKEN`.

PRs publicados pelo App disparam o CI sem a aprovação especial exigida de PRs criados com `GITHUB_TOKEN`. Isso não aprova nem faz merge do PR. Regras de proteção e revisão permanecem aplicáveis.

Referências: [tokens de instalação](https://github.com/actions/create-github-app-token) e [comportamento de eventos do GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token#when-github_token-triggers-workflow-runs).
