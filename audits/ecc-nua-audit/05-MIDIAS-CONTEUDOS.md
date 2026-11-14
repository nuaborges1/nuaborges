# Mídias e conteúdos comerciais

Achado P0 NUA-SEC-001 está detalhado em [segurança](02-SEGURANCA.md): namespace de arquivos do pack não aciona proteção de mídia privada, serializer mantém URLs exclusivas e prova sintética de GET anônimo recebeu 200 com cache compartilhado. Configuração real de bucket e distribuição não foi consultada.

## Mapa e fluxo observado

Frontend usa `lib/media/MediaService.ts`, providers S3/B2, `functions/api/media/{presign,upload,list,delete}.ts` e entrega por `functions/media/[[path]].ts`. B2 compatível com S3 é inferido da configuração/código; ACL, lifecycle, CORS, egress, range e CDN real dependem do ambiente. Configurações Wrangler definem três saídas Cloudflare Pages, não provam deploy ativo.

O fluxo de upload usa presign/fallback multipart; testes de arquitetura contêm verificação real externa destrutiva PUT/GET/DELETE e foram deliberadamente excluídos. Não se atestam formatos, limites, retry, cancelamento, Safari ou processamento real. O teste de layout Range em arquivo é uma simulação, sem request HTTP ao servidor. Desduplicação/refcount de arquivos compartilhados e deleção segura requerem verificação.

## Cobertura e risco

Confirmar namespace privado desde o upload, ACL privada, expiração e vínculo de URL ao entitlement; conferir cache do objeto e invalidar cópias existentes. URLs opacas não equivalem a autorização. Não há inventário de objetos, órfãos, metadados, thumbnails nem links antigos. Mídia apagada do banco pode continuar em bucket/CDN — condição não verificada.

Alterações prováveis: seleção/upload, canonicalização de conteúdo, media handler e regras CDN. Testes pós-correção: anônimo negado, cliente com compra do item correto autorizado, outro item negado, revogação, cache/Range/Safari e exclusão segura em staging.
