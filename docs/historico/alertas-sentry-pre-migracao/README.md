# Exports de alertas Sentry anteriores à migração

Os quatro JSON foram transferidos dos apps sem alterar seu conteúdo. Registram a integração anterior, incluindo destinos `bbdw-gh-action/*` e IDs daquela configuração. São referência histórica, não configuração pronta para aplicar em `bb-dw-26`.

| Aplicação | Export preservado |
| --- | --- |
| checkout | [bbdw-checkout.json](bbdw-checkout.json) |
| users | [bbdw-users.json](bbdw-users.json) |
| catalog | [bbdw-catalog.json](bbdw-catalog.json) |
| storefront | [bbdw-storefront.json](bbdw-storefront.json) |

Para configurar a integração atual, conferir no Sentry a instalação GitHub, o repositório de destino e os IDs de integração. O [contrato do consumidor](../../../README.md#disparo-e-integração-sentry) define os labels e as verificações do workflow. Esta limpeza não alterou regras remotas.
