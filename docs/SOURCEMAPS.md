# Publicação de source maps

O Patchwork mantém o comando de upload e a dependência `@sentry/cli`. Os apps mantêm o SDK de captura e a geração dos mapas durante o build.

Instale as dependências do Patchwork com `npm ci`. Gere o build na aplicação com `npm run build`. A partir do Patchwork, execute um dos comandos:

```sh
npm run sentry:upload -- ../bbdw-checkout
npm run sentry:upload -- ../bbdw-users
npm run sentry:upload -- ../bbdw-storefront
```

O argumento é a pasta da aplicação, relativa ao diretório atual ou absoluta. O comando carrega o `.env` dessa pasta quando existe; variáveis já exportadas têm precedência. Configure `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT`, cujo valor deve corresponder ao nome da aplicação. Nunca versione o token.

| Aplicação | Release | Build publicado |
| --- | --- | --- |
| checkout / users | `SENTRY_RELEASE` | `dist/src`, com prefixo `app:///src` |
| storefront | `VITE_SENTRY_RELEASE` | `dist`, com injeção de Debug IDs antes do upload |

Use a release do build que será executado. No storefront, sirva exatamente o `dist` processado pelo comando; não reconstrua depois da injeção. Não publique os arquivos `.map` no servidor web. O catálogo Go não usa esse upload.

O comando valida aplicação, projeto, release e presença do build antes de executar o CLI. Os testes do Patchwork simulam o CLI, sem publicar arquivos nem usar credenciais reais.
