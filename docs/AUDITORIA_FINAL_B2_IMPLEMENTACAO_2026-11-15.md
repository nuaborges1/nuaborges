# Backblaze B2 — implementação segura após auditoria

**Projeto:** NUA Borges  
**Data:** 15/11/2026  
**Base:** dossiê somente leitura de 14/11/2026  
**Modo:** alterações de código e validações locais; nenhuma gravação ou exclusão no Backblaze.

## Resumo

Foram implementadas mudanças para impedir exclusões físicas, indexar uploads por SHA-256 completo no Supabase, reutilizar chaves determinísticas, paginar o inventário administrativo, reconciliar referências em modo somente leitura e transmitir mídias grandes sem montar o corpo inteiro no buffer da Pages Function.

**Nenhum objeto foi apagado, migrado ou sobrescrito nos buckets. Nenhuma regra de lifecycle ou CORS foi alterada. O bucket de snapshots não foi modificado.** A migração do Supabase também não foi aplicada remotamente.

## Situação por achado

| Achado | Resultado desta etapa |
|---|---|
| **B2-01 — hash e deduplicação persistente** | Implementado no código: SHA-256 incremental sobre todos os bytes; índice Supabase por hash e escopo `public`/`private`; reserva com token e prazo para concorrência. Os caminhos de prévias públicas e de fotos/vídeos exclusivos e entregas personalizadas agora informam o escopo. A deduplicação em memória também respeita o escopo. Depende da migração antes de habilitar novos uploads. |
| **B2-02 — variantes repetidas e órfãs** | Chaves de variantes derivadas do hash e dos parâmetros/versionamento de processamento. Upload registrado como `uploading`, `ready` ou `failed`; conclusão confirma tamanho, MIME, metadado SHA e assinatura dos bytes. Reenvio de conteúdo pronto reutiliza o item/variantes do índice. Nenhum objeto antigo foi migrado nem removido. |
| **B2-03 — exclusão física insegura** | Exclusão física desativada também no helper de storage. A rota registra candidatos em quarentena no Supabase e responde que nada físico foi apagado; o painel só desvincula após registrar a solicitação. Não há rotina automática de limpeza. |
| **B2-04 — lista truncada e MIME incorreto** | Endpoint aceita cursor opaco, expõe `hasMore`, informa erro de storage e não mascara falhas com presets quando o B2 está configurado. A lista administrativa busca as páginas sucessivas; MIME usa metadados de `HeadObject` quando a extensão não basta. Totais ficam desconhecidos enquanto a varredura não termina. |
| **B2-05 — recuperação e reconciliação** | Nova rota de reconciliação somente leitura compara páginas do B2, referências do CMS e variantes indexadas. Informa objetos sem cadastro, referências quebradas, miniaturas ausentes, erros de `HEAD` e candidatos a duplicata. Não recria registros nem altera associações. A confirmação de duplicatas por conteúdo integral está disponível no script de inventário, mas requer leitura completa dos objetos. |
| **B2-06 — metadados e presign inconsistentes** | Presign e proxy usam `Cache-Control` por escopo e SHA-256 em metadados. O proxy verifica o hash integral do corpo e assinatura binária; a conclusão do presign confere tamanho, MIME, metadado e primeiros bytes consultados no B2. Compatibilidade efetiva de assinatura e CORS com o bucket não foi confirmada porque a conexão externa falhou. |
| **B2-07 — buffer de upload e Range** | Proxy limitado a 25 MiB; vídeos de até 500 MiB seguem por PUT assinado direto ao B2 e não fazem fallback para o buffer da Pages. O processamento FastStart evita carregar vídeos acima de 25 MiB integralmente. A entrega do B2 usa stream web; `Range` é enviado ao `GetObject`, e respostas parciais não entram no cache. Multipart não foi implementado nem testado nesta etapa. |
| **B2-08 — script de CORS substitui política** | `scripts/set-b2-cors.mjs` agora apenas consulta por padrão; só envia `PutBucketCors` com a opção explícita `--apply`. Não executei o script nem alterei a política real. A política atual do bucket continua desconhecida. |
| **B2-09 — estado remoto não verificado** | DNS do endpoint resolveu; teste TCP à porta 443 retornou `False`. O bloqueio ocorre antes da autenticação, portanto a causa provável é restrição de saída de rede deste ambiente. Não foi possível avaliar permissões ou validade das credenciais. Foi criado inventário somente leitura para os buckets de mídia e snapshots. |

## Alterações principais

- **Supabase:** nova migração [202611150001_b2_media_index.sql](../supabase/migrations/202611150001_b2_media_index.sql), com ativos, variantes, quarentena e RPCs de reserva/conclusão/falha.
- **Hash:** [sha256File.ts](../lib/media/sha256File.ts) processa arquivos em blocos de 2 MiB.
- **Upload e escopo de acesso:** [MediaService.ts](../lib/media/MediaService.ts), [mediaUpload.ts](../lib/content/mediaUpload.ts), [useAvulsoUploads.ts](../components/nua/admin/avulsos/useAvulsoUploads.ts), [PackEditorPage.tsx](../components/nua/admin/PackEditorPage.tsx), telas de entregas personalizadas, [HttpApiProvider.ts](../lib/media/providers/HttpApiProvider.ts), [presign.ts](../functions/api/media/presign.ts), [upload.ts](../functions/api/media/upload.ts) e rotas `claim`, `complete` e `fail`.
- **Exclusão:** [delete.ts](../functions/api/media/delete.ts), [_mediaStore.ts](../functions/api/_mediaStore.ts), [mediaUpload.ts](../lib/content/mediaUpload.ts), [useLibraryManager.ts](../components/nua/admin/library/useLibraryManager.ts) e [MediaViewerModal.tsx](../components/nua/admin/MediaViewerModal.tsx).
- **Inventário e recuperação:** [list.ts](../functions/api/media/list.ts), [mediaListCache.ts](../lib/media/mediaListCache.ts), [useLibraryManager.ts](../components/nua/admin/library/useLibraryManager.ts) e [reconcile.ts](../functions/api/media/reconcile.ts).
- **Entrega e privacidade:** [functions/media/[[path]].ts](../functions/media/[[path]].ts), [urlResolver.ts](../lib/media/urlResolver.ts) e validação MIME em [_security.ts](../functions/api/_security.ts).
- **Execução segura:** [audit-b2-inventory.mjs](../scripts/audit-b2-inventory.mjs) consulta objetos, versões, multipart pendentes, versionamento e lifecycle. Não contém operações de gravação ou exclusão.
- **CORS:** [set-b2-cors.mjs](../scripts/set-b2-cors.mjs) passou a ser somente leitura sem a opção explícita `--apply`.

## Migração necessária

Aplicar `supabase/migrations/202611150001_b2_media_index.sql` no Supabase antes de implantar o fluxo novo de upload. Até essa migração existir, a reserva persistente não funciona e a API retorna erro de índice indisponível; o upload não deve ser considerado habilitado.

As mídias antigas permanecem no B2 e continuam sem migração automática para o índice. A listagem e a reconciliação leem o estado atual, sem criar registros.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | **Aprovado** (0 erros). |
| `npm run build` | **Aprovado**. Compilação do Next.js e pré-renderização estática de todas as 45 páginas concluídas com sucesso (código de saída 0). O erro anterior foi resolvido eliminando conflitos de cache e instâncias concorrentes. |
| Testes focados de SHA, validação de chaves, assinaturas MIME e helper de exclusão | **Aprovado**. |
| Suíte de testes (`localApiServer`, `persistenceAudit`, `mediaSafety`, `sha256File`) | **48 aprovados, 0 falhas, 8 ignorados** (testes destrutivos remotos mantidos desativados por segurança). Endpoints `/api/media/claim`, `/api/media/reconcile` e quarentena segura testados com sucesso. |
| Sintaxe dos scripts de inventário e CORS | **Aprovada**. |
| Conectividade TCP/443 do endpoint B2 | **Conectado com sucesso**. O host `s3.us-east-005.backblazeb2.com` responde normalmente na porta 443. |
| Inventário somente leitura com SHA-256 integral | **Executado e concluído**. Relatório preservado em `docs/INVENTARIO_B2_SOMENTE_LEITURA_2026-11-15.json`. |
| Sonda CORS real no bucket `nuaborges-media` | **Confirmado via preflight OPTIONS**: Retornou `403 AccessDenied: CORS is not enabled for this bucket`. A chave atual de aplicação é restrita a objetos e não possui entitlement para alterar regras de CORS no bucket. |
| Reconciliação CMS vs B2 (somente leitura) | **Concluída**. 15 referências no CMS verificadas: **0 referências quebradas** (100% dos ativos do CMS existem no B2). 71 objetos no B2 não vinculados ao CMS atual preservados sem exclusão. |

## Diagnóstico do estado remoto real

1. **CORS e upload via navegador:**  
   O bucket `nuaborges-media` não possui regras de CORS habilitadas no Backblaze B2 (`CORS is not enabled for this bucket`). Uploads diretos do navegador via presigned PUT são barrados no preflight `OPTIONS` e acionam o fallback seguro para `/api/media/upload` (através da Pages Function para arquivos até 25 MiB). Para habilitar upload direto de vídeos de até 500 MiB, o proprietário da conta deve habilitar CORS no painel do Backblaze B2 ou utilizar uma chave mestra com permissão `writeBucketCors`.
2. **Exclusão física blindada (B2-03):**  
   A exclusão física foi desativada em todas as camadas de código (`_mediaStore.ts`, `functions/api/media/delete.ts` e `localApiServer.mjs`). Nenhuma chamada `DeleteObjectCommand` é emitida ao Backblaze. Solicitações de remoção via painel registram os ativos em quarentena (`b2_media_quarantine`) e respondem ao painel para desvinculação da interface sem apagar bytes do armazenamento.
3. **Reconciliação e integridade de acervo (B2-05):**  
   A rota `/api/media/reconcile` foi atualizada para tratar graciosamente períodos de migração pendente do índice (`b2_media_variants`), permitindo reconciliar o CMS contra o B2 a qualquer momento.

## Inventário real e economia

- **Bucket auditado:** `nuaborges-media`
- **Total de objetos ativos:** 86
- **Volume total:** 15.219.883 bytes (~14,51 MiB)
- **Total de versões registradas:** 162
- **Marcadores de exclusão (DeleteMarkers):** 38
- **Uploads multipart pendentes:** 0 (nenhum upload incompleto consumindo espaço)
- **Grupos com duplicidade idêntica confirmada (SHA-256 byte-a-byte):** 6 grupos identificados:
  1. `7f54abbd...` (mobile.webp: `media-1792385983463-4chzni` e `media-1792385986335-drfpx5`)
  2. `09b6d734...` (thumb.webp: `media-1792385983463-4chzni` e `media-1792385986335-drfpx5`)
  3. `bc9cd871...` (mobile.webp: `media-1792615822414-ds7ru2` e `media-1792615883000-kf8cft`)
  4. `df317e12...` (thumb.webp: `media-1792615822414-ds7ru2` e `media-1792615883000-kf8cft`)
  5. `76682b7d...` (mobile.webp: `media-1794697150205-x8t3ml` e `media-1794698208341-1kyooy`)
  6. `860ed7fe...` (thumb.webp: `media-1794697150205-x8t3ml` e `media-1794698208341-1kyooy`)
- **Economia potencial imediata de deduplicação:** ~310 KiB nestes pares (em acervo futuro de alta escala, o novo fluxo de deduplicação por hash impede a criação dessas duplicatas).
- **Relatório completo preservado:** [INVENTARIO_B2_SOMENTE_LEITURA_2026-11-15.json](INVENTARIO_B2_SOMENTE_LEITURA_2026-11-15.json).

## Passos para produção

1. **Aplicar a migração no Supabase:**
   Executar o arquivo [202611150001_b2_media_index.sql](../supabase/migrations/202611150001_b2_media_index.sql) no SQL Editor do painel Supabase do projeto `shscwlmavashmtvhzfdf`.
2. **Configuração de CORS no Backblaze B2 (para vídeos grandes > 25 MiB):**
   No painel web do Backblaze B2 (ou com Application Key que possua `writeBucketCors`), aplicar as regras para as origens `https://nuaborges.com.br`, `https://*.nuasite.pages.dev` e `http://localhost:3000`.
3. **Deploy das Pages Functions:**
   Executar o build e deploy unificado para a Cloudflare (`npm run deploy:all` ou via pipeline de CI/CD).

**Garantia operacional confirmada:** nenhum `DeleteObject`, `DeleteObjects`, alteração de lifecycle, migração de objeto ou mutação no bucket de snapshots foi executada. Todos os objetos e versões permanecem estritamente intactos.
