# Auditoria de prontidão da NUA Borges

11/11/2026 · Meta de publicação até 31/12/2026

A cópia local em nuasite, baseada em 99d77c4, tem alterações anteriores em andamento. A prontidão para produção ainda depende dos itens abaixo.

| Prioridade | Área | Evidência local | Critério de aceite |
| --- | --- | --- | --- |
| P0 | Stripe | O webhook aceitava eventos sem assinatura. Corrigido localmente em functions/api/webhooks/stripe.ts. O marcador de idempotência ainda é gravado antes da persistência e alguns erros são suprimidos. | Verificar segredo, valor, moeda, vínculo e estado antes de liberar. Reentrega após falha de banco conclui a atualização uma única vez. |
| P0 | Conteúdo pago | functions/media/[[path]].ts classifica a privacidade pelo caminho e aceita vínculo por trecho do nome do objeto. | Conferir inventário de originais no B2, CDN e artefato. Autorizar por chave exata, com expiração no servidor. Prévia pública continua disponível. |
| P1 | Upload e imagens | functions/api/media/presign.ts pode retornar 200 com fallback sem URL. lib/media/MediaService.ts usa fallback local em desenvolvimento e impressão digital parcial em alguns casos. | Upload real em Safari e Chrome. Falha parcial e reenvio não deixam registros sem arquivo. Confirmar deduplicação e versões miniatura, móvel e completa. |
| P1 | Vídeo e CDN | functions/api/_mediaStore.ts lê o objeto inteiro e a rota só corta o Range depois disso. HEAD usa o mesmo handler. O resolver preserva URLs absolutas antigas. | Streaming com Range na origem, HEAD sem corpo, seek no iPhone e cache somente para mídia pública. Verificar DNS, TLS, CORS e referências antigas. |
| P1 | Banco | Não localizei migrações SQL versionadas para o esquema principal nas áreas inspecionadas. A API usa credencial privilegiada. | Versionar esquema, constraints e políticas. Verificar acesso por papel e restaurar backup em ambiente separado. Testar criação, edição, ordenação, publicação e exclusão após recarregar. |
| P1 | Vitrine e SEO | app/avulsos/[slug]/page.tsx usa snapshot no build. functions/_middleware.ts serve página genérica para slugs dinâmicos. A sincronização do build mantém o snapshot se falhar. | Pack recém-publicado aparece por acesso direto. Slug ausente ou despublicado retorna 404 real. Canonical, OG e sitemap acompanham catálogo publicado. |
| P1 | Agenda e cobrança | create-pix.ts mantém preços de fallback. A exigência de segredo Mercado Pago depende da identificação do ambiente como produção. | Cobrar valor persistido. Testar concorrência da agenda, estados de personalizados e recuperação de acesso. Validar Mercado Pago da mensalidade separado do Stripe das vendas. |
| P1 | Admin | prepareDeploys.mjs redirecionava subrotas do admin separado à raiz. Regra removida localmente. O shell também gera URLs sem prefixo no subdomínio. | Abrir módulo por URL, recarregar e usar Voltar no domínio oficial e no subdomínio ativo. No iPhone, publicar um pack, tratar um pedido e mudar horários. |
| P1 | Build e deploy | npm run build parou no download de três famílias do Google Fonts bloqueado pela rede deste ambiente. | Build reproduzível, pacotes Pages verificados e versão de rollback identificada. Avaliar adoção de fontes locais. |

## Operação do painel

Priorizar Conteúdos & Packs, Pedidos personalizados e Chamadas. Em Packs, organizar a sequência de seleção de mídia, prévia, rascunho e publicação. Mostrar erro de sincronização junto ao item. Em Pedidos e Chamadas, trazer primeiro as pendências e a próxima ação. Agrupar capa, galeria e páginas em Editar meu site. Financeiro fica voltado às vendas, com Mensalidade do site em atalho próprio. Contratos, cofre e configurações ficam fora da rotina comercial. Player e IA aparecem como descrição beta, com operação limitada ao ambiente local.

## Cronograma proposto

| Prazo | Entrega |
| --- | --- |
| 20/11 | Verificar deploy e segredos ativos, conter os dois P0 e recuperar build. |
| 04/12 | Aceite de B2, CDN, imagens, vídeo e persistência no Supabase. |
| 11/12 | Aceite de checkout, e-mail e OTP, acesso pago, agenda, personalizados e mensalidade. |
| 18/12 | Teste com a cliente no Safari do iPhone e Mac. Aceite de vitrine, SEO, acessibilidade e painel. |
| 21 a 23/12 | Publicação após aceite, com backup e rollback. |
| 24 a 31/12 | Reserva para observar e corrigir falhas de upload, mídia, pagamentos e e-mail. |

## Validação desta rodada

TypeScript completo passou. A suíte selecionada teve 52 testes aprovados e oito testes de persistência externa pulados. Corrigi o teste da agenda que usava datas vencidas. Três checagens isoladas confirmaram 503 sem segredo e 401 com assinatura ausente ou inválida no handler Stripe. O build e o HTTP público ficaram bloqueados pela conectividade deste ambiente. A falha de resolução do CDN daqui não estabelece indisponibilidade externa. Ainda faltam aceite autenticado de infraestrutura, testes reais em homologação e validação do pacote publicado.

## Referências

- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Backblaze B2 CORS](https://www.backblaze.com/docs/cloud-storage-cross-origin-resource-sharing-rules)
- [Cabeçalhos Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/headers/)

