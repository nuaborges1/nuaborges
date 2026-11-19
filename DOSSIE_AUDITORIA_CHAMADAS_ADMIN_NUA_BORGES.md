# Dossiê Oficial de Auditoria Técnica & UX — Módulo de Chamadas VIP (Admin Nua Borges)

> **Data da Auditoria:** 18 de Novembro de 2026  
> **Escopo:** Módulo Administrativo de Chamadas VIP (`components/nua/admin/appointments/*`), Motor de Disponibilidade e Fuso (`lib/appointments/*`), Serviços (`lib/services/nua/appointmentsService.ts`), APIs & Banco (`functions/api/appointments/*`, `functions/api/supabase/appointments.ts`, `supabase/migrations/*`) e todas as Integrações do Admin com Chamadas (Dashboard, Financeiro, Histórico, Notificações, Briefing, Spotlight, Ajuda e Nua IA).  
> **Metodologia:** Inspeção adversarial linha a linha (100% baseado em evidências reais do código-fonte) + heurísticas de usabilidade (Nielsen Norman Group) + padrões de referência de agenda (Cal.com / Calendly) + checklist OWASP API Top 10.

---

## 1. Resumo Executivo: Por que você sentiu que "o Chamadas tá tudo quebrado"?

A sua percepção está **100% certa**. O módulo de Chamadas não tem apenas "um ou dois bugs soltos": ele sofreu várias camadas de reformas (versões antigas misturadas com uma reforma chamada "V9") sem que o código antigo fosse removido e sem que as pontas entre a tela, o servidor e o restante do painel fossem reconectadas.

### Radiografia em Números Reais
* **30 arquivos e 12.167 linhas de código** dedicados apenas ao ecossistema de Chamadas (sendo **15 arquivos / 8.449 linhas** só dentro da pasta `components/nua/admin/appointments/`).
* **~3.400 linhas (~37% da UI do módulo) são código morto/fantasma:** abas antigas inteiras, modais desativados e até um arquivo compactado `components/nua/admin/appointments.zip` de **38 KB** esquecido dentro da pasta de componentes React.
* **44 problemas confirmados com prova no código**, incluindo:
  * 🔴 **4 Crashes Fatais / Bloqueios Totais** (que travam a tela ou impedem o funcionamento básico);
  * 🔴 **11 Bugs Críticos de Agenda, Reembolso, Fuso Horário e Double-Booking** (duas pessoas no mesmo horário);
  * 🟠 **14 Falhas Altas de Integração no Admin** (Financeiro contando chamadas em dobro, Briefing mostrando 0 chamadas, botões mortos, Nua IA em conflito com a agenda);
  * 🟡 **8 Vulnerabilidades de Segurança e Contratos de API**;
  * 🟢 **7 Problemas de Complexidade, Design System (`Sparkles` / `alert()`) e Código Morto**.

---

## 2. Parte 1 — Crashes Fatais e Bloqueios Totais (Por que o módulo trava)

### 🔴 BUG-01: Clicar em qualquer chamada no Admin derruba a tela inteira (Crash Fatal do React)
* **Onde está:** `components/nua/admin/appointments/AppointmentsV9Modals.tsx:753-781` e `components/nua/admin/appointments/AppointmentsEditor.tsx:413-437`
* **Explicação amigável:** No React, existe uma regra sagrada: todo componente precisa rodar sempre a mesma quantidade de "memórias internas" (`useState` / `useEffect`) em toda atualização de tela. No modal de detalhes da chamada (`BookingDetailModal`), colocaram um `if (!isOpen || !booking) return null;` na linha 753, e **depois** dele (nas linhas 772 a 781) colocaram 4 `useState` e 1 `useEffect`.
* **O que acontece na prática:** Quando a página abre e nenhuma chamada está selecionada, o modal roda **0 hooks**. No instante em que você ou a Nua clicam em **qualquer chamada** (na aba Início, Agendamentos, Calendário ou Disponibilidade) para ver os detalhes, colocar o link da sala, cancelar ou confirmar pagamento, o modal tenta rodar **5 hooks** e o React explode com erro fatal (`Rendered more hooks than during the previous render`), travando a tela.
* **Como corrigir:** Mover os 4 `useState` e o `useEffect` para o topo de `BookingDetailModal`, antes da linha `if (!isOpen || !booking) return null;`.

---

### 🔴 BUG-02: A senha da própria Nua Borges (`role: 'client'`) é bloqueada pela API de Chamadas — e o painel esconde o erro!
* **Onde está:** `functions/api/_authHelper.ts:260-310`, `lib/services/nua/appointmentsService.ts:340-391` e `components/nua/admin/appointments/AppointmentsEditor.tsx:82-131`
* **Explicação amigável:** Quando a cliente (Nua) faz login com a senha dela (`CLIENT_PASSWORD` / `PORTAL_PASSWORD`), o sistema dá a ela o perfil `'client'`. Porém, a lista de permissões em `_authHelper.ts` (linhas 261–310) esqueceu de liberar `/api/appointments/admin` para o perfil `'client'` (retorna `false` na linha 309 → **Erro 403 Proibido**). E por que parece que a tela abriu? Porque `fetchAdminAppointments` em `appointmentsService.ts:384-391` **engole qualquer erro 401/403/500**, responde `success: true` usando dados velhos salvos no navegador e ainda guarda esse resultado falso em cache por **3 minutos**!
* **O que acontece na prática:** Se a Nua entrar com a senha dela, ela vê uma agenda fantasma (vazia ou desatualizada) sem nenhuma mensagem de erro, e **nenhuma alteração que ela fizer é salva no banco de dados**.
* **Como corrigir:**
  1. Liberar `/api/appointments/admin` para o perfil autoritativo da cliente (ou unificar o papel de dona do painel);
  2. Parar de fingir `success: true` quando a API falha em `appointmentsService.ts` e exibir um aviso claro de erro/sessão expirada na tela.

---

### 🔴 BUG-03: Crash 100% garantido ao criar reserva na API (`ReferenceError: orderSave is not defined`)
* **Onde está:** `functions/api/appointments/book.ts:235-257`
* **Explicação amigável:** Na linha 236 de `book.ts`, o código salva o pedido na tabela `orders` assim: `await saveOrderToSupabase(env, { ... });` — sem guardar a resposta numa variável. Logo abaixo, na linha 250, o código tenta ler `if (!orderSave.success)`. Como a variável `orderSave` não existe, o JavaScript dá crash imediato (`ReferenceError`).
* **O que acontece na prática:** Quando as chamadas estavam ativas no site público, o cliente escolhia o horário, preenchia tudo e clicava em reservar. O servidor **travava o horário no banco**, **criava um Pix verdadeiro no Mercado Pago**, salvava no banco e **dava erro 500 no último milissegundo** antes de devolver o QR Code para a tela! O cliente via "Erro ao processar reserva", não recebia o Pix, e o horário ficava bloqueado à toa por 15 minutos.
* **Como corrigir:** Trocar `await saveOrderToSupabase(...)` por `const orderSave = await saveOrderToSupabase(...)` na linha 236.

---

### 🔴 BUG-04: Clicar na notificação do Windows/Navegador de "Nova Chamada VIP" abre uma tela totalmente em branco
* **Onde está:** `functions/api/admin/orders-feed.ts:147` × `hooks/useAdminOrderNotifications.ts:187-189` × `app/admin/components/AdminModuleRouter.tsx:113`
* **Explicação amigável:** Quando chega uma chamada nova, a API de produção (`orders-feed.ts:147`) etiqueta a notificação com o destino `tab: 'appointments'` (em inglês). Quando a Nua clica na notificação que pula no canto da tela, o roteador do Admin (`AdminModuleRouter.tsx:113`) procura pela aba `'chamadas'` (em português). Como não existe case para `'appointments'`, **nenhuma tela é desenhada** e a URL vira `/admin/appointments`.
* **O que acontece na prática:** A Nua clica no alerta de nova chamada e cai numa tela preta vazia, parecendo que o painel inteiro quebrou.
* **Como corrigir:** Retornar `tab: isFinalized ? 'historico' : 'chamadas'` em `orders-feed.ts:147` e passar também `normalizeModuleId` no `useAdminShell.ts`.

---

## 3. Parte 2 — Bugs Críticos na Agenda e Disponibilidade (Por que os horários ficam malucos)

### 🔴 BUG-05: Fechar um mês inteiro (ou dia da semana) que tenha 1 chamada marcada faz o dia daquela chamada ficar **ABERTO** para novos clientes!
* **Onde está:** `components/nua/admin/appointments/AvailabilityTab.tsx:275-311, 447-460`, `components/nua/admin/appointments/useAppointmentsData.ts:463-469` e `lib/appointments/availabilityEngine.ts:99-100`
* **Explicação amigável:** Imagine que a Nua tem **1 chamada marcada no dia 15 de Dezembro às 14h** e resolve fechar o mês de Dezembro inteiro (ou desligar todas as terças-feiras) para não receber mais ninguém. O código mostra um aviso dizendo que a chamada do dia 15 será mantida e, para tentar "proteger" aquela chamada, grava `newDayOverrides['2026-12-15'] = true` (abertura forçada do dia inteiro!). Porém, no motor de disponibilidade (`availabilityEngine.ts:99-100`), `dayOverrides[data] === true` significa **"forçar o dia inteiro a ficar ABERTO, ignorando mês fechado e dia da semana fechado"**!
* **O que acontece na prática:** O dia 15 de Dezembro continua **100% aberto no site público** nos horários das 15h, 16h, 17h, 18h, 19h e 20h, e o painel mostra que Dezembro ainda tem "1 dia livre"! Pior: uma chamada já salva no banco **nunca** é apagada quando você fecha a agenda para novas reservas — portanto, gravar `dayOverrides = true` era totalmente desnecessário e causou o efeito oposto ao desejado.
* **Como corrigir:** Remover os loops que gravam `newDayOverrides[b.date] = true` ao fechar um mês ou desligar um dia da semana. Fechar a agenda deve sempre bloquear **novas** reservas sem mexer nas chamadas que já estão marcadas.

---

### 🔴 BUG-06: É impossível fechar o resto de um dia se já existir 1 chamada marcada nele
* **Onde está:** `components/nua/admin/appointments/AvailabilityTab.tsx:379-395` e `components/nua/admin/appointments/CalendarTab.tsx:606-614`
* **Explicação amigável:** Se a Nua tem uma única chamada às 14h hoje e surgiu um imprevisto à tarde, ela vai tentar clicar no dia para fechar o restante dos horários (15h às 21h) para novos clientes. O código bloqueia a ação!
  * Na aba **Disponibilidade**: se houver 1 chamada no dia, clicar no dia abre o modal da chamada em vez de permitir fechar o resto do dia; se houver 2 chamadas, abre um modal (`protectedDayModal`) dizendo que ela precisa **remarcar ou cancelar os clientes existentes primeiro** para poder fechar o dia!
  * Na aba **Calendário**: mesmo que a chamada de hoje **já tenha sido concluída** (`status === 'concluida'`), a trava `selectedDayCalls.length > 0` (`CalendarTab.tsx:606`) continua proibindo fechar o resto do dia!
* **O que acontece na prática:** Para fechar a tarde livre de um dia que já tem 1 atendimento de manhã, o sistema obriga a Nua a cancelar ou remarcar o cliente da manhã. Isso não faz o menor sentido operacional.
* **Como corrigir:** Permitir sempre fechar qualquer dia para **novas reservas** com 1 clique, mantendo intactas as chamadas que já estiverem confirmadas naquele dia.

---

### 🔴 BUG-07: Configurar antecedência mínima de `0h`, `1h` ou `2h` não funciona (anulado silenciosamente por trava escondida de `4h` e `6h`)
* **Onde está:** `components/nua/admin/appointments/AvailabilityTab.tsx:1169-1185` × `lib/appointments/availabilityEngine.ts:167` × `lib/appointments/types.ts:177, 196` × `components/nua/admin/appointments/AppointmentsModals.tsx:288-421`
* **Explicação amigável:** Na aba Disponibilidade → Regras de Reserva, existe um seletor de **"Antecedência mínima"** com as opções `Sem antecedência (0h)`, `1 hora antes`, `2 horas antes`, `4 horas`, etc. Porém, o motor que calcula os horários no site (`availabilityEngine.ts:167`) faz `Math.max(settings.minNoticeHours, modality.minNoticeHours)`. E cada modalidade vem de fábrica com `minNoticeHours: 4` (30 min) e `minNoticeHours: 6` (60 min) — um campo que **não existe na tela de editar modalidade**!
* **O que acontece na prática:** A Nua coloca "1 hora antes" para aceitar chamadas de última hora hoje, recebe a mensagem verde *"Configurações salvas com sucesso!"*, mas o site ignora completamente e continua exigindo 4h ou 6h de antecedência.
* **Como corrigir:** Usar exclusivamente `settings.minNoticeHours` no motor de disponibilidade, removendo a trava invisível por modalidade.

---

### 🟠 BUG-08: A antecedência mínima falha completamente na virada da meia-noite
* **Onde está:** `lib/appointments/availabilityEngine.ts:207-213`
* **Explicação amigável:** O código só verifica a antecedência mínima se a data consultada for igual à data de **hoje** (`if (dateStr === scheduleNow.dateString)`).
* **O que acontece na prática:** Se a Nua configurar **24 horas de antecedência** para se organizar, e um cliente entrar no site às **23h50 de hoje**, todos os horários de **amanhã cedo** passam sem nenhuma checagem! Ela pode acordar com uma chamada marcada sem o prazo mínimo que configurou.
* **Como corrigir:** Comparar a diferença real em horas/minutos entre o instante atual (`currentDate`) e o instante do horário candidato em qualquer data, não apenas no dia de hoje.

---

### 🟠 BUG-09: Três campos diferentes brigando pelo "Limite de agendamento no futuro" (`maxAdvanceMonths` vs `advanceDays` vs `maxFutureDays`)
* **Onde está:** `components/nua/admin/appointments/AvailabilityTab.tsx:582, 1188-1210`, `components/nua/admin/appointments/OverviewTab.tsx:74-87`, `components/nua/admin/appointments/AppointmentsV9Modals.tsx:80` e `lib/appointments/availabilityEngine.ts:145`
* **Explicação amigável:** O banco guarda 3 nomes para a mesma coisa:
  1. O motor do site público lê **só** `maxAdvanceMonths` (em meses, padrão `3`);
  2. O seletor da aba Disponibilidade mostra em dias (`30, 60, 90, 120, 180, 365 dias`), lendo `advanceDays ?? maxFutureDays ?? 120` (mas se o valor padrão `90` não casar, mente na tela) e converte `Math.round(days / 30)` para meses;
  3. O validador do modal de proposta (`AppointmentsV9Modals.tsx:80`) e o servidor local (`localApiServer.mjs:515`) ignoram `maxAdvanceMonths` e usam `advanceDays ?? maxFutureDays`!
  * Além disso, a aba Disponibilidade deixa a Nua navegar para **2027** e clicar em meses do ano que vem para "Abrir mês", sem avisar que esses meses estão bloqueados pelo limite de 90 dias (e a aba `Início` soma todos os meses de 2026 como "12 meses abertos" mesmo que só 3 estejam dentro da janela!).
* **Como corrigir:** Unificar em **um único campo** (`maxFutureDays`) usado por todo o sistema e sombrear no calendário os dias além dessa janela.

---

### 🟠 BUG-10: Editar horário da semana apaga silenciosamente um 2º turno + botão "Copiar de segunda" não valida erros
* **Onde está:** `components/nua/admin/appointments/AvailabilityTab.tsx:489-574, 1052`
* **Explicação amigável:** O banco e o motor de horários suportam múltiplos turnos no mesmo dia (ex.: manhã `09:00–12:00` e noite `18:00–22:00`). Porém a aba Disponibilidade só desenha `ranges[0]` (`L1052`) e, ao editar o horário, sobrescreve a lista com 1 único turno (`ranges: [{ start, end }]`), **apagando qualquer segundo turno**. Além disso:
  * O botão **"Copiar segunda p/ Seg–Sex"** (`L552-574`) copia o horário de segunda sem validar se o horário de término é menor que o de início;
  * Se a segunda-feira estiver **desligada** (folga), clicar nesse botão **desliga Terça a Sexta inteiras** sem checar se existem chamadas marcadas nesses dias;
  * No backend de produção (`functions/api/appointments/admin.ts:102-114`), `updateSettings` também não valida se `start >= end` (permitindo salvar `20:00 às 14:00`, o que fecha o dia inteiro sem dar erro).

---

### 🟠 BUG-11: Condição de corrida no salvamento de configurações (cliques rápidos revertem sozinhos e falhas são fingidas como sucesso)
* **Onde está:** `components/nua/admin/appointments/useAppointmentsData.ts:77-104, 178-186, 392-442`
* **Explicação amigável:** Existem **dois mecanismos de salvamento brigando entre si** dentro de `useAppointmentsData.ts`:
  1. As funções da tela chamam `persistSettings` / `handleSaveSettings` imediatamente;
  2. Um `useEffect` de auto-save (linhas 77–104) observa qualquer mudança em `settings` e dispara outro salvamento 600ms depois (e se você sair da tela antes de 600ms, o `clearTimeout` cancela o salvamento!).
  3. Pior: toda vez que uma ação termina, ela dispara o evento `'nua-appointments-updated'`, que manda buscar todos os dados do servidor de novo 400ms depois (`L183`). Se a Nua clicar rápido em 2 ou 3 dias seguidos no calendário para fechá-los, a resposta do 1º clique volta do servidor *depois* do 3º clique e **desfaz os cliques seguintes na tela**!
  4. E se o servidor der erro ao salvar, `handleSaveSettings` (`L394`) já marcou `initialSettingsRef` como salvo antes da resposta e não desfaz a alteração na tela — mentindo que salvou.

---

## 4. Parte 3 — Bugs nos Modais, Status, Propostas e Reembolsos (V9)

### 🔴 BUG-12: Enviar uma proposta de novo horário faz a chamada aparecer como **"CANCELADA"** em vermelho!
* **Onde está:** `components/nua/admin/appointments/AppointmentsV9Modals.tsx:880-903`, `components/nua/admin/appointments/OverviewTab.tsx:230-244` e `components/nua/admin/appointments/CalendarTab.tsx:368-371, 538-545`
* **Explicação amigável:** Quando a Nua envia uma proposta de novo horário para um cliente já confirmado, o status no banco muda para `'reagendamento_pendente'`. Porém, a cascata de `if / else` que desenha o selo de status em cada tela esqueceu desse caso:
  * **Na ficha da chamada (`BookingDetailModal`, linhas 880–903):** verifica se é pedido de cancelamento (`hasRequest`), se é `confirmada`, `aguardando_pagamento`, `concluida` ou `nao_compareceu`. Como não é nenhum desses, cai no `else` final e exibe um selo vermelho: **`"Cancelada"`**!
  * **Na aba Início (`OverviewTab`, linha 243):** cai no `else` e exibe **`"Aguardando pagamento"`** para um cliente que já pagou!
  * **Na aba Calendário (`CalendarTab`, linhas 368 e 544):** pinta chamadas **já concluídas** de amarelo ("Pendência") e escreve **`"Pendente"`** na barra lateral! Além disso, o calendário mostra chamadas com falta (`nao_compareceu`) no quadradinho do dia, mas ao clicar no dia a barra lateral filtra `nao_compareceu` e diz *"Nenhuma chamada agendada para esta data"* (`L186` vs `L325`).
* **Como corrigir:** Criar uma única função central `getBookingStatusBadge(booking)` e usá-la em todas as abas e modais.

---

### 🔴 BUG-13: O modal de Propor Novo Horário apaga tudo o que a Nua está digitando a cada 45 segundos — e dá sinal verde para horários que o servidor rejeita!
* **Onde está:** `components/nua/admin/appointments/AppointmentsV9Modals.tsx:59-151, 215-246` e `components/nua/admin/appointments/useAppointmentsData.ts:173-176`
* **Explicação amigável:** Dois problemas graves acontecem juntos no `ProposalModal`:
  1. **Apagão a cada 45s:** O `useEffect` que inicializa os campos `date`, `time` e `note` (linhas 215–246) colocou `[booking, isOpen, todayStr, settings, modalities, bookings]` na lista de dependências. Como `useAppointmentsData.ts:173` recarrega a lista do servidor em segundo plano a cada **45 segundos** (criando novas referências de `settings`, `modalities` e `bookings`), se a Nua estiver escolhendo uma data e escrevendo uma mensagem para o cliente quando o relógio bater 45s, **o formulário inteiro reseta sozinho na cara dela**!
  2. **Validador falso (`validateScheduleTimeV9`):** O modal tem um validador próprio (linhas 59–151) que deixa digitar qualquer minuto (ex.: `14:10`, ou `14:15` para uma chamada de 60 min) e mostra um selo verde: *"Horário disponível para reservar"*. Mas quando ela clica em **"Enviar proposta"**, o servidor (`functions/api/appointments/admin.ts:638`) usa o motor oficial, que só aceita horários cravados na grade de 15/30 min, e devolve **Erro 409 ("Este horário acabou de ser reservado ou não está mais disponível")**!
  3. **Bônus:** Quando a Nua envia uma proposta de novo horário (`admin.ts:619-687`), **nenhum e-mail é enviado ao cliente** avisando que há uma proposta esperando resposta!

---

### 🔴 BUG-14: Reembolso de chamadas pagas está 100% quebrado e inacessível na UI (e reembolso parcial de 50% devolve 100% do dinheiro!)
* **Onde está:** `components/nua/admin/appointments/AppointmentsV9Modals.tsx:465-519, 635-671`, `components/nua/admin/appointments/AppointmentsEditor.tsx:227-242`, `functions/api/appointments/admin.ts:360-539, 721-793` e `functions/api/_mercadopago.ts:220-235`
* **Explicação amigável:** O fluxo de cancelamento e reembolso tem **6 falhas encadeadas**:
  1. **Seletor de reembolso ignorado no cancelamento pela Admin:** Quando a Nua cancela uma chamada paga no `CancellationAnalysisModal`, a tela mostra um seletor `"Reembolso ao cliente: Integral (100%) / Parcial (50%) / Sem devolução (0%)"`. Porém, na linha 507, ao clicar em confirmar, o código chama `onAdminCancel(booking.id, reason)` e **joga fora a variável `refundPercent`**!
  2. **O cancelamento não devolve o dinheiro no Mercado Pago:** No servidor (`admin.ts:423`), a ação `cancel` apenas marca `refundStatus = 'pending'` e espera que alguém chame uma segunda ação chamada `'retry_refund'`.
  3. **O botão de acionar `'retry_refund'` foi esquecido fora da interface V9:** A função `handleRetryRefund` está escrita em `AppointmentsEditor.tsx:227-242`, mas **não é passada para nenhuma aba nem modal**! Só existia na aba antiga `AppointmentsQueueTab.tsx` que foi abandonada.
  4. **Texto enganoso empurrando para o módulo Financeiro:** Os modais dizem à Nua: *"Estornos e comprovantes ficam no módulo Financeiro"* (`AppointmentsV9Modals.tsx:669, 964`). Só que o módulo Financeiro (`CommercialFinanceEditor.tsx`) é **100% somente leitura** e não tem nenhum botão de estorno!
  5. **Reembolso parcial de 50% devolve 100% no Mercado Pago:** Mesmo que `retry_refund` fosse chamado após aprovar 50% de reembolso, a função `refundMercadoPagoPayment` (`_mercadopago.ts:228`) envia `body: '{}'` sem o campo `amount`, o que faz a API do Mercado Pago devolver **100% do valor pago**!
  6. **Estado zumbi ao recusar cancelamento + erro 503 em reserva manual:** Se o cliente pediu cancelamento depois de uma proposta da Nua e a Nua recusa o cancelamento (`admin.ts:733`), a chamada volta para `status: 'reagendamento_pendente'` com `proposal: null` (travada num limbo sem proposta e sem confirmação). E se a chamada foi criada manualmente como paga (`transactionId: 'MANUAL_ADMIN_...'`, linha 208), tentar cancelá-la (`admin.ts:376`, que só checa prefixo `'ADMIN_'`) tenta estornar o ID fictício `MANUAL_ADMIN_` no Mercado Pago e falha com **Erro 503**!

---

### 🔴 BUG-15: Cliente aceita proposta de novo horário e recebe "Confirmado com sucesso!" mesmo quando o banco rejeitou por conflito
* **Onde está:** `functions/api/appointments/lookup.ts:210-224` × `functions/api/supabase/appointments.ts:335-352`
* **Explicação amigável:** Quando o cliente clica em "Aceitar novo horário" no voucher, `rescheduleAppointmentAtomically` roda uma função transacional no PostgreSQL. Se aquele horário já tiver sido ocupado, ela retorna `{ success: true, rescheduled: false }`. Em `lookup.ts:216`, o programador checou apenas `if (!saveRes.success)` e esqueceu de checar `|| !saveRes.rescheduled` (como foi feito em `admin.ts:855`).
* **O que acontece na prática:** O banco recusa a troca de horário para evitar conflito, mantém a chamada na data antiga, mas a API responde **HTTP 200 ("Novo horário confirmado com sucesso!")** e mostra a data nova na tela do cliente!

---

### 🟠 BUG-16: Ocultar ou excluir uma modalidade em "Tipos e Preços" quebra o reagendamento de clientes que já pagaram
* **Onde está:** `components/nua/admin/appointments/AppointmentsModalitiesTab.tsx:175-178`, `components/nua/admin/appointments/AppointmentsModals.tsx:331-416` e `lib/appointments/availabilityEngine.ts:298`
* **Explicação amigável:** No rodapé da aba "Tipos e Preços", há um aviso garantindo: *"Alterar preços ou ocultar modalidades vale apenas para novas reservas — chamadas já pagas mantêm o valor e a duração contratados."* Porém, quando a Nua ou o cliente tentam reagendar uma chamada já paga (`admin.ts:638, 815` e `lookup.ts:171`), o servidor chama `validateBookingAttempt`, que exige que a modalidade ainda exista e esteja com `active === true` (`availabilityEngine.ts:298`).
* **O que acontece na prática:** Se a Nua ocultar uma modalidade antiga para não vender mais, todos os clientes que já compraram aquela modalidade ficam **impedidos de reagendar** (erro 409: *"Modalidade de chamada inválida ou inativa"*).
* **Outros bugs em "Tipos e Preços":**
  * O modal de editar modalidade (`ModalityEditModal`) permite salvar preço **`R$ 0,00`** (`min={0}` na linha 356), o que quebra a criação de Pix no Mercado Pago;
  * O passo do campo de duração é `min={10}` com `step={15}` — se você baixar para 10 min e clicar em `+`, os valores viram `25, 40, 55 min` (e você não consegue voltar para `15` ou `30` pelo botão `+`/`-`!);
  * As "Regras da chamada" (`rules`) aparecem nos cards da aba (`AppointmentsModalitiesTab.tsx:117-131`), mas **não existe campo no modal para editá-las** (e novas modalidades criadas pelo botão "+ Novo tipo" recebem regras fixas no código: `'Pontualidade britânica'`);
  * O modal fecha imediatamente na linha 552 de `AppointmentsEditor.tsx` **sem esperar (`await`)** a resposta de `handleSaveModalities` do servidor.

---

### 🟠 BUG-17: Funcionalidades importantes sumiram dos botões na mudança para a V9 (mas continuam rodando escondidas no banco!)
* **Onde está:** `components/nua/admin/appointments/AppointmentsEditor.tsx:86-131, 495-529`
* **Explicação amigável:** Quando criaram as 5 abas atuais (V9), esqueceram de colocar botões para 4 funções que já estão prontas no código:
  1. **Criar chamada manual / cortesia VIP** (`handleCreateManualBooking` + `CreateManualBookingModal`): não tem botão em lugar nenhum para abrir;
  2. **Marcar que o cliente não compareceu (`nao_compareceu`)** (`handleMarkAbsent`): não tem botão na ficha da chamada (`BookingDetailModal`);
  3. **Bloquear apenas algumas horas de um dia** (ex.: bloquear das 14h às 16h para ir ao médico sem fechar o dia inteiro — `blockedSlots`): o motor do site continua lendo `settings.blockedSlots` do banco, mas a tela que mostrava e editava esses bloqueios (`AppointmentsSettingsTab.tsx`) foi desconectada! Se houver um bloqueio parcial gravado no banco, ele vira um "fantasma invisível" que some com horários sem ninguém conseguir ver ou apagar no Admin;
  4. **Aviso de que o site público está com Chamadas pausadas** (`CHAMADAS_PUBLIC_ENABLED = false` em `lib/featureFlags.ts`): o Admin não mostra nenhuma faixa avisando que a página pública `/chamadas` está em modo informativo ("Em breve").

---

### 🟡 BUG-18: Outros bugs visuais e de interação nas abas e modais de Chamadas
* **Botão "Chamar no WhatsApp" quebrado para clientes do Telegram (`@usuario`):** Em `components/nua/admin/appointments/AppointmentsV9Modals.tsx:844, 914-924`, o código faz `booking.clientPhone.replace(/\D/g, '')` (apaga tudo que não é número). Se o cliente informou Telegram `@carlos88`, sobra só `"88"` e o botão abre `https://wa.me/88`! E para números brasileiros sem `55` na frente, gera `wa.me/1199999...` sem código do país.
* **Duplo clique dispara 2 e-mails iguais para o cliente:** Em `AppointmentsV9Modals.tsx:1124-1185`, os botões *"Confirmar pagamento manualmente"*, *"Marcar chamada como realizada"*, *"Retirar proposta"* e *"Restaurar para Confirmada"* não têm estado `loading` nem `disabled`. Dois cliques rápidos enviam 2 requisições e 2 e-mails repetidos.
* **Ordem invertida na aba "Agendamentos":** Em `components/nua/admin/appointments/BookingsTab.tsx:72`, a tabela ordena da data mais antiga para a mais nova (`a.date.localeCompare(b.date)`). No filtro padrão `"Todos"`, chamadas concluídas ou canceladas de meses atrás ficam no topo da tela, jogando as próximas chamadas para o fim da página.
* **Número da aba "Agendamentos" não bate com a tabela:** A aba no topo mostra `filteredBookings.length` (que conta só chamadas ativas, ex.: `2`), mas ao clicar nela a tabela mostra todas as chamadas do histórico (ex.: `18`).
* **Formulário de link da sala aberto em chamadas canceladas + mutação direta de prop:** Em `BookingDetailModal` (`L821-831` e `L1006`), se uma chamada foi cancelada sem link de sala, a caixa de colar e salvar link da reunião continua aparecendo aberta; e ao salvar um link, o código muta a prop `booking.meeting.url = ...` diretamente.
* **HTML inválido (`<div>` clicável dentro de `<button>`):** Em `CalendarTab.tsx:330-375` e `AvailabilityTab.tsx:871-940`, elementos interativos com `onClick` estão aninhados dentro de tags `<button>`, violando a especificação HTML5 e prejudicando o clique em dispositivos móveis.

---

## 5. Parte 4 — Bugs Graves de Fuso Horário (Irlanda vs. Brasil) e Double-Booking

### 🔴 BUG-19: Fuso Horário de Dublin (`Europe/Dublin`) exibido para o cliente como "Horário de Brasília" (3 a 4 horas de erro!) + Bug das `"24:00"` que quebra o PostgreSQL
* **Onde está:** `lib/appointments/types.ts:1-2`, `lib/appointments/timeUtils.ts:90-118, 225-235`, `functions/api/supabase/appointments.ts:79-81`, `lib/appointments/notifications.ts:24-66`, `components/nua/chamadas/ChamadasTimeSlotPicker.tsx:43` e `components/nua/chamadas/ChamadasBookingSummaryCard.tsx:84`
* **Explicação amigável:** O fuso padrão da agenda da Nua é **`Europe/Dublin` (Irlanda)** — 3 ou 4 horas à frente do Brasil. Aqui acontecem **4 erros graves**:
  1. **Mentira de fuso na reserva pública:** A API `/api/appointments/availability` devolve os horários no fuso da Irlanda (ex.: `14:00` de Dublin). Só que a tela pública não converte para o fuso do cliente e escreve em cima: **`"Horários Livres (Horário de Brasília)"`**! O cliente no Brasil escolhe `14:00` achando que é 14h de Brasília, mas reservou 14h da Irlanda (10h ou 11h da manhã no Brasil).
  2. **Mudança de dia descartada nos e-mails e vouchers (`formatDualTimezone`):** Em `timeUtils.ts:225-235`, quando uma chamada é às `21:30` do dia 14 no Brasil (`00:30` do dia 15 em Dublin), a função converte a hora mas **joga fora a data convertida**, fazendo o e-mail dizer **`Data: 15/11 às 21:30 (Brasília)`** — **1 dia inteiro errado**!
  3. **Bug da meia-noite `"24:00"` (`getScheduleNow`):** Em `timeUtils.ts:90-98`, `Intl.DateTimeFormat('en-CA', { hour12: false })` sem `hourCycle: 'h23'` formata meia-noite e meia no motor V8/Cloudflare como **`"24:30"`** em vez de `"00:30"`. Quando `bookingToSupabaseRow` (`supabase/appointments.ts:80`) monta a data UTC `"2026-11-15T24:30:00.000Z"`, o PostgreSQL rejeita porque hora `24` é inválida!
  4. **Calendário `.ics` e link de WhatsApp errados (`notifications.ts:25-66`):** O arquivo `.ics` (Adicionar ao Calendário) crava `TZID=America/Sao_Paulo` em cima do horário de Dublin (salvando 3–4h errado na agenda do celular do cliente) e a mensagem de WhatsApp manda o link `https://nuaborges.com/chamadas/reserva` (**sem o `.br`**!).

---

### 🔴 BUG-20: Duas pessoas podem agendar o mesmo horário (Double-Booking) em 2 cenários reais + Ressurreição de chamadas já concluídas/canceladas
* **Onde está:** `functions/api/supabase/appointments.ts:240-248`, `functions/api/appointments/availability.ts:84-86`, `functions/api/finance/webhook.ts:336-435`, `functions/api/appointments/pix.ts:53-128`, `functions/api/payments/status.ts:125-134` e `supabase/migrations/202611170001_appointments_atomic_reservation.sql:109-127`
* **Explicação amigável:**
  1. **Cenário 1 — Proposta de reagendamento ou pedido de cancelamento em aberto (`reagendamento_pendente`):** Quando a Nua propõe mudar a data de uma chamada paga (ou o cliente pede cancelamento), o status vira `'reagendamento_pendente'`. A tela promete: *"O horário original continua reservado até a decisão"*. Porém, a busca do banco (`supabase/appointments.ts:243` e `availability.ts:85`) só procura `.in('status', ['confirmada', 'aguardando_pagamento'])` — **esquecendo `'reagendamento_pendente'`!** O horário original volta a aparecer como **Livre** no site para qualquer outra pessoa tentar comprar!
  2. **Cenário 2 — Pagamento Pix pago após os 15 minutos de expiração:** Quando uma reserva pendente passa de 15 minutos, o horário volta a ficar livre na vitrine e o Cliente B pode reservar e pagar. Porém, o código QR Pix gerado no Mercado Pago continua válido por mais tempo. Se o Cliente A pagar aquele QR Code atrasado, o `webhook.ts:392`, o `pix.ts:85` e o `payments/status.ts:129` **não verificam se a reserva já expirou ou se o horário foi ocupado pelo Cliente B** — e confirmam o Cliente A também no mesmo horário!
  3. **Cenário 3 — Ressurreição de chamadas concluídas, com falta ou canceladas:**
     * Em `pix.ts:53-85`, o código acha que a chamada só está paga se `status === 'confirmada'`. Se uma chamada já foi **`'concluida'`** ou marcada como **`'nao_compareceu'`** e alguém abrir o voucher ou chamar `/api/appointments/pix`, o endpoint **volta o status dela para `'confirmada'`** e reenvia e-mail de confirmação!
     * Em `payments/status.ts:128-133`, nem sequer `status === 'cancelada'` é verificado: consultar o status de pagamento de uma chamada cancelada ressuscita ela para `'confirmada'`!
  4. **Cenário 4 — Contradição na função SQL `reserve_vip_appointment` (`202611170001_appointments_atomic_reservation.sql:112, 122`):** A query SQL usa `WHERE a.status <> 'cancelada'`, o que significa que chamadas marcadas como **`nao_compareceu`** ou **`concluida`** continuam contando contra o limite diário (`v_daily_limit`) no SQL, enquanto no motor JS (`availabilityEngine.ts:184`) elas não contam!

---

## 6. Parte 5 — Efeitos Colaterais no Resto do Admin (Financeiro, Histórico, Dashboard, Briefing, Spotlight, Ajuda e Nua IA)

### 🔴 BUG-21: O módulo Financeiro conta cada Chamada VIP **DUAS VEZES** (dobrando o faturamento!), disfarça chamadas de "Packs", inventa R$ 1.500 em cortesias e soma chamadas canceladas como receita paga
* **Onde está:** `functions/api/stripe/dashboard.ts:103-206, 254-296` e `functions/api/admin/orders-feed.ts:43-196`
* **Explicação amigável:** Este é um dos problemas mais sérios de todo o painel administrativo:
  1. **Receita dobrada (2x):** Quando uma chamada é criada (`book.ts:236`), ela é salva na tabela `appointments` **e também** uma cópia é salva na tabela `orders`. Quando você abre o módulo **Financeiro** (`stripe/dashboard.ts`), ele soma todas as linhas de `orders` como vendas de **"Conteúdos & Packs"** (`L117-144`) e logo abaixo soma todas as linhas de `appointments` como **"Chamadas de Vídeo"** (`L178-206`) **sem remover as duplicatas**! Uma única chamada de R$ 250 adiciona **R$ 500** no Faturamento Bruto do painel!
  2. **Duplicação no Histórico e nas Notificações (`orders-feed.ts:163-191`):** O feed de pedidos faz a mesma coisa — toda chamada paga aparece duas vezes: uma como `"Chamada VIP"` e outra como `"Pack / Conteúdo: chamada-30"`.
  3. **Chamadas canceladas somadas como dinheiro no bolso:** Em `stripe/dashboard.ts:181`, `isPaid` é verdadeiro se `payment.status === 'approved'`. Se uma chamada paga for **cancelada**, ela continua sendo somada normalmente na receita confirmada (`succeeded`)!
  4. **Reembolsos de chamadas nunca aparecem em "Reembolsos" e inventam "10% de Saldo a Liberar":** Não existe status `'refunded'` para chamadas na linha 199 de `stripe/dashboard.ts` (`status: isPaid ? 'succeeded' : 'pending'`). Quando uma chamada é reembolsada no Mercado Pago (`payment.status = 'refunded'`), ela vira `'pending'` (Pendente). Com isso, o card de **Reembolsos fica em R$ 0,00**, e a linha 296 vê que existe 1 item pendente e **inventa um "Saldo a Liberar" igual a 10% de todo o faturamento do período** (`totalReceivedPeriod * 0.1`)!
  5. **Cortesia de R$ 0 vira R$ 1.500,00:** Na linha 182 de `stripe/dashboard.ts`, escreveram `Number(a.payment?.amount || a.price || 1500)`. Como `0 || 1500` em JavaScript dá `1500`, qualquer chamada gratuita/cortesia soma **R$ 1.500,00 falsos** no financeiro!
  6. **Chamadas canceladas/expiradas rotuladas como "Confirmada" nos Alertas e somadas na receita da Dashboard:** Em `orders-feed.ts:56, 141`, `'cancelada'` e `'nao_compareceu'` estão dentro de `PAID_CONFIRMED_STATUSES` e caem no `else` `'Confirmada'`, sendo somadas por `DashboardModule.tsx:138-158` no faturamento do mês!

---

### 🔴 BUG-22: O Histórico de Pedidos some com chamadas `nao_compareceu`, esconde link/notas e o botão "Reativar" destrói o ID do pagamento no Mercado Pago
* **Onde está:** `components/nua/admin/HistoricoPedidosModule.tsx:96-120, 221-230`
* **Explicação amigável:**
  1. **Faltas desaparecem do sistema:** Na linha 96, o Histórico procura por `b.status === 'ausente'`, mas o nome salvo pelo banco é `'nao_compareceu'`. Resultado: chamadas em que o cliente faltou saem da fila ativa e **nunca entram no Histórico**!
  2. **Link da sala e observações invisíveis:** Nas linhas 118 e 120, o Histórico tenta ler `b.meetingUrl` e `b.notes`, mas os nomes reais no objeto são `b.meeting?.url` e `b.clientNotes`.
  3. **Botão "Reativar / Devolver à Fila" perigoso:** Na linha 223, clicar em "Reativar" numa chamada finalizada ou cancelada envia a ação `'confirm'` para o backend (`admin.ts:269-285`). Essa ação **marca uma chamada não paga como PAGA (`manual_confirmed`), apaga o `transactionId` original do Mercado Pago trocando por `ADMIN_...` (impedindo qualquer reembolso futuro!) e dispara um e-mail de "Pagamento Confirmado!" para o cliente**!

---

### 🟠 BUG-23: Briefing Diário mostra "0 Chamadas VIP Hoje" (mesmo tendo chamadas hoje!) e o botão "Conversar com a Nua IA" está morto
* **Onde está:** `components/nua/admin/briefing/useDailyBriefing.ts:74-80` e `components/nua/admin/briefing/DailyBriefingModal.tsx:195-204` × `components/nua/admin/ai/useNuaAiChat.ts:56`
* **Explicação amigável:**
  1. **Data de compra vs. Data da chamada:** Em `useDailyBriefing.ts:76`, para contar quantas chamadas a Nua tem **hoje**, o código compara `o.createdAt` (o dia em que o cliente *comprou* a chamada) em vez de `o.meta?.date` (o dia em que a chamada *vai acontecer*), e nem exclui chamadas canceladas! Se a Nua tiver 3 chamadas marcadas para hoje que foram compradas na semana passada, o Briefing da manhã diz: **"0 Chamadas VIP Hoje"**.
  2. **Botão morto:** O botão **"Conversar com a Nua IA"** no rodapé do Briefing (`DailyBriefingModal.tsx:200` e `app/admin/page.tsx:287`) dispara o evento `'open_nua_ai_chat'`, mas a gaveta da IA (`useNuaAiChat.ts:56`) escuta o evento **`'open_nua_ai'`** (sem `_chat`). Clicar no botão só fecha o modal e não abre nada.

---

### 🟠 BUG-24: A Assistente Nua IA (Nay) está desconectada e em conflito direto com a agenda V9 de Chamadas
* **Onde está:** `components/nua/admin/ai/ProposalActionCard.tsx:101-122, 236-244`, `functions/api/nua-ai/approve-action.ts:159-161`, `lib/nuaAi/tools/agendaTools.mjs:9-111`, `lib/nuaAi/toolRegistry.mjs:1612-1928` e `lib/nuaAi/tools/unifiedHistoryTools.mjs:75-94`
* **Explicação amigável:** Se a Nua tentar gerenciar Chamadas conversando com a assistente Nay:
  1. **Bloqueio de permissão 401/403:** As ferramentas de agenda não estão incluídas em `CLIENT_OPERATIONAL_TOOLS` (`toolRegistry.mjs:2215`), `approve-action.ts:161` proíbe o papel `'client'` de aprovar ações, e `ProposalActionCard.tsx:237` faz `fetch` sem enviar o token/cookie de autenticação!
  2. **Bloquear/desbloquear data pela IA não conversa com a aba Disponibilidade:** Quando você fecha um dia no calendário V9, ele grava `dayOverrides[data] = false`. Quando você pede para a Nay desbloquear esse dia, `agendaTools.mjs:77` só olha a lista antiga `blockedDates` e responde: *"A data não estava bloqueada"*. E se pedir para a Nay bloquear um dia que tinha `dayOverrides[data] = true`, ela adiciona em `blockedDates`, mas como `dayOverrides` tem prioridade maior no motor (`availabilityEngine.ts:82`), **o dia continua aberto no site**!
  3. **Perguntar "Quais chamadas tenho amanhã?" retorna vazio:** `list_appointments` (`toolRegistry.mjs:524, 1617`) filtra pela data de criação do pedido (`createdAt`) antes da data da chamada (`date`)!
  4. **Perguntar "Quais horários estão livres?" inventa horários errados:** `get_availability` (`toolRegistry.mjs:1658-1710`) recalcula horários com uma fórmula própria em fuso `-03:00` (ignorando Dublin, `monthAvailability`, `dayOverrides` e a grade de 15/30 min).
  5. **Datas aparecem como `undefined` para a IA:** `unifiedHistoryTools.mjs:89` e `assistantServices.mjs:192` leem `a.dateTime` e `a.meetingUrl` (que não existem), entregando para a IA o texto: *"Chamada marcada para undefined"*.

---

### 🟠 BUG-25: Atalhos quebrados no Dashboard, Sino de Notificações, Busca Spotlight e Ajuda Contextual (`?`)
* **Onde está:** `components/nua/admin/DashboardModule.tsx:109-131, 667-694`, `components/nua/admin/NotificationCenter.tsx:135`, `components/nua/admin/spotlight/useSpotlightSearch.ts:83-122, 249-259`, `components/nua/admin/spotlight/catalog.ts:115` e `components/nua/admin/help/helpCatalog.ts:1077-1160`
* **Explicação amigável:**
  * **Dashboard esconde chamadas da noite após as 21h:** `DashboardModule.tsx:109` calcula "hoje" usando UTC (`new Date().toISOString().split('T')[0]`). No Brasil (UTC-3), deu 21h00 o relógio UTC já virou para o dia seguinte — e qualquer chamada marcada para hoje às 21h30 ou 22h **some do card "Próximas chamadas VIP"**!
  * **Botões "Detalhes" no Dashboard e no Sino não abrem a chamada clicada:** Eles apenas levam para a aba geral `chamadas` sem passar o `id` da chamada, obrigando a Nua a caçar o cliente de novo na lista.
  * **Busca Spotlight (`Ctrl+K`) troca Packs por Chamadas e zera receita:** Em `useSpotlightSearch.ts:255`, qualquer compra de **Pack Avulso** cai no `else` e recebe a etiqueta falsa **`CHAMADA VIP`** (e ao clicar abre o módulo de Chamadas!). E ao digitar *"quanto faturei"* no Spotlight (`L83`), ele esquece os status `'confirmada'` e `'concluida'`, somando **R$ 0,00** para Chamadas! Além disso, o atalho *"Gerenciar Chamadas VIP"* (`catalog.ts:115`) passa `subAction: 'agenda'`, fazendo o módulo procurar uma reserva cujo ID seja `"agenda"`.
  * **Bolinha vermelha no menu lateral (`chamadasPending`) demora até 60s para atualizar** (`hooks/useAdminOrderNotifications.ts:216` chama `fetchOrdersFeed` sem `{ force: true }`, batendo no cache de 60s) e o módulo **Financeiro** mantém cache de 5 minutos sem recarregar quando uma chamada é confirmada ou estornada.
  * **Textos de Ajuda (`?`) desatualizados:** `helpCatalog.ts:1077-1160` e `helpSummary.mjs:68-72` ainda explicam uma versão antiga com 4 abas e citam a plataforma *"Whereby"* (que nem existe no sistema).

---

## 7. Parte 6 — Segurança, E-mails e Divergências entre Dev Local e Produção

### 🔴 BUG-26: 5 Falhas de Segurança e Integridade nos Endpoints de Chamadas e E-mails
1. **Qualquer pessoa com o `id` previsível da chamada vê todos os dados pessoais do cliente e pode cancelar a chamada (`/api/appointments/lookup`):**
   * Diferente de `pix.ts` (que exige o token secreto `tok_` com ≥ 24 caracteres e esconde dados sensíveis), `functions/api/appointments/lookup.ts:37-56` aceita o `id` sequencial (`app_<timestamp>_...`), devolve nome completo, e-mail, telefone/WhatsApp, notas íntimas e o próprio `publicToken`, e nos retornos de `POST` (`L146, 222, 252`) devolve até o **link da sala de vídeo (`meeting.url`)** mesmo para reservas não pagas!
2. **Trava eterna de horário sem pagar (`lookup.ts:106-130`):**
   * Um visitante que gera um Pix e **não paga** (`aguardando_pagamento`) pode enviar `POST /api/appointments/lookup` com `action: 'requestCancellation'`. Isso muda o status da reserva não paga para `'reagendamento_pendente'`, impedindo que ela expire após 15 minutos e travando a agenda da Nua de graça!
3. **Bypass de permissão em `/api/appointments/sync` (`functions/api/_middleware.ts:133` e `functions/api/appointments/sync.ts:47-69`):**
   * A rota está marcada como pública no middleware e só checa se o token de sessão é válido, sem checar o papel (`role`). Qualquer sessão restrita (`contract_client`, `client`) pode enviar um `POST` sobrescrevendo até 50 chamadas no banco como `confirmada` e `approved`.
4. **Injeção de HTML nos e-mails oficiais (`functions/api/appointments/_emailAppointmentHelper.ts:77-136, 264-277`) + E-mail disparado ANTES de salvar no banco:**
   * Os e-mails de confirmação e de link da sala colam `booking.clientName` e `booking.meeting.url` direto no HTML sem escapar caracteres (`<`, `>`, `"`), permitindo que alguém injete HTML/links falsos num e-mail disparado pelo domínio `@nuaborges.com.br`.
   * Além disso, `webhook.ts:415`, `pix.ts:107` e `admin.ts:285, 331` enviam o e-mail para o cliente **antes** de salvar a confirmação no Supabase (e sem checar se o salvamento deu certo!).
5. **Webhook do Mercado Pago sem validação de valor pago e CORS aberto para qualquer `*.pages.dev`:**
   * `functions/api/finance/webhook.ts:188-219` pula a validação de assinatura se `ENVIRONMENT !== 'production'` (variável não definida no `wrangler.toml`) e nas linhas `327–452` **não confere** se o valor pago no Pix (`paidAmount`) é igual ao preço da chamada (`booking.price`).
   * `functions/api/_middleware.ts:48, 71` aceita requisições autenticadas (`Access-Control-Allow-Credentials: true`) vindas de **qualquer** site `*.pages.dev` na internet.

---

### 🟠 BUG-27: Por que os testes locais não pegaram esses bugs? (`localApiServer.mjs` funciona diferente da Produção!)
O servidor local de desenvolvimento (`tools/localApiServer.mjs`) tem uma **reimplementação paralela de ~600 linhas** das rotas de Chamadas que se comporta de forma oposta às Functions reais do Cloudflare:
* No local, `orders-feed` manda `tab: 'chamadas'` (funciona); em produção, manda `tab: 'appointments'` (tela preta — BUG-04).
* No local, o Financeiro remove duplicatas entre `orders` e `appointments`; em produção, soma tudo dobrado (BUG-21).
* No local, `POST /api/appointments/book` não tem a variável `orderSave` (não dá crash); em produção, dá crash 500 (BUG-03).
* Em compensação, no local o `POST /api/appointments/pix` espera `{ bookingId }` em vez de `{ publicToken }` (dando 404 sempre no local) e o `POST /api/appointments/lookup` espera `accept_proposal` (snake_case) em vez de `acceptProposal` (camelCase), respondendo `200 OK` sem fazer nada!

---

## 8. Parte 7 — Lixo Técnico, Código Morto e Violações Visuais

### Mapa de Arquivos Mortos / Duplicados em `components/nua/admin/appointments/`
Das **8.449 linhas** da pasta `appointments`, **mais de 3.100 linhas (~37%) nunca são usadas**:

| Arquivo / Componente | Tamanho | Situação Real |
|---|---|---|
| `components/nua/admin/appointments.zip` | 38,2 KB | ❌ **Arquivo `.zip` de backup** esquecido dentro da pasta de código-fonte |
| `AppointmentsQueueTab.tsx` | 340 linhas | ❌ **100% morto** (substituído por `BookingsTab.tsx`) |
| `AppointmentsCalendarTab.tsx` | 578 linhas | ❌ **100% morto** (substituído por `CalendarTab.tsx`) |
| `AppointmentsSettingsTab.tsx` | 403 linhas | ❌ **100% morto** (substituído por `AvailabilityTab.tsx`) |
| `AppointmentBookingPage.tsx` | 548 linhas | ❌ **100% morto** (e usa action inexistente `'set_meeting_url'`) |
| `ClientExperienceModal` em `AppointmentsV9Modals.tsx:1375-1839` | 465 linhas | ❌ **100% morto** (nunca importado; usa `alert()` e dados falsos) |
| `MeetingLinkModal`, `CancelBookingModal`, `RescheduleBookingModal`, `CreateManualBookingModal` em `AppointmentsModals.tsx` | ~530 linhas | ❌ **Inalcançáveis** (apenas `ModalityEditModal`, de 134 linhas, é usado de verdade) |
| Estados e handlers legados em `useAppointmentsData.ts` e `AppointmentsEditor.tsx` | ~300 linhas | ❌ **Mortos** (nunca lidos pelas abas atuais) |

### Violações Diretas do Manual da Marca e Design System
1. **Uso do ícone proibido `Sparkles` (`GEMINI.md:3-9`):**
   * Renderizado no botão da 1ª aba (**"Início"**) de Chamadas VIP em `AppointmentsEditor.tsx:7, 303`;
   * Importado em `AvailabilityTab.tsx:21`;
   * Renderizado também no botão e cabeçalho do Briefing Diário (`AdminHeader.tsx:151` e `DailyBriefingModal.tsx:72`).
2. **14 popups nativos (`alert()` e `window.confirm()`) quebrando o visual Vinho Maduro:**
   * Presentes em `AppointmentsEditor.tsx:230, 404`, `AppointmentsV9Modals.tsx:1478`, `AppointmentsSettingsTab.tsx:61, 85` e `app/chamadas/reserva/page.tsx:176-453`.
3. **Dados pessoais/CNPJ hardcoded no bundle público e erro de digitação no nome da marca:**
   * CNPJ `44521360000109` (`NB PRODUCOES DIGITAIS`) hardcoded em `lib/appointments/types.ts:229-231`;
   * Nome da marca escrito errado como **`"LUA BORGES"`** em `lib/services/nua/appointmentsService.ts:251` e `tools/localApiServer.mjs:1626`.

---

## 9. Parte 8 — Plano Oficial de Simplificação Radical (Estilo Cal.com / Calendly)

Hoje o módulo de Chamadas tenta fazer tudo ao mesmo tempo em **5 abas redundantes** (`Início`, `Agendamentos`, `Calendário`, `Disponibilidade`, `Tipos e Preços`), com **2 calendários mensais separados que reagem de forma oposta ao clique** e **5 mecanismos diferentes brigando para decidir se um dia está aberto ou fechado** (`weeklyHours`, `monthAvailability`, `dayOverrides`, `blockedDates` e `blockedSlots`).

Seguindo o padrão de mercado do **Cal.com** e **Calendly** e as leis de redução de carga cognitiva do **Nielsen Norman Group**, podemos transformar as **8.449 linhas / 15 arquivos** em **~1.600 linhas / 6 arquivos limpos**:

### Como ficam as 3 Abas Simplificadas:

1. **Aba 1 — `Agendamentos` (Unifica `Início` + `Agendamentos` + `Calendário`):**
   * **Topo limpo:** 3 cartões de resumo rápido (*Hoje*, *Pendências/Solicitações*, *Próximas*) + botão **"+ Nova Chamada Manual"** + aviso discreto quando as chamadas públicas estiverem pausadas (`CHAMADAS_PUBLIC_ENABLED = false`).
   * **Alternador simples `Lista | Calendário`:** Um único lugar para ver quem está agendado. Próximas chamadas aparecem sempre primeiro.
   * **Gaveta lateral única (`BookingDetailDrawer`):** Ao clicar em qualquer chamada, abre uma gaveta lateral sem crash de hooks e sem "modal em cima de modal". Nela a Nua faz tudo com loading/confirmação: colar link `https://`, propor novo horário (escolhendo apenas entre os slots reais livres do motor!), cancelar com escolha real de reembolso (`100%`, `50%`, `0%`), disparar estorno no Mercado Pago, marcar como realizada ou não compareceu, e abrir WhatsApp ou Telegram (`t.me/`) corretamente.

2. **Aba 2 — `Horários & Folgas` (Padrão Cal.com — elimina a confusão da aba Disponibilidade atual):**
   * **Bloco 1 — Minha Rotina da Semana:** Os 7 dias da semana com botão liga/desliga, suporte a 1 ou 2 turnos (ex.: tarde e noite) e botão *"Copiar para Seg–Sex"* validado.
   * **Bloco 2 — Férias e Folgas (Exceções):** Um calendário visual simples onde clicar num dia abre 3 opções claras: *"Fechar dia inteiro"*, *"Fechar intervalo de horas (ex: 14h–16h)"* ou *"Abrir data extra"*, além do botão *"Bloquear período de férias"*. **Regra simples e sagrada:** fechar qualquer dia bloqueia apenas **novas** reservas e nunca reabre nem apaga chamadas já marcadas.
   * **Bloco 3 — Regras da Agenda (sempre visível):** Fuso horário oficial da Nua (usado em 100% dos cálculos), intervalo de descanso entre chamadas (`bufferMinutes`), antecedência mínima única (`minNoticeHours`) e janela máxima no futuro (`maxFutureDays`).

3. **Aba 3 — `Tipos e Preços`:**
   * Cartões das modalidades (ex.: 30 min, 60 min) com edição completa (nome, duração em opções limpas `15/30/45/60/90/120 min`, preço mínimo `>= R$ 1,00`, descrição, instruções e regras), garantindo que ocultar uma modalidade nunca impeça o reagendamento de quem já pagou.

---

### Roteiro Recomendado de Execução (Quando você quiser começar a corrigir)

* **Etapa 1 — Faxina e Desbloqueio do Admin (Rápida e sem risco):**
  1. Apagar `appointments.zip` e os 4 arquivos órfãos (`AppointmentsQueueTab`, `AppointmentsCalendarTab`, `AppointmentsSettingsTab`, `AppointmentBookingPage`);
  2. Corrigir o crash de hooks do `BookingDetailModal` (`AppointmentsV9Modals.tsx:753-781`), liberar `/api/appointments/admin` para a sessão da Nua (`_authHelper.ts`), corrigir o clique da notificação (`orders-feed.ts:147`) e remover `Sparkles` + `alert()`/`confirm()`.
* **Etapa 2 — Correção do Financeiro, Histórico, Briefing e Nua IA:**
  1. Eliminar a dupla contagem de chamadas em `stripe/dashboard.ts` e `orders-feed.ts` e o fallback `|| 1500`;
  2. Corrigir `nao_compareceu`, `meeting?.url` e o botão "Reativar" no `HistoricoPedidosModule.tsx`;
  3. Corrigir a data da chamada e o botão da IA no `DailyBriefingModal` e os deep-links no Dashboard/Sino/Spotlight.
* **Etapa 3 — Reforma da Agenda, Fuso Horário, Reembolso e Backend (Antes de religar `CHAMADAS_PUBLIC_ENABLED = true`):**
  1. Corrigir `const orderSave =` em `book.ts:236`, o bug de `dayOverrides = true` ao fechar mês, os bugs de fuso horário (Dublin vs. Brasília, `"24:00"`, `.ics`) e o double-booking (`reagendamento_pendente` e Pix expirado);
  2. Conectar o fluxo real de reembolso parcial/total ao Mercado Pago, blindar `/api/appointments/lookup`, `/sync` e `_emailAppointmentHelper.ts`, e enxugar as abas para o modelo de 3 abas.
