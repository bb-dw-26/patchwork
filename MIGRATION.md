# Migração para bb-dw-26 — 24/10/2026

## Transferência concluída

Os cinco repositórios foram transferidos, públicos, sem recriação. IDs, branches e tags remotos foram comparados antes/depois e permaneceram iguais. Remotes locais já apontam para `bb-dw-26`.

| Repositório | ID preservado |
| --- | --- |
| patchwork | 1428582033 |
| bbdw-users | 1427279147 |
| bbdw-catalog | 1427279274 |
| bbdw-checkout | 1427279410 |
| bbdw-storefront | 1427279532 |

`demo/chk-001` mantém o SHA `458c5fcb9145acff7ecf1b1d826ee9d2d7dd2e79`. A issue #2 do checkout continua aberta, criada por `sentry[bot]`, com `sentry` e `agent:repair`. Os quatro consumidores tinham `SENTRY_AUTH_TOKEN` antes da transferência; a API de secrets agora retorna 403, portanto a preservação dos valores ainda precisa ser conferida por um administrador. GitHub documenta a preservação de secrets de repositório na transferência.

O incidente Sentry `BBDW-CHECKOUT-3` (7804900673) continua acessível em `bbdw-workshop-jj`, no mesmo projeto 4512294853869568. A anotação existente ainda aponta para o endereço anterior da issue. Não foram alterados projetos, DSNs, eventos ou regras Sentry. A instalação do App e o roteamento para a nova organização ainda não foram validados.

## Bloqueio atual

Após a transferência, a API retornou `pull: true`, `push: false`, `admin: false` para EnzCampos nos cinco repositórios. A transferência não preservou seu papel de administrador da organização anterior. Push, publicação, configuração de secrets e disparo de Actions dependem da concessão de acesso na nova organização. Não foram criados forks ou cópias substitutas.

A v3 e as referências dos consumidores estão preparadas localmente. Não há release v3 publicada, execução autenticada do Copilot nem PR produzido pelo agente. Os workflows remotos ainda são da v2 e contêm referências à organização anterior; não considerar o reparo remoto operacional após a transferência até publicar a atualização.

## Liberações com o owner — segunda-feira, 26/10

1. Conceder **Write** a EnzCampos nos cinco repositórios para publicar e executar workflows; **Admin** ou intervenção do owner será necessária para ajustes de configuração e secrets.
2. Habilitar **Allow use of Copilot CLI billed to the organization**, conferir modelos e confirmar se o benefício de créditos cobre automação SDK/CLI cobrada diretamente à organização. Não presumir cobertura a partir de licenças pessoais.
3. Conferir políticas de Actions, uso do workflow compartilhado, `copilot-requests: write` e criação de PRs pelo Actions.
4. Instalar/autorizar o App Sentry para os quatro aplicativos em `bb-dw-26`; reconectar a integração GitHub na organização Sentry existente e revisar destinos das regras. Preservar projetos e DSNs.
5. Conferir `SENTRY_AUTH_TOKEN` nos consumidores. Não é necessário `OPENAI_API_KEY` nem PAT para Copilot.

## Ordem de publicação e aceite

1. Publicar o commit local da v3 no Patchwork e executar CI Linux. Exigir os testes Node, Go com race, Playwright, contratos do workflow, smoke offline e verificação do launcher Linux.
2. Disparar `copilot-smoke.yml`, sem modelo explícito inicialmente. Uma resposta mínima verifica o token e registra o modelo; conferir no billing a atribuição à organização. Erro 403 é dependência administrativa, não motivo para fallback pessoal.
3. Após CI e smoke aprovados, publicar `v3.0.0` e `v3` na revisão validada. Os consumidores devem usar o SHA completo dessa revisão (atualizar os pins caso o commit mude), nunca uma tag móvel.
4. Publicar as mudanças dos quatro consumidores e executar seus CIs. Não misturar alterações de interface feitas por trabalhos simultâneos com a migração.
5. Com a integração Sentry reconectada, testar o reparo da issue #2 via `workflow_dispatch` no checkout. Depois validar um evento CHK-001 elegível criando issue nativa no destino novo, respeitando a deduplicação.
6. Exigir leitura do MCP, patch dentro do escopo, teste novo falhando antes e passando depois, CI independente e PR draft. Não fazer merge nem deploy automático.

## Verificação local

- SDK 1.0.26 instalado com runtime 1.0.103; handshake offline real concluído, sem autenticação nem inferência.
- Testes do adaptador cobrem credenciais ausentes/recusadas, política com aprovação humana, MCP indisponível, relatório vazio, redaction, timeout, cancelamento e cleanup.
- Regressões reais do Patchwork para Node e Playwright verificadas; Go com race permanece no CI Linux, pois esta máquina Windows não dispõe do compilador C necessário.
- Users e checkout: lint, tipos, build e testes aprovados. Catalog: vet, testes e build aprovados usando `.tools/go/bin/go.exe`.
- Storefront: lint e build aprovados; os 14 testes atuais de Playwright passaram com configuração temporária na porta 3117. A porta padrão 3100 estava em uso por trabalho simultâneo. As alterações de interface/testes desse trabalho foram preservadas e não fazem parte da migração.
- MCP Sentry real: conectado, três ferramentas esperadas disponíveis, consulta ao projeto e leitura do incidente concluídas com o lockfile atualizado. Nenhuma inferência foi feita com credenciais pessoais.
- `npm audit --omit=dev` do Patchwork: zero vulnerabilidades após overrides de Zod 4.6.6 e body-parser 2.4.0.
- actionlint 1.7.12 não conhece os contextos de identidade de workflow nem `copilot-requests`; somente esses diagnósticos específicos são ignorados, com testes explícitos do contrato.

## Referências

- [Transferências GitHub](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository)
- [Copilot SDK e GITHUB_TOKEN](https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/server-to-server-tokens)
- [Cobrança do Copilot no Actions](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions)
