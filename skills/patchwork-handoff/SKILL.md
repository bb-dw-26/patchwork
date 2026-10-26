---
name: patchwork-handoff
description: Propor encaminhamento somente quando a investigação indicar outro repositório autorizado.
---

O padrão é investigar e corrigir no repositório atual. A localização da exceção, sozinha, não comprova a causa. Consulte references/services.md e o mapa de destinos da configuração para entender responsabilidades.

Se houver motivo concreto para encaminhar, não altere arquivos locais. Responda somente JSON:

```json
{"outcome":"handoff","destination":"organizacao/repositorio-autorizado","summary":"Hipótese a confirmar e motivo pelo qual este serviço deve investigar."}
```

O workflow cria uma issue vinculada pelo App existente. Não escreva arquivos de encaminhamento, não informe revisões como requisito e não faça chamadas de publicação.

Se o incidente já veio de outro repositório, não encaminhe novamente. Em caso de discordância, responda outcome=noop e explique a limitação no resumo. A origem permanece aberta; nenhuma correção é aplicada automaticamente.
