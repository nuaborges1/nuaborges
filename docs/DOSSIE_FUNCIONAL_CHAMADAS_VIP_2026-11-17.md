# Dossiê funcional — Chamadas VIP

**Data da análise:** 17/11/2026  
**Escopo:** quatro abas administrativas de Chamadas VIP e seus fluxos relacionados.  
**Método:** leitura estática dos componentes, serviços, tipos e endpoint da feature. Nenhum código ou interface foi alterado. A interface não foi validada no navegador nesta análise.

## 1. Objetivo e uso da imagem de referência

A imagem anterior é somente uma referência das **quatro áreas funcionais** que precisam ser consideradas. Ela não representa o design atual do painel e não deve ser usada para copiar paleta, estrutura, navegação, componentes, indicadores, dados ou distribuição visual.

O painel existente tem identidade e componentes próprios. Este documento descreve o que o código atual apresenta e permite fazer, para orientar qualquer proposta futura sem substituir o design atual por aquele da imagem.

## 2. Estrutura atual do módulo

O módulo fica em `components/nua/admin/AppointmentsEditor.tsx` e tem estas quatro abas:

| ID interno | Nome exibido atualmente | Responsabilidade |
|---|---|---|
| `queue` | Atendimentos Agendados | Consultar e operar reservas existentes. |
| `calendar` | Calendário & Folgas | Ver reservas por data e administrar bloqueios de dias e intervalos. |
| `modalities` | Tipos de Chamada & Preços | Cadastrar, editar, ativar, desativar e remover modalidades. |
| `settings` | Horários de Atendimento | Definir disponibilidade semanal, fuso e regras de reserva. |

O cabeçalho “Chamadas VIP” inclui descrição do módulo, botão **Atualizar** e abas internas. O conteúdo da aba muda sem navegar para outra rota. Os indicadores de hoje, pendentes, confirmadas, concluídas e faturamento aparecem somente em **Atendimentos Agendados**.

## 3. Identidade visual encontrada no código

O código das telas usa fundos escuros em tons de carvão e ameixa, cards com bordas discretas, texto claro, estados coloridos para situações operacionais e acento vinho, frequentemente `#843C52`. Os componentes se adaptam entre larguras menores e maiores com classes responsivas. O módulo usa cabeçalho, abas e primitivas já existentes no admin.

Essa constatação vem das classes dos componentes lidos; não é uma inspeção visual em navegador. Não se deve inferir que cada detalhe implementado está corretamente renderizado em todos os dispositivos sem uma validação de interface.

## 4. Aba 1 — Atendimentos Agendados

### O que mostra

- Indicadores calculados a partir das reservas carregadas: chamadas de hoje, aguardando pagamento, confirmadas, concluídas e faturamento confirmado.
- Lista de reservas com cliente, modalidade, data, início e fim, valor e situação.
- Contato do cliente, telefone, e-mail e observações quando disponíveis.
- Link da sala já cadastrado ou opção para adicioná-lo.
- Estado da devolução quando uma reserva cancelada ainda requer acompanhamento.

### Busca e filtros

- Busca por nome, e-mail, telefone ou data.
- Filtro por situação: todas as situações ativas, confirmada ou aguardando pagamento.
- Filtro por modalidade.
- A lista principal se concentra em reservas ativas. Concluídas, canceladas e ausências não aparecem na fila padrão; reservas canceladas com devolução pendente ou falha continuam visíveis para permitir acompanhamento.

### Ações disponíveis

- **Confirmar Pagamento (Pix):** confirmação manual administrativa; altera a situação para confirmada, registra pagamento manual, torna o acesso à sala visível para o cliente e tenta enviar e-mail de confirmação.
- **Inserir/alterar link:** abre o formulário do link e instruções da sala. Quando há um novo link em uma reserva confirmada, o servidor tenta avisar o cliente por e-mail. O formulário oferece gerar um endereço Jitsi baseado no identificador da reserva.
- **Marcar Concluída** e **Não Compareceu:** alteram a situação e registram a ação no histórico.
- **Reagendar:** disponível na fila para reserva confirmada com pagamento aprovado. O modal consulta horários para a nova data; o servidor valida a disponibilidade e tenta efetuar o reagendamento atomicamente, registrando o horário anterior e tentando enviar e-mail.
- **Cancelar Reserva:** solicita motivo. O servidor consulta o Mercado Pago quando existe transação; o resultado pode exigir devolução automática, acompanhamento ou ação manual, conforme a origem e o estado do pagamento. O link da sala é ocultado ao cancelar.
- **Tentar devolução novamente:** aparece para certas devoluções pendentes ou que falharam e pede confirmação explícita antes de tentar novamente.
- **Conversar:** abre o WhatsApp usando o telefone e uma mensagem gerada para o contexto.
- **Ver detalhes:** existe quando o módulo pai fornece o callback opcional `onOpenBookingDetails`.

### Limite funcional confirmado

O componente da fila não apresenta uma ação para criar uma nova reserva manualmente. A criação de reserva encontrada no fluxo atual é do lado público; não foi identificada nesta aba uma ação equivalente de “Criar chamada”.

## 5. Aba 2 — Calendário & Folgas

### Visualizações e navegação

- Visualizações de **Mês**, **Semana** e **Dia**.
- Navegação para período anterior/próximo e retorno para hoje.
- Clique em um dia para selecioná-lo.
- Indicadores no calendário para reservas, situação confirmada/pendente, dia bloqueado, dia atual e dia selecionado.

### Painel do dia selecionado

- Exibe reservas da data selecionada, exceto canceladas.
- Mostra cliente, horário, valor e estado.
- Permite abrir o formulário para inserir/alterar link da sala e, quando disponível, abrir os detalhes.
- Permite bloquear ou desbloquear o dia inteiro.
- Permite adicionar um intervalo bloqueado, indicando hora inicial e final.
- Lista intervalos bloqueados da data e oferece removê-los.
- Exibe uma lista de próximas reservas abaixo do calendário.

### Validações e limites

- Ao adicionar intervalo, o código valida o formato e exige que o fim seja posterior ao início.
- Não permite intervalo sobreposto a outra reserva ativa ou a outro bloqueio.
- Ao remover intervalo, a lista é atualizada e salva.
- Bloquear uma data impede novas reservas naquela data, mas não cancela reservas já existentes.
- O calendário não oferece, no componente atual, criação manual de reserva nem reagendamento direto a partir da célula do calendário. Reagendamento é acionado pela fila.
- Não há visualização **Ano** ou **Lista** no controle desta aba. O código implementa mês, semana e dia.

### Divergência de rótulo a conferir

O hook monta `upcomingBookings` ordenando reservas futuras não canceladas, sem restringir a situação a “confirmada”. O calendário usa essa lista sob o título “Próximas Chamadas Confirmadas”. Portanto, pelo código, uma reserva aguardando pagamento também pode entrar nessa seção; o nome e o filtro não estão alinhados.

## 6. Aba 3 — Tipos de Chamada & Preços

### O que mostra e permite

- Cards das modalidades existentes com nome, duração, valor, situação ativa/inativa, descrição e regras.
- **Adicionar Modalidade** abre formulário de criação.
- **Editar** abre formulário com os dados atuais.
- **Remover** pede confirmação e salva a lista sem a modalidade escolhida.
- O formulário permite editar nome, duração, preço em reais, descrição comercial, instruções exibidas ao cliente e estado ativo/inativo.
- Duração usa controle numérico de 10 a 180 minutos, em incrementos de 15. O preço usa incremento de R$ 25 e não aceita valor abaixo de zero pelo controle.
- Modalidade inativa deixa de ficar visível no site, conforme o rótulo no formulário.

### Salvamento e limites

As alterações passam pela ação administrativa `updateModalities`, salvando a lista de modalidades. O código não mostra controles para reordenar os cards ou definir prioridade de exibição. Ao iniciar uma nova modalidade, o formulário recebe valores iniciais de edição; esses valores são um ponto de partida do formulário, não evidência de preços reais acordados.

## 7. Aba 4 — Horários de Atendimento

### Disponibilidade semanal

- Liga ou desliga cada dia da semana.
- Permite configurar um ou mais intervalos de atendimento no mesmo dia.
- Permite adicionar ou remover intervalos.
- Exibe “Fechado / Sem atendimento” para dia desativado.

### Regras de reserva

- Fuso horário da agenda, com opções definidas em `SUPPORTED_TIMEZONES`.
- Descanso entre chamadas: 10, 15, 20 ou 30 minutos.
- Antecedência mínima: opções de 2, 4, 12 ou 24 horas.
- Horizonte máximo em que o cliente pode reservar: de 1 a 12 meses; a alteração não cancela reservas já existentes, segundo o texto da interface.
- Limite diário de reservas.
- Tempo limite para pagamento de uma reserva pendente: 10, 15, 20 ou 30 minutos.

### Folgas e bloqueios

- Bloqueio de uma data específica e remoção de datas bloqueadas.
- A interface alerta quando já existem reservas na data; bloquear impede novas reservas e não cancela as existentes.
- Bloqueio de intervalo com data, início, fim e motivo opcional.
- A interface alerta se um intervalo coincide com reserva existente e informa que o bloqueio não cancela essa reserva.
- Atalho para abrir o Calendário Visual.

### Salvamento observado

As alterações em `settings` são monitoradas pelo hook `useAppointmentsData` e enviadas por `updateSettings` com debounce de 600 ms. O callback `onSaveSettings` é passado à aba, mas não é chamado no componente `AppointmentsSettingsTab`; não há botão “Salvar Horários” nesse componente conforme a leitura do código. Ainda assim, o autosave do hook persiste mudanças quando a chamada ao endpoint funciona. A mensagem exibida após trocar o fuso diz “Clique em ‘Salvar Horários’ para confirmar”, o que contradiz o comportamento de autosave e pode confundir a cliente.

## 8. Dados, carregamento e persistência

### Campos centrais

O modelo canônico de agendamentos reúne três grupos relevantes para estas abas:

- **Configurações:** fuso, horários semanais e intervalos, folgas e bloqueios, antecedência, intervalo entre chamadas, limite diário, janela máxima e expiração de pendências.
- **Modalidades:** identificador, nome, duração, preço, estado ativo, descrição, regras e instruções ao cliente.
- **Reservas:** cliente, modalidade, data e horário, valor, situação, pagamento, link/instruções da sala, cancelamento, devolução e histórico.

### Fluxo de leitura e escrita

- O serviço `lib/services/nua/appointmentsService.ts` consulta `/api/appointments/admin` e mantém cache de administração por até três minutos, também usando `sessionStorage` no navegador.
- Quando o endpoint retorna sucesso, o serviço trata a resposta do banco como fonte autoritativa e atualiza o estado local.
- Se a leitura do servidor falha, existe fallback para estado local. Esse fallback pode mostrar dados desatualizados; por si só, não confirma que a gravação no banco ocorreu.
- As gravações administrativas chamam o endpoint por `POST`, com a ação correspondente. Fora de localhost, falha de conexão retorna erro em vez de confirmar a ação pelo armazenamento local.
- O endpoint documenta leitura e gravação pelo Supabase/PostgreSQL. Ações de cancelamento/reembolso também consultam o Mercado Pago.
- Ações de confirmação, link, cancelamento e reagendamento tentam atualizar o histórico e, conforme o caso, enviar e-mails.

### Limite da auditoria de segurança

O arquivo do endpoint examinado não mostra uma checagem de sessão/autorização no próprio `onRequestPost` antes das ações; ele declara variáveis de ambiente relacionadas a admin, mas não as utiliza diretamente nesse arquivo. Isso não prova que a rota esteja desprotegida: uma verificação pode existir em middleware ou na configuração do ambiente. É um ponto que exige inspeção específica de `functions/_middleware` e das regras de implantação antes de qualquer conclusão de segurança.

## 9. Observações funcionais confirmadas

1. **Imagem não é especificação visual:** a proposta futura deve respeitar os componentes, a navegação e a identidade atuais do admin. A imagem só comunica o conjunto de áreas e capacidades desejadas.
2. **Calendário já executa ações reais:** selecionar datas, bloquear/desbloquear dias e intervalos, consultar reservas e abrir ações de sala são comportamentos ligados ao estado e ao endpoint.
3. **A agenda não centraliza todas as operações:** o calendário não cria nem reagenda reservas; essas operações ficam na fila, com reagendamento apenas para reserva paga confirmada.
4. **Configurações autosalvam:** o comportamento implementado é diferente do texto que pede confirmação pelo botão “Salvar Horários”.
5. **A fila de reservas tem ações com efeito financeiro:** cancelar e tentar devolução podem alterar o estado do pedido e acionar operações no Mercado Pago; não são apenas alterações visuais.
6. **Indicador “confirmadas” pode incluir pendentes:** o conjunto enviado para a seção de próximas chamadas inclui não canceladas, não apenas confirmadas.
7. **Falha de leitura e falha de gravação têm comportamentos diferentes:** a leitura pode cair para cache local; fora de localhost, o serviço não finge que uma gravação teve sucesso quando não alcança o servidor.

## 10. Arquivos analisados

- `components/nua/admin/AppointmentsEditor.tsx`
- `components/nua/admin/appointments/AppointmentsQueueTab.tsx`
- `components/nua/admin/appointments/AppointmentsCalendarTab.tsx`
- `components/nua/admin/appointments/AppointmentsModalitiesTab.tsx`
- `components/nua/admin/appointments/AppointmentsSettingsTab.tsx`
- `components/nua/admin/appointments/AppointmentsModals.tsx`
- `components/nua/admin/appointments/useAppointmentsData.ts`
- `lib/appointmentsCanonical.ts`
- `lib/appointmentsStore.ts`
- `lib/services/nua/appointmentsService.ts`
- `functions/api/appointments/admin.ts`

## 11. Fora do escopo desta etapa

- Nenhum arquivo de aplicação foi editado.
- Nenhum ajuste visual ou funcional foi implementado.
- Nenhum teste foi executado.
- Não foi feita validação interativa do painel no navegador.
- O comportamento dos fluxos públicos de compra, Pix e consulta do cliente não foi re-auditado integralmente neste dossiê; são citados apenas quando afetam a operação administrativa.
