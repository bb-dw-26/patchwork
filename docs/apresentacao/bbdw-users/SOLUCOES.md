# Soluções de referência

Material público para revisão e comparação. O agente pode consultá-lo, e esse uso deve aparecer no registro da avaliação. Não é obrigatório produzir o mesmo código; o comportamento e as evidências determinam a aceitação.

## USR-001 — Preferências ausentes

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Causa planejada:** O serviço acessa preferences.emailNotifications quando preferences é null.

**Correção de referência:** Aplicar os padrões documentados quando o objeto de preferências estiver ausente, preservando valores explícitos existentes.

**Regressões obrigatórias:**

- Cliente sem preferências recebe ambos os valores false.
- Cliente com emailNotifications=true preserva true.
- Cliente inexistente continua retornando 404.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.


## USR-002 — Cliente inexistente

**Escopo do cenário:** Complementar — fora da implementação obrigatória.

**Causa planejada:** O mapeador acessa name no resultado undefined de uma busca sem correspondência.

**Correção de referência:** Verificar o resultado da busca antes do mapeamento e produzir a resposta de domínio de cliente inexistente.

**Regressões obrigatórias:**

- ID inexistente retorna 404 e o envelope de erro.
- ID existente retorna perfil completo.
- O caminho normal de 404 não gera evento de erro inesperado no Sentry.

**Rejeitar:** captura genérica que esconde a falha, remoção do Sentry, remoção do caso da fixture ou alteração do contrato para acomodar o defeito.
