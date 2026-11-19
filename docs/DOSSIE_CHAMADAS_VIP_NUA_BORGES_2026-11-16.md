# Dossiê da funcionalidade Chamadas VIP — NUA Borges

**Data da leitura:** 16/11/2026  
**Escopo:** caminho público de agendamento, voucher da cliente, pagamento Pix pelo Mercado Pago, painel administrativo, persistência e integrações encontradas no código.  
**Método:** leitura do código existente no repositório. Não foram feitas alterações funcionais nem testes de execução nesta etapa.

## 1. Limites e confiabilidade deste documento

O repositório está na branch `reorg/cms-profissional` e contém muitas alterações locais pendentes. Este dossiê descreve o **estado atual dos arquivos no diretório de trabalho**; ele não comprova que a versão publicada em produção seja idêntica. Também não foi feita consulta ao banco de produção nem validação de uma compra real.

As afirmações abaixo são separadas em:

- **Confirmado no código:** há implementação e caminho identificável nos arquivos citados.
- **Não localizado no fluxo examinado:** não encontrei implementação correspondente nos caminhos examinados; isso não prova que inexista em qualquer serviço externo ou outro módulo.
- **Risco/defeito aparente por inspeção:** conclusão estática do fluxo; não foi reproduzida em execução.

O comportamento visual foi descrito pelos componentes de interface. As regras de pagamento e persistência foram descritas pelas funções e serviços do repositório. Nomes de páginas, chamadas, mensagens e preços abaixo são valores observados no código e/ou padrões definidos nele; não são confirmação de valores atualmente gravados no Supabase.

## 2. Visão geral

O recurso é um agendador de chamadas por vídeo. A cliente escolhe uma modalidade, uma data e um horário de Brasília, informa seus dados, aceita a declaração exibida no formulário e solicita a reserva. O backend recalcula a disponibilidade e o preço, cria um Pix no Mercado Pago e salva a reserva no Supabase. A reserva nasce como **aguardando pagamento**. A confirmação pode ocorrer por webhook do Mercado Pago ou pela consulta de pagamento; o voucher então apresenta o link da sala quando a reserva está confirmada.

No admin, o módulo **Chamadas VIP** oferece fila de reservas, calendário e folgas, modalidades/preços e horário semanal. Ações disponíveis no fluxo operacional incluem confirmar manualmente o pagamento, adicionar/editar link e instruções da sala, cancelar, marcar concluída ou não compareceu. O backend também possui ação de reagendamento e de alteração geral de status, mas não encontrei uma ação de reagendamento exposta nos componentes de fila/calendário lidos.

## 3. Mapa do fluxo

```text
Site /chamadas
  ├─ consulta modalidades e horários livres
  ├─ cliente preenche formulário e envia
  └─ POST /api/appointments/book
       ├─ valida modalidade, horário, dados e antecedência
       ├─ cria Pix no Mercado Pago
       ├─ grava appointments no Supabase
       └─ tenta registrar pedido em orders
             │
             ├─ webhook Mercado Pago ─┐
             ├─ consulta Pix da chamada ├─ confirma reserva e libera sala
             └─ consulta status geral ─┘
                                      │
Voucher /chamadas/reserva?token=... ─┘

Admin / Chamadas VIP
  ├─ lê configurações, modalidades e reservas
  ├─ grava mudanças por POST /api/appointments/admin
  └─ middleware autentica as rotas administrativas
```

## 4. Fluxo público, passo a passo

### 4.1 Entrada, modalidades e calendário

1. A tela pública fica em `app/chamadas/page.tsx`.
2. A lista inicial no navegador usa `DEFAULT_MODALITIES`, em `lib/appointments/types.ts`.
3. Ao carregar, a página solicita `GET /api/appointments/availability?mode=modalities`; a API retorna apenas modalidades ativas e alguns metadados públicos de agenda.
4. Para uma combinação de data e modalidade, o serviço consulta `GET /api/appointments/availability?date=AAAA-MM-DD&modalityId=...`.
5. A disponibilidade é calculada no servidor com as configurações de agenda e reservas do Supabase. O fuso canônico declarado pelo código é `America/Sao_Paulo` (Brasília).
6. A interface mostra a seleção da modalidade, calendário, horários disponíveis e resumo do pedido. Ao trocar data ou modalidade, o horário selecionado é limpo e a consulta de horários é refeita.

### 4.2 Dados que o formulário pede

Em `components/nua/chamadas/ChamadasBookingSummaryCard.tsx`, os campos são:

| Campo | Obrigatório na interface | Tratamento/uso observado |
|---|---:|---|
| Nome ou apelido | Sim | Enviado como `clientName`; o servidor exige ao menos 2 caracteres após remover espaços. |
| WhatsApp ou Telegram | Sim | Enviado como `clientPhone`; o servidor remove caracteres não numéricos e exige 10 a 13 dígitos. Embora a dica da tela aceite `@usuario`, a validação do servidor exige número. |
| E-mail | Sim | Enviado como `clientEmail`; o servidor valida formato e salva em minúsculas. É usado como e-mail do pagador ao criar o Pix. |
| Observações ou preferências | Não | Enviado como `clientNotes`; exibido no admin. |
| Aceite da declaração | Sim | O navegador exige marcar a caixa e o servidor rejeita requisição sem `termsAccepted: true`. |

A declaração efetivamente exibida é: “Concordo com as diretrizes e compreendo que o extrato bancário do Pix é 100% neutro e discreto.” No componente examinado, essa frase não contém links para Termos ou Política de Privacidade. O backend valida o booleano, mas não registra no modelo um texto/versão de termo, timestamp de aceite ou evidência específica além do evento de criação.

### 4.3 Escolha de horário e regras aplicadas

O mecanismo em `lib/appointments/availabilityEngine.ts` considera:

- data não anterior ao dia atual em Brasília;
- limite de dias futuros configurado;
- data bloqueada integralmente;
- dia da semana habilitado e intervalos de atendimento;
- duração da modalidade e pausa (`bufferMinutes`);
- antecedência mínima global e da modalidade, valendo o maior valor;
- intervalos de horário bloqueados;
- reservas não canceladas, exceto pendências cujo `expiresAt` já passou.

O passo para sugerir horários é de 15 minutos para modalidades de até 30 minutos e de 30 minutos para modalidades mais longas. Na confirmação da reserva, `validateBookingAttempt` recalcula a disponibilidade no servidor; o horário do navegador, portanto, não basta para garantir a vaga.

### 4.4 Envio, preço e reserva temporária

Ao clicar **Gerar Pix & Reservar**, a interface envia modalidade, data, horário, nome, e-mail, telefone, observações e aceite para `POST /api/appointments/book`.

O endpoint:

1. lê configurações, modalidades e até 100 reservas do Supabase;
2. valida os dados e o horário usando modalidade ativa e preço do servidor; não confia em preço fornecido pelo navegador;
3. cria o Pix via Mercado Pago, com `external_reference` no formato `apt_<id-da-reserva>` e notificação configurada para `/api/finance/webhook`;
4. monta a reserva com status `aguardando_pagamento`, valor, payload Pix, QR, id da transação e expiração calculada por `autoCancelPendingMinutes`;
5. grava a reserva na tabela `appointments`;
6. tenta registrar o pedido na tabela `orders` para conciliação; falha nessa segunda gravação é tratada como aviso e não desfaz a reserva;
7. devolve os dados da reserva ao navegador.

O padrão definido em `lib/appointments/types.ts` usa 15 minutos para a expiração pendente, mas o valor efetivo pode ser diferente se a configuração gravada for outra. O código de criação não informa uma operação de estorno/cancelamento do pagamento ao Mercado Pago quando a gravação da reserva falha.

### 4.5 Pagamento Pix e confirmação

O Pix é gerado pelo endpoint específico da reserva, `functions/api/appointments/book.ts`, por meio do helper Mercado Pago. O checkout universal recebe o QR e o código Pix que já foram criados, em `initialPayment`; para chamada, o modal **não precisa criar um segundo Pix** quando esse payload inicial existe.

O checkout exibe resumo, valor, QR, código para copiar, contador local de 15 minutos e mensagens de status. Esse contador do modal é uma contagem de interface. A expiração que influencia a disponibilidade é `expiresAt`, calculada no servidor. A página pública também consulta `POST /api/appointments/pix` periodicamente enquanto a reserva aguarda pagamento.

Há três caminhos no código para detectar pagamento:

- **Webhook:** `/api/finance/webhook` consulta o pagamento no Mercado Pago usando o ID recebido e, se o status externo for `approved`, busca a reserva pelo `external_reference`, grava status `confirmada`, pagamento aprovado e data de pagamento, marca a sala como visível e atualiza o pedido em `orders`.
- **Consulta própria da chamada:** `POST /api/appointments/pix` recebe o ID da reserva, consulta Mercado Pago pelo `transactionId` salvo e, se aprovado, atualiza reserva e pedido.
- **Consulta geral do checkout:** `GET /api/payments/status?orderId=...` também tenta atualizar pedido/reserva, caso encontre o pedido com o identificador consultado.

Na aprovação, o status da reserva é `confirmada`. Não há evidência, nos componentes examinados, de que o checkout seja o meio autoritativo de liberar a sala; o voucher público oculta a URL quando o status não é `confirmada`.

### 4.6 Voucher da cliente

A página está em `app/chamadas/reserva/page.tsx` e recebe `?token=...`. Ela apresenta modalidade, titular, data, intervalo de horário, duração, valor e estado. Para pendência, apresenta QR/código Pix e verificação periódica. Para reserva confirmada, apresenta o link da sala e instruções se estes estiverem cadastrados; sem link, mostra que está sendo preparado. Também oferece baixar arquivo `.ics`, copiar o link do voucher e abrir uma conversa de WhatsApp com texto montado pelo código.

Os estados visuais explicitamente tratados pela página são:

- `aguardando_pagamento` — aguardando Pix;
- `confirmada` — reserva confirmada e área da sala;
- `concluida` — chamada concluída;
- `cancelada` — cancelada, com motivo se houver.

Outros estados do tipo canônico podem cair sem tela específica. O voucher não oferece botão para cancelar ou reagendar.

## 5. Admin, passo a passo

O módulo de admin fica em `components/nua/admin/AppointmentsEditor.tsx` e é carregado pelo sistema de módulos do admin. O serviço client-side chama `GET/POST /api/appointments/admin` com cookie de sessão e, quando disponível, token Bearer. O middleware global protege rotas administrativas e aplica autenticação e autorização antes de executar as funções.

### 5.1 Atendimentos Agendados

A fila apresenta busca por nome, e-mail, telefone ou data; filtros por status ativo e modalidade; cartões com métricas de hoje, pendentes, confirmadas, concluídas e faturamento calculado; e as reservas ativas. A listagem exibe cliente, modalidade, data/horário, preço, contato, observações e estado do link da sala.

Ações que aparecem no fluxo da fila:

- **Confirmar Pagamento (Pix):** chama a ação `confirm`; no servidor marca pagamento `manual_confirmed`, define `paidAt`, registra um identificador manual se nenhum for enviado e muda a reserva para `confirmada`.
- **Adicionar/editar link da sala:** salva URL e instruções com `updateMeeting`.
- **Marcar Concluída:** muda status para `concluida`.
- **Não Compareceu:** muda status para `nao_compareceu`.
- **Cancelar Reserva:** pede motivo e muda status para `cancelada`; o código diz que o horário fica livre, e o motor ignora reservas canceladas.
- **Ficha completa:** abre callback opcional recebido pelo módulo pai; a implementação de navegação depende desse callback.

O botão “Conversar” monta um link `wa.me` usando o telefone guardado e mensagem gerada para confirmação ou lembrete. A interface não envia a mensagem automaticamente.

### 5.2 Calendário & Folgas

Mostra calendário mensal, indicadores de reservas e painel do dia selecionado. Permite bloquear/desbloquear uma data integralmente e abrir detalhes ou adicionar link. Mostra próximas chamadas. No componente examinado, o bloqueio é por **data**; não localizei controles visuais de bloqueio por intervalo específico, embora o modelo e o motor tenham suporte a `blockedSlots`.

### 5.3 Tipos de Chamada & Preços

Permite criar, editar, ativar/desativar ou remover modalidade. O formulário de modalidade contém nome, duração, preço, descrição comercial, instruções mostradas ao cliente e estado ativa/visível. O tipo de dados também contém `rules`, `minNoticeHours` e `order`; a tela de edição examinada não oferece edição para esses três campos. A lista mostra as regras existentes.

Os defaults de código incluem duas modalidades de exemplo (`chamada-30` e `chamada-60`) com preços definidos em `lib/appointments/types.ts`. Esses defaults são fallback de código, não confirmação do catálogo atualmente persistido no banco.

### 5.4 Horários de Atendimento

O admin permite habilitar dias da semana e configurar um intervalo de início e fim por dia. Há controles de descanso entre chamadas, antecedência mínima global e horizonte máximo de agenda, além de datas bloqueadas e acesso ao calendário visual. As opções visíveis no componente incluem descanso de 10/15/20/30 min; antecedência de 2/4/12/24 h; horizonte de 15/30/60 dias.

O modelo também contém `autoCancelPendingMinutes`, configuração de plataforma e instruções padrão da sala, mas esses itens não aparecem como controles na aba de horários examinada. Modalidade possui antecedência própria no modelo, além da regra global.

### 5.5 Acesso a ficha e status

Existe também `components/nua/admin/AppointmentBookingPage.tsx`, uma tela de detalhes com seletor de status, edição do link da sala, histórico operacional e cancelamento com motivo. O código dessa tela monta um link do cliente em `/chamadas/status?token=...`. No conjunto de rotas encontrado, o voucher está em `/chamadas/reserva`; não encontrei `app/chamadas/status`. Não foi confirmado que essa tela de detalhes esteja atualmente montada no fluxo do módulo.

O backend tem ações adicionais (`reschedule`, `update_status`) e o tipo de status inclui `reagendamento_pendente` e `reembolso_pendente`, mas encontrar esses valores no modelo não significa que o fluxo de reagendamento ou reembolso esteja concluído.

## 6. Dados e persistência observados

O serviço Supabase em `functions/api/supabase/appointments.ts` transforma o modelo de reserva em linha da tabela `appointments`. O mapeamento lido usa:

| Modelo da aplicação | Coluna/campo usado no mapeamento |
|---|---|
| ID | `id` |
| Token privado | `public_token` |
| Nome | `client_name` |
| Telefone ou contato | `client_contact` |
| E-mail | `client_instagram` (o conversor usa essa coluna para recuperar e-mail) |
| Modalidade | `modality_id` |
| Data e hora | `date_time` |
| Duração e preço | `duration_minutes`, `total_price` |
| Estado do pagamento | objeto `payment` |
| Link da sala | `call_link` |
| Notas, sala, histórico, horários e cancelamento | objeto JSON serializado em `notes` |

As configurações e modalidades são lidas e gravadas em `appointments_settings`, registro `id = 1`, nos campos `settings` e `modalities`. A listagem de reservas lida pelo código está limitada por padrão a 100 itens quando chamadas de agenda/admin usam esse helper.

O repositório contém apenas uma migration Supabase localizada durante a leitura, relacionada a índice de mídias B2; não encontrei migration de criação das tabelas de chamadas nesse diretório. Portanto, o documento descreve o contrato esperado pelo código, não a definição efetiva atual do banco.

## 7. Estados observados

| Estado | Significado no fluxo encontrado |
|---|---|
| `aguardando_pagamento` | Reserva criada; pagamento Pix não confirmado. Bloqueia vaga enquanto não expirar. |
| `confirmada` | Pagamento aprovado por Mercado Pago ou confirmado manualmente; voucher pode mostrar a sala. |
| `concluida` | Admin marcou atendimento realizado. |
| `cancelada` | Admin cancelou; motor deixa de considerar a reserva como bloqueio. |
| `nao_compareceu` | Admin marcou ausência. |
| `reagendamento_pendente` | Declarado no tipo, sem fluxo público confirmado na leitura. |
| `reembolso_pendente` | Declarado no tipo, sem fluxo de reembolso confirmado na leitura. |

O estado do pagamento tem valores `pending`, `approved`, `rejected`, `refunded` e `manual_confirmed`. A presença de `refunded` na tipagem não prova integração de estorno.

## 8. Pontos que precisam de atenção identificados na leitura

Estes pontos são achados estáticos no código de trabalho, não resultados de teste em produção.

### 8.1 Consulta por token do voucher incompatível com o token gerado — alto impacto

`generatePublicToken()` em `lib/appointmentsStore.ts` retorna uma sequência aleatória sem prefixo. Já `getAppointmentByIdFromSupabase()` só procura a coluna `public_token` quando o argumento começa com `tok_`; qualquer outro valor é tratado como `id`. O voucher chama `GET /api/appointments/lookup?token=<publicToken>`. Assim, o token recém-gerado tende a ser consultado como ID e não como `public_token`.

O cliente pode ainda conseguir abrir o voucher no mesmo navegador porque `lookupBooking()` tem fallback para o registro salvo em `localStorage`, mas a leitura por token no servidor tende a falhar para esse formato. O fallback local não substitui uma consulta funcional em outro dispositivo/navegador.

### 8.2 Link de cliente copiado em tela de detalhes aponta para rota não localizada

`AppointmentBookingPage.tsx` monta `/chamadas/status?token=...`, enquanto a página de voucher encontrada é `/chamadas/reserva`. Não foi encontrada rota `app/chamadas/status`. Se a tela de detalhes estiver ativa, o link copiado provavelmente leva a uma rota sem página correspondente.

### 8.3 Vaga pode ser disputada simultaneamente — risco de concorrência

`book.ts` consulta as reservas, valida disponibilidade, chama o Mercado Pago e só depois grava. Não encontrei transação/lock/constraint de unicidade por faixa horária neste fluxo. Duas requisições quase simultâneas podem validar contra a mesma lista antes de qualquer gravação e tentar reservar o mesmo período. A leitura da lista também é limitada a 100 registros.

### 8.4 Reserva pendente expira para cálculo de disponibilidade, sem cancelamento sincronizado localizado

O motor deixa de bloquear a vaga quando `expiresAt` passou, mas não encontrei nesta rota uma tarefa que altere o status da reserva vencida para cancelada/expirada nem uma chamada ao Mercado Pago para invalidar Pix vencido. Se um Pix pendente for pago depois de a vaga voltar a aparecer, o webhook de aprovação pode confirmar a reserva antiga; a validação de disponibilidade não é repetida no webhook.

### 8.5 Falha ao salvar depois de criar Pix pode deixar cobrança sem reserva persistida

O Pix é criado antes de `saveAppointmentToSupabase()`. Se a gravação falhar, o endpoint retorna erro, mas não encontrei nesse caminho tentativa de cancelar ou estornar o pagamento recém-criado. A gravação em `orders` também é best effort: erro é apenas logado e não desfaz a reserva.

### 8.6 Identificador enviado ao checkout universal não coincide claramente com `orders`

O booking salva a order em `orders` com ID `bookingId` (gerado como `app_...`). Para o checkout universal, `app/chamadas/page.tsx` monta `initialPayment.orderId` com `apt_${booking.id}` (salvo se `payment.orderId` vier preenchido, o que não é atribuído no objeto do endpoint consultado). O checkout universal consulta `/api/payments/status` usando esse ID. A rota de status procura a order por ID no Supabase; não foi localizado nesse código um alias `apt_app_...` para o ID salvo `app_...`. A página do voucher possui sua consulta própria por `booking.id`, mas o status do checkout universal pode não ser atualizado pelo caminho geral.

### 8.7 Confirmação manual não é comprovante do gateway nem fluxo de reembolso

O admin pode marcar pagamento como confirmado manualmente. Isso altera o estado local da reserva, registra um identificador administrativo e libera a sala; não vi consulta ao Mercado Pago nem emissão automática de estorno nessa ação. O botão de cancelamento altera reserva e libera horário, mas não chama endpoint de refund/cancelamento do Mercado Pago.

### 8.8 Outras divergências de cópia e formato

- O campo de contato aceita visualmente “WhatsApp ou Telegram” e sugere `@usuario`, mas o backend exige de 10 a 13 dígitos, não um nome de usuário.
- A página pública compõe o subtítulo do checkout com “Lua Borges”, enquanto o nome institucional usado em outras mensagens do código é “Nua Borges”.
- A página de voucher e o formulário exibem afirmações de segurança/discrição. O código lido não comprova neutralidade do extrato bancário, sigilo da plataforma de vídeo, confidencialidade bilateral ou que a sala seja tecnicamente segura; esses textos são conteúdo de interface.

## 9. Cancelamento, reagendamento e reembolso: o que dá para afirmar

- **Cancelamento:** há ação administrativa com motivo. Ela grava status/motivo e libera a vaga no cálculo de disponibilidade. Não foi localizado estorno automático, cancelamento do Pix ou notificação automática ao cliente nessa ação.
- **Reagendamento:** há branch backend `reschedule` que valida novo horário, registra o horário anterior e muda a reserva para confirmada. Não localizei chamada dessa ação nos componentes da fila/calendário consultados. O componente de detalhes analisado oferece alteração de status e cancelamento, sem controles de data/hora visíveis nos trechos examinados.
- **Reembolso/estorno:** não localizei rota ou ação de reembolso para chamadas nos arquivos examinados. `refunded` e `reembolso_pendente` aparecem nos tipos, mas são insuficientes para concluir que exista operação de estorno funcional.
- **Comunicação:** o painel gera links de WhatsApp para a pessoa administradora abrir e enviar. Isso não equivale a disparo automático.

## 10. Arquivos principais consultados

### Interface pública

- `app/chamadas/page.tsx` — seleção, carregamento de disponibilidade, envio e abertura do checkout.
- `app/chamadas/reserva/page.tsx` — voucher, Pix, polling e ações pós-reserva.
- `components/nua/chamadas/ChamadasModalitiesSelector.tsx` — cartões de modalidade.
- `components/nua/chamadas/ChamadasCalendarPicker.tsx` — calendário do site.
- `components/nua/chamadas/ChamadasTimeSlotPicker.tsx` — horários disponíveis.
- `components/nua/chamadas/ChamadasBookingSummaryCard.tsx` — resumo e formulário.
- `components/nua/site/CheckoutModal.tsx`, `components/nua/checkout/useCheckoutOrder.ts` — checkout Pix compartilhado e verificação geral.

### Admin

- `components/nua/admin/AppointmentsEditor.tsx` — abas e ações principais do módulo.
- `components/nua/admin/appointments/AppointmentsQueueTab.tsx` — busca, filtros, cards e ações da fila.
- `components/nua/admin/appointments/AppointmentsCalendarTab.tsx` — calendário e folgas.
- `components/nua/admin/appointments/AppointmentsModalitiesTab.tsx` — catálogo de modalidades.
- `components/nua/admin/appointments/AppointmentsSettingsTab.tsx` — horários e regras de agenda.
- `components/nua/admin/appointments/AppointmentsModals.tsx` — edição de modalidade, link e cancelamento.
- `components/nua/admin/appointments/useAppointmentsData.ts` — dados, métricas e chamadas administrativas.
- `components/nua/admin/AppointmentBookingPage.tsx` — tela de detalhes encontrada no repositório; uso atual não confirmado.

### Serviços e backend

- `lib/appointments/types.ts`, `lib/appointments/availabilityEngine.ts`, `lib/appointments/timeUtils.ts` — modelo, defaults, disponibilidade e fuso.
- `lib/appointmentsStore.ts`, `lib/services/nua/appointmentsService.ts` — fallback local e chamadas client-side.
- `functions/api/appointments/availability.ts`, `book.ts`, `lookup.ts`, `pix.ts`, `admin.ts` — endpoints de chamadas.
- `functions/api/supabase/appointments.ts` — conversão e persistência no Supabase.
- `functions/api/finance/webhook.ts`, `functions/api/payments/status.ts` — confirmação via webhook e consulta geral.
- `functions/api/_middleware.ts`, `functions/api/_authHelper.ts` — controle de acesso às rotas privadas.
- `supabase/migrations/` — diretório verificado; não foi localizada migration de criação das tabelas de chamadas.

## 11. Conclusão factual

Há implementação conectada para agendar chamadas, calcular disponibilidade, gerar Pix pelo Mercado Pago, persistir reservas, acompanhar pagamento e administrar modalidades, agenda e reservas. O estado do código também revela divergências relevantes no acesso ao voucher por token, no link da ficha administrativa, no identificador usado pelo checkout universal, na concorrência por horário e no tratamento de expiração/falhas após cobrar.

Este documento não afirma que essas divergências já foram corrigidas em produção. Para declarar o fluxo plenamente funcional, seria necessário comparar este diretório com a versão implantada e reproduzir reserva, pagamento aprovado, acesso ao voucher em outro navegador, cancelamento, expiração e falha de persistência em ambiente controlado.
