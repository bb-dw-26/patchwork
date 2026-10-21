# Patchwork

Um fluxo compartilhado para transformar incidentes em propostas de correção verificadas.

O Patchwork concentra a orquestração de GitHub Actions em um repositório independente. Cada aplicação chama o mesmo workflow e mantém um adaptador com suas regras: origem do incidente, arquivos permitidos, reprodução, testes e branch de destino.

```text
Repositório da aplicação
  issue / disparo manual
    → Patchwork: prepare → propose → validate → publish
                                                   → PR draft na aplicação
```

O motor de geração desta primeira versão é a Action oficial do Codex. O consumidor inicial é `bbdw-checkout`, com o cenário CHK-001 e incidentes da integração nativa do Sentry. Os demais repositórios podem reutilizar a orquestração depois de implementar seu adaptador; esta versão não os habilita automaticamente.

## Uso

Copie [examples/consumer.yml](examples/consumer.yml) para `.github/workflows/repair.yml` na aplicação. Mantenha os gatilhos e a política de autorização adequados ao seu projeto. A chamada ocorre no nível do job:

```yaml
jobs:
  patchwork:
    permissions:
      contents: write
      issues: read
      pull-requests: write
    uses: bbdw-gh-action/patchwork/.github/workflows/patchwork.yml@v1
    with:
      issue_number: ${{ format('{0}', github.event.issue.number || inputs.issue_number) }}
      adapter_path: scripts/agent-workflow.mjs
      node_version: '24'
      install_command: npm ci
      allow_bot_users: sentry[bot]
    secrets:
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

`v1` é a referência de conveniência da versão inicial. Para adoção controlada, fixe o SHA completo de uma versão revisada e atualize-o conscientemente. O repositório consumidor precisa permitir que o GitHub Actions crie pull requests. Configure os secrets no consumidor ou na organização com acesso concedido ao consumidor. Não use `secrets: inherit`: passe somente os secrets declarados acima.

Os checkouts pertencem à aplicação chamadora, não ao Patchwork. `github.workflow_sha` fixa o adaptador na revisão do workflow chamador; o SHA retornado por `prepare` fixa o código afetado pelo incidente. Assim, o agente trabalha no código afetado enquanto a validação e a publicação usam a automação confiável.

## Entradas

| Entrada | Padrão | Uso |
| --- | --- | --- |
| `issue_number` | obrigatório | Número positivo da issue no consumidor |
| `adapter_path` | `scripts/agent-workflow.mjs` | Adaptador Node relativo à raiz do consumidor |
| `node_version` | `24` | Node para o adaptador e para aplicações Node |
| `go_version_file` | vazio | Arquivo relativo à aplicação, por exemplo `go.mod`; habilita setup-go |
| `install_command` | `npm ci` | Instalação em `app`, antes do agente e antes da validação |
| `allow_bot_users` | vazio | Bots aceitos pela Action do agente; não substitui a autorização do adaptador |

`OPENAI_API_KEY` é obrigatório. `SENTRY_AUTH_TOKEN` é opcional para o workflow, mas obrigatório para o adaptador nativo do checkout. Ele só é disponibilizado em `prepare`; a chave do agente só é disponibilizada em `propose`.

Para uma aplicação Go, use `go_version_file: go.mod` e `install_command: go mod download`. O adaptador continua sendo Node sem dependências externas; seus comandos de validação podem executar Go. O suporte de instalação está disponível, mas o adaptador e um ensaio real do catálogo ainda precisam ser implementados.

`install_command` é código confiável do workflow consumidor. Nunca o preencha com texto de uma issue. Esta versão admite uma chamada ao Patchwork por execução: os artifacts têm os nomes fixos `incident`, `proposal` e `validation`; não use múltiplas chamadas ou matrix no mesmo run.

## Contrato do adaptador

O arquivo `.mjs` e seus imports devem estar versionados na revisão confiável do consumidor. Não há `npm ci` para o adaptador: use módulos nativos do Node e arquivos locais. `node <adaptador> <comando>` deve encerrar com código diferente de zero quando uma pré-condição falhar.

| Comando | Diretório atual | Entrada | Saída obrigatória |
| --- | --- | --- | --- |
| `prepare` | raiz confiável do consumidor | `ISSUE_NUMBER`, `GH_TOKEN`, contexto `GITHUB_*`, secret Sentry opcional | `$RUNNER_TEMP/incident.json`; `sha` e `issue` no arquivo `$GITHUB_OUTPUT` |
| `prompt` | workspace com `automation/` e `app/` | `incident.json` | `$RUNNER_TEMP/prompt.md` |
| `export` | mesmo workspace de `propose` | código alterado em `app/`, `BASE_SHA` | `$RUNNER_TEMP/candidate.patch` |
| `validate` | outro runner, `automation/` confiável e `app/` no SHA afetado | `candidate.patch`, `BASE_SHA` | `validation.md` e `regression-before.log` em `$RUNNER_TEMP` |
| `publish` | outro runner, mesmos diretórios | patch, relatório, validação, `BASE_SHA`, `ISSUE_NUMBER`, `GH_TOKEN` | PR draft e link no `$GITHUB_STEP_SUMMARY` |

O relatório `$RUNNER_TEMP/report.md` é produzido pela Action do agente. Os artifacts ficam disponíveis por sete dias, incluindo relatório e evidências disponíveis quando um job falha.

Responsabilidades obrigatórias do adaptador:

- `prepare`: validar autor e iniciador, estado e labels da issue, projeto e release do incidente e ausência de proposta anterior. A issue é evidência não confiável. Retornar o SHA completo do commit afetado e o mesmo número de issue recebido.
- `prompt`: definir escopo, orientar a reprodução e tratar conteúdo do incidente como dados; proibir commit, push, merge e deploy pelo agente.
- `export`: exportar somente a proposta, sem executar código gerado pelo agente.
- `validate`: rejeitar arquivos fora do escopo, alterações indevidas em testes existentes e modos de arquivo não permitidos; provar que um teste novo falha antes da correção e passa depois; executar as verificações do projeto.
- `publish`: exigir todos os artifacts, revalidar escopo e base, preservar branches existentes e abrir PR draft sem executar código da proposta. Tratar retries sem force-push ou duplicação de PRs.

O adaptador atual do checkout é a implementação de referência desses comandos. Suas regras fixas de CHK-001 continuam no checkout; não copie essas regras para outros serviços sem adaptá-las e testá-las.

## Isolamento e operação

Cada etapa usa um runner separado. `prepare` lê GitHub e, quando necessário, Sentry. `propose` e `validate` têm apenas leitura no GitHub e checkouts sem credenciais persistidas. Somente `publish` recebe escrita em conteúdo e PRs; esse job não instala nem executa a aplicação. O adaptador confiável ainda é código privilegiado e deve ser revisado.

O chamador precisa conceder o teto de permissões mostrado no exemplo; o workflow compartilhado restringe cada job. Não há merge ou deploy automáticos. PRs criados com `GITHUB_TOKEN` não iniciam outro workflow de PR: a validação independente ocorre antes da publicação. Para verificar novamente o PR, use o CI manual da aplicação.

A concorrência é serializada por repositório e issue, sem cancelar o trabalho atual. O adaptador deve validar novamente duplicidade quando uma execução enfileirada começar. Evite repetir o mesmo grupo de concorrência no workflow chamador.

Se a publicação falhar depois do push, use **Re-run failed jobs** enquanto os artifacts existirem. O adaptador de referência confere que a base e a proposta remota continuam iguais antes de retomar.

## Verificação do projeto

```sh
python -m pip install -r tests/requirements.txt
python -m unittest discover -s tests -v
go run github.com/rhysd/actionlint/cmd/actionlint@v1.7.12 .github/workflows/*.yml examples/consumer.yml
```

Os testes verificam as entradas executando os guards em Node, a correspondência da issue e do SHA e a separação de permissões, credenciais e código executado. Não chamam modelos, Sentry ou GitHub. O CI também verifica os YAMLs com actionlint. O ensaio completo com agente e PR depende dos secrets e do incidente elegível no consumidor.

## Referências

- [Workflows reutilizáveis no GitHub Actions](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [Action do agente usada nesta versão](https://github.com/openai/codex-action)
