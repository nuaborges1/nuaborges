# NUA Borges | Dossiê de estabilização e entrega
**11 de novembro de 2026 · Revisão de produção, código e plano de migração até 31 de dezembro**

## 1. Diagnóstico e decisões

A home publicada tem imagens quebradas no carrossel **Fragmentos da intimidade**. A API de publicação pode declarar sucesso sem gravar no Supabase. O checkout e o Financeiro comercial ainda têm dependências do Stripe no código local. A migração precisa alterar cobrança, confirmação, acesso e conciliação. Trocar só o endereço do webhook deixa o Pix antigo e a contabilidade comercial no Stripe.

Arquitetura definida pelo proprietário: **Cloudflare para deploy e proxy, Supabase PostgreSQL para dados, Backblaze B2 para mídia e Mercado Pago em duas contas independentes**. As Pages Functions atuais executam APIs, webhooks e proxy. Isso é computação na camada de hospedagem. O TOML do site não declara bindings de KV, D1 ou R2. A versão publicada, as regras da zona, os segredos, o bucket e o esquema remoto não foram inspecionados por dentro.

| Prioridade | Trabalho | Resultado exigido |
| --- | --- | --- |
| P0 | Carrossel público | Todas as imagens ativas renderizam durante a volta inteira da esteira e na abertura da foto. |
| P0 | Publicação | Sucesso aparece só após gravação confirmada. Site e painel mostram a mesma revisão publicada. |
| P0 | Mercado Pago da Nua | Pix comercial e confirmação usam a aplicação da cliente. A mensalidade continua usando a aplicação do desenvolvedor. |
| P0 | Conteúdo pago | Originais privados, acesso vinculado ao pedido e checagem de expiração e titularidade. |
| P1 | Banco e mídias | Esquema versionado, consistência entre registros e objetos, backup restaurável. |
| P1 | Operação do painel | Publicar, tratar pedidos e gerenciar horários pelo iPhone com estados e ações claros. |
| P1 | Release | Build limpo, homologação com serviços reais, implantação versionada e rollback. |

## 2. Carrossel público | O que foi verificado

A home real abriu no navegador. Na primeira leitura, as quatro imagens abaixo tinham carregamento concluído e largura natural zero. Na leitura seguinte, cópias idênticas de Fique Nua, Veludo e Olhares chegaram a renderizar com largura natural de 1.368 px, enquanto outras cópias continuavam quebradas. Obsessão permaneceu sem imagem renderizada na última amostra. Algumas instâncias fora da tela ainda aguardavam o carregamento tardio e foram excluídas do diagnóstico de falha. A foto da capa, servida em /images/, carregou com largura de 2.048 px.

| Título público | Caminho solicitado | Tamanho do arquivo local |
| --- | --- | ---: |
| Fique Nua | /media/media-1792615365182-w6b0zb/mobile.webp | 77.736 bytes |
| Veludo | /media/media-1792615470200-h06fnh/mobile.webp | 67.054 bytes |
| Obsessão | /media/media-1792614850150-03zsse/mobile.webp | 192.800 bytes |
| Olhares | /media/media-1792615883000-kf8cft/mobile.webp | 69.696 bytes |

Os quatro caminhos existem nos diretórios locais public, out e out-site. O Git não rastreia public/media e a regra de ignore cobre pelo menos o caminho verificado. Um build em checkout limpo não tem garantia de reproduzir o fallback que a máquina de desenvolvimento contém. A evidência pública confirma a falha e a recuperação parcial de algumas URLs. Os status HTTP, a origem da resposta e o estado dos objetos no B2 ainda são desconhecidos.

### Caminho da imagem e hipóteses

1. app/page.tsx lê usePublishedContent, filtra fotos ativas e repassa imageUrl. Galeria vazia pode retornar ao catálogo fixo SITE_DATA, confundindo exclusão intencional com falta de dados. A tela inicial do navegador chegou a mostrar quatro títulos diferentes antes da hidratação.
2. HomeBastidoresGallery.tsx duplica as quatro fotos em 16 cartões, aplica resolveMediaUrl com variante mobile e renderiza todas com lazy loading. Não há tratamento de falha no elemento. Cópias animadas também ficam expostas à leitura assistiva e os cartões clicáveis são divs.
3. lib/media/urlResolver.ts preserva URL absoluta e pode sintetizar /mobile.webp de uma referência local /media/. O caminho solicitado precisa corresponder ao objeto efetivamente criado. Um host antigo permanece antigo se já está gravado como URL absoluta.
4. out-site/_routes.json passa /media/ pela Function e exclui /images/. functions/media/[[path]].ts tenta cache, B2, variantes alternativas e assets do deploy. Erros de origem podem cair no mesmo resultado de objeto ausente. Imagem recuperada com 1.368 px é indício para comparar a variante entregue com o original. A largura sozinha não prova qual arquivo respondeu.
5. A causa pode combinar resposta transitória da origem, comportamento do cache, artefato incompleto ou carregamento concorrente. A repetição dos cartões amplifica o sintoma visível, mas o navegador ainda precisa receber uma resposta utilizável para cada URL.

### Correção e evidência de aceite

- Registrar status, tipo, tamanho, cache e tempo das quatro URLs usando requisições públicas normais e correlacionar o horário com logs da Function. Consultar no B2 as chaves exatas e variantes, verificando permissões e versões. Comparar com o manifesto do deploy ativo.
- Escolher B2 como origem canônica das fotos administráveis. Manter referências por chave e variantes efetivamente registradas. Migrar o legado após inventário e verificação de uso. Usar fallback somente para variante válida do mesmo item e diferenciar falha temporária de item excluído.
- Tirar a confirmação visual de dependência do lazy loading das cópias animadas. Carregar o conjunto necessário antes da animação, oferecer navegação por teclado e toque, pausar em hover/foco e respeitar redução de movimento. Elementos duplicados ficam fora da sequência de foco e leitura.
- Acompanhar a volta inteira em Safari iPhone, Safari Mac e Chrome, com cache frio, quente e rede lenta. Cada cartão visível deve ter largura natural positiva. Clicar em cada foto e confirmar o mesmo item no lightbox. Esvaziar a galeria em homologação deve respeitar o estado vazio publicado.

## 3. Upload, armazenamento e CDN

| Etapa | Evidência e risco | Mudança e verificação |
| --- | --- | --- |
| Presign | functions/api/media/presign.ts pode devolver HTTP 200 com URL vazia e fallback. O erro real pode aparecer só no passo seguinte. | Contrato explícito para indisponibilidade, fallback apenas quando apto a gravar, CORS do B2 limitado aos hosts do painel e teste de PUT no navegador. |
| Identidade | MediaService usa Map de upload em memória e fingerprint parcial em alguns casos. Isso não prova deduplicação entre abas, dispositivos ou concorrência. | Hash integral e unicidade no banco no escopo adequado à visibilidade. Reutilizar arquivo confirmado ou reaproveitar tentativa pendente. |
| Variantes | Upload, otimização e atualização do catálogo são etapas separadas. | Registrar pendente → processando → disponível ou falhou. Confirmar variantes necessárias antes de permitir publicação. Limpar objetos órfãos após carência e verificação de referências. |
| Vídeo | _mediaStore.ts converte toda a resposta em bytes. A Function faz o corte depois e HEAD usa o mesmo handler. | Range propagado à origem e streaming, HEAD leve, 416 quando aplicável, poster e duração consistentes, seek testado no Safari. |
| Exclusão | media/delete.ts declara contagem a partir das chaves solicitadas. | Conferir erros por objeto e referências em galeria, capa, packs e pedidos. Separar retirada de exibição, arquivamento e exclusão definitiva. |
| Privacidade | A Function decide se a mídia é privada pelo caminho e procura identificadores por trechos do nome. | Autorizar por chave exata e vínculo com compra. Confirmar ausência de originais privados no build e cache público. Usar sessão de acesso expirada e impedir acesso cruzado entre pedidos. |

Observabilidade por tentativa: requestId, fase, categoria de erro, duração e resultado. Evitar tokens, URLs assinadas e dados do comprador nos logs. Publicar somente mídias válidas, com confirmação de que a origem de entrega encontra o objeto. Na recuperação do carrossel, preservar os arquivos locais até conferir B2 e deploy.

## 4. Mercado Pago da cliente e mensalidade do desenvolvedor

| Fluxo | Conta recebedora | Rota e configuração |
| --- | --- | --- |
| Avulsos, personalizados e chamadas | Mercado Pago da Nua | Manter o contrato do checkout público quando possível. Proposta de webhook /api/webhooks/mercadopago-comercial, com token, assinatura e identificação da conta próprios. |
| Mensalidade do site | Mercado Pago do desenvolvedor | Manter /api/finance/webhook e a configuração de cobrança existente. Conferir o isolamento em emissão, consulta, confirmação e relatórios. |
| Histórico Stripe | Histórico comercial anterior | Preservar comprovantes, pedidos pagos e direitos de acesso. Definir conciliação de pendências antigas antes de desativar a integração de novas vendas. |

**Mapa do acoplamento atual.** payments/create-pix.ts e appointments/book.ts criam Pix pelo Stripe. payments/status.ts, appointments/pix.ts e personalizados/status.ts ainda têm caminhos de consulta ligados ao provedor atual ou ao helper Mercado Pago. supabase/orders.ts grava stripe_payment_intent_id. CommercialFinanceEditor.tsx chama stripeDashboardService. Existem dois caminhos de entrada para webhook Stripe. Revisar também e-mail/OTP, concessão de acesso, documentação, testes, telas e dados históricos. A alteração local anterior no webhook Stripe serve apenas para a integração antiga enquanto ela estiver ativa.

**Armadilha concreta.** O helper _mercadopago.ts pega MP_ACCESS_TOKEN e, sem uma URL explícita, envia a notificação a /api/finance/webhook. Reutilizar esse helper com seus defaults pode direcionar a venda comercial para a aplicação ou o webhook da mensalidade. A proposta é tornar conta e rota parâmetros obrigatórios da integração interna, com segredos de venda separados dos da mensalidade e sem fallback entre contas. Nomes sugeridos para a conta comercial: MP_COMMERCIAL_ACCESS_TOKEN, MP_COMMERCIAL_WEBHOOK_SECRET e MP_COMMERCIAL_COLLECTOR_ID. São nomes propostos, sem provisionamento nesta auditoria.

### Fluxo comercial a implementar

1. Criar pedido e tentativa no Supabase com identificador estável, valor em centavos, moeda, tipo de compra e conta responsável. Determinar preço pelo produto publicado, orçamento aceito ou modalidade persistida. Tratar falta de preço como erro visível.
2. Emitir o Pix na conta da cliente com referência ao pedido, idempotência estável da tentativa e callback comercial explícito. Persistir identificador do provedor e expiração antes de exibir QR Code e código copia e cola. Uma nova tentativa após expiração tem identidade própria.
3. Validar a assinatura conforme o produto Mercado Pago efetivamente adotado e consultar o pagamento na conta comercial. Conferir recebedor, referência, valor, moeda e estado. Não liberar com base em estado apresentado pelo navegador.
4. Confirmar pagamento, atualizar pedido e registrar o evento numa transação. Em falha, permitir reentrega segura. Disparar e-mail por tarefa persistida, com retry sem duplicar o pagamento. Processar atraso, cancelamento e reembolso com regras explícitas de acesso.
5. Financeiro lê pedidos e pagamentos conciliados. Mostrar valores recebidos e pendentes com datas, estornos e referência. Saldo disponível só entra se houver fonte comprovada para esse saldo na conta da cliente. A mensalidade permanece no atalho próprio.

### Aceite e virada

Testar as duas aplicações com eventos legítimos de homologação. Cobrir entrega repetida, falha de banco seguida de retry, pagamento vencido, valor divergente, cancelamento, reembolso, dois compradores no mesmo horário e recuperação do acesso por e-mail. A confirmação de venda não altera parcela de mensalidade, e a confirmação da mensalidade não libera pack. Validar com a cliente a elegibilidade de cada modalidade ofertada junto ao provedor antes de ativar cobrança. O site promete discrição no extrato e acesso vitalício em trechos da home. Conferir como a cobrança aparece na conta da cliente e alinhar a promessa de acesso com a validade da sessão e a política de recuperação. Preservar estados existentes e definir rollback que mantenha pedidos já emitidos consultáveis no provedor de origem.

## 5. Supabase | O defeito demonstrado e o que auditar no banco

**Publicação com falso sucesso.** Em functions/api/content/sync.ts, a gravação das duas linhas em site_content trata erro de upsert como aviso. Sem Supabase configurado, a rotina também pode cair na resposta de sucesso. O catch final devolve 200 com success true. useAdminShell.ts usa o resultado para limpar mudanças e exibir a confirmação. O GET ainda pode devolver 200 com exists false quando a consulta falha. O efeito observável no painel pode ser um “publicado” local seguido de conteúdo antigo em outro dispositivo.

| Área observada no código | Revisão necessária |
| --- | --- |
| site_content e content_backups | Separar intenção de rascunho de revisão publicada, armazenar edição de forma persistente e devolver a revisão realmente confirmada. Validar concorrência sem sobrescrever campos alterados em outro dispositivo. Versionar restauração e validar que snapshot restaurado não ressuscita mídia excluída. |
| orders | Evoluir para campos neutros de provedor e conta, com identificador e tentativa únicos. Preservar colunas antigas durante a migração, validar transições e reconciliar linhas históricas. |
| appointments_settings e appointments | Validar fuso de Brasília, agenda real, janela de reserva, expiração e exclusividade de horário por recurso. Testar com duas conexões concorrentes e pagamento atrasado. |
| personalizados_settings e personalizados_orders | Auditar status, orçamento, total, vínculo com pagamento, dados privados e permissões do atendimento. Testar edição, orçamento aceito e pagamento em outro dispositivo. |
| Conteúdo público | O sanitizador do endpoint remove library e albums, preservando os demais campos. Adotar projeção pública explícita e verificar que dados internos e chaves de mídia paga não entram no JSON ou bundle estático. |
| Chaves e políticas | O backend usa credencial privilegiada. Revisar grants e RLS para acessos diretos e autorização das rotas que usam a credencial privilegiada. |

Não localizei migrações SQL do esquema principal nas áreas revisadas do repositório. O esquema remoto, constraints, índices, volume, lentidão, RLS e backups ainda precisam de leitura autenticada. A primeira entrega de banco é extrair o esquema sem dados pessoais, versioná-lo, comparar com o código, testar restauração em projeto separado e medir consultas reais antes de escolher índices. A correção imediata da publicação é devolver erro quando a operação não confirma, distinguir “sem conteúdo” de “banco indisponível” e preservar o rascunho. O aceite de persistência precisa ler a revisão de outro navegador, sem aproveitar o cache local.

## 6. Admin | Percursos e mudanças concretas

A avaliação abaixo parte das rotas e componentes locais. A sessão autenticada em produção e o Safari da cliente ainda exigem teste de aceite.

| Tarefa | Fricção encontrada | Fluxo proposto |
| --- | --- | --- |
| Publicar pack | Packs e Biblioteca são abas dentro de Conteúdos. A edição do site tem outro editor de galeria. A cliente pode confundir “enviei a foto” com “apareceu no site”. | Conteúdos & Packs abre em packs. Criar pack → selecionar/enviar mídias na própria tela → revisar preço, capa e prévia → salvar rascunho ou publicar. Exibir a revisão e o link do pack quando confirmado. |
| Trocar foto da home | Editar meu site abre na capa e esconde a galeria em subaba. | Uma entrada Galeria da página inicial dentro de Editar meu site, com ordem, status, miniatura e prévia fiel ao carrossel. Distinguir remover da galeria de excluir arquivo. |
| Tratar pedido | AdminModuleRouter recebe o ID na central de alertas e descarta o valor ao navegar. | Abrir o pedido exato, com ação de próxima etapa e retorno para a lista com o filtro anterior. Separar pendências de concluídos. |
| Alterar horários | Navegação comercial e agenda dividem o mesmo módulo. | Chamadas abre em próximos agendamentos, com botões claros para Horários e Modalidades. Mostrar hora de Brasília, disponibilidade publicada e prévia do que o visitante vê. |
| Conferir dinheiro | Financeiro comercial depende do dashboard Stripe. Mensalidade também aparece na navegação. | Financeiro lista vendas da Nua, conciliação, estornos e filtros simples. A mensalidade do site fica no atalho fixo do cabeçalho. |
| Divulgação e configurações | SEO consta na sidebar e no router, mas é excluído de um menu e não aparece na lista local de módulos exportados. | Definir uma entrada para divulgação, testar URL direta e recarga. Agrupar redes e contato com a edição do site. |
| Beta, contrato e cofre | Router monta MusicEditor para beta_player. A navegação oferece ações operacionais junto de recursos experimentais. | Beta descreve disponibilidade local. Manter contratos, cofre e configurações em área de apoio. Verificar que o site público não carrega player ou IA. |

**Estrutura proposta.** No topo da sidebar: Conteúdos & Packs, Pedidos personalizados e Chamadas. Em seguida: Editar meu site, Financeiro, Contrato e Configurações, com cofre acessível na área de apoio e Mensalidade do site no cabeçalho. No iPhone, preservar botão Voltar, estados após recarga, foco visível e botão principal acessível. Evitar modais para editores longos. Formulários precisam de estados úteis em envio, sucesso, falha recuperável e alteração pendente. Usar textos como “Salvo como rascunho”, “Publicado no site” e “Não foi possível publicar. Seu rascunho está salvo”, somente quando o backend comprovar cada estado.

**Roteiro de aceite com a Nua.** Sem orientação técnica: criar e publicar pack, trocar e reordenar fotos da galeria, abrir um pedido pelo alerta, ajustar um dia de disponibilidade e localizar uma venda e a mensalidade. Registrar tarefas concluídas, pontos de hesitação, erros e se o painel informa o próximo passo. Repetir com rede instável e recarga no Safari.

## 7. Site público, deploy e qualidade

- A home publicada mostrava o manifesto, a galeria e as ofertas institucionais, sem a seção de lançamentos na amostra observada. Verificar se a ausência corresponde ao catálogo publicado. Testar pack novo, pack despublicado, slug inválido, preview, preço persistido, CTA, checkout e acesso pós-compra.
- O link “Explorar acervo de fotos” da capa aponta para #galeria, enquanto a seção de bastidores observada usa #bastidores. Validar a âncora no DOM publicado e corrigir o destino para o bloco certo.
- O export estático e o fallback de slugs do middleware precisam de canonical, OG, sitemap e status 404 coerentes para catálogo atual. Verificar termos, privacidade, contato, links externos e apresentação pública das modalidades. Evitar promessas de saldo, extrato e acesso sem confirmação da regra real.
- Empacotar a partir de checkout limpo e artefatos explícitos. Comparar hashes e manifestos com o deploy de homologação. As fontes remotas já impediram build neste executor na rodada anterior. Verificar build de release e disponibilidade de fontes com licença adequada.
- Revisar cache e headers das Functions no deploy. O arquivo _headers do Pages atua sobre respostas estáticas. As respostas geradas pela Function exigem headers no código. Conferir /media, APIs administrativas, acesso privado e redirecionamentos.
- Instrumentar erros de publicação, 404/5xx de mídia, latência B2, eventos de pagamento atrasados, pedidos presos, alertas de e-mail e erros de recuperação de acesso. Identificar versão publicada e restaurar release anterior em teste de rollback.

## 8. Sequência até o fim do ano

| Janela proposta | Entrega e condição para avançar |
| --- | --- |
| 11–20/11 | Diagnosticar as quatro URLs com logs do deploy e B2, restaurar a galeria e corrigir a confirmação de publicação. Conferir o inventário e a privacidade dos originais. |
| 21/11–04/12 | Versionar esquema, preparar homologação e migração de mídia. Implementar checkout e webhook Mercado Pago da cliente, preservando mensalidade e histórico. |
| 05–11/12 | Homologar Pix, reentrega, agenda, personalizados, acesso pago, reembolso e restauração de backup. Fechar testes em checkout limpo. |
| 12–18/12 | Fechar UX, testar com a Nua no iPhone e Mac, validar vitrine, imagens, SEO e acessibilidade. |
| 21–23/12 | Publicar só com os critérios cumpridos, backup testado, rollback preparado e verificação dos dois recebedores. |
| 24–31/12 | Reserva para operação assistida e ajustes pós-publicação. |

## 9. Limites desta revisão

A falha do carrossel foi observada no site público. A causa HTTP e o objeto efetivamente servido ainda precisam de logs e leitura de configuração. Os demais defeitos citados são evidências de código local, salvo observações da home identificadas como publicadas. Não houve mudanças de código nesta rodada, deploy, pagamento real nem acesso autenticado ao Supabase, B2, Cloudflare, Mercado Pago ou ao painel. O dossiê distingue os achados observados dos critérios que precisam ser comprovados na homologação.

## Referências oficiais

- [Mercado Pago Developers — Webhooks de pagamento](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications)
- [Mercado Pago Developers — Pix e idempotência](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/pix)
- [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Backblaze — Regras de CORS do B2](https://www.backblaze.com/docs/cloud-storage-cross-origin-resource-sharing-rules)
- [Cloudflare Pages — Cabeçalhos](https://developers.cloudflare.com/pages/configuration/headers/)

