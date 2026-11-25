import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrencyBrl,
  formatDateForDisplay,
  getScheduleNow,
  getThreeMonthsFutureLimit,
  convertSlotBetweenTimezones,
  formatDualTimezone,
  timeStringToMinutes,
  minutesToTimeString,
} from '../lib/appointments/timeUtils.ts';
import {
  computeAvailableSlotsForDate,
  validateBookingAttempt,
  validateClientContact,
} from '../lib/appointments/availabilityEngine.ts';
import { generatePublicToken } from '../lib/appointmentsStore.ts';
import { DEFAULT_MODALITIES, DEFAULT_SCHEDULE_SETTINGS } from '../lib/appointments/types.ts';
import { createMercadoPagoPix, refundMercadoPagoPayment } from '../functions/api/_mercadopago.ts';

test('Chamadas VIP — Utilitários de Tempo e Proteção contra NaN', () => {
  // 1. Proteção contra NaN
  assert.equal(formatCurrencyBrl(undefined), 'R$\u00A00,00');
  assert.equal(formatCurrencyBrl(null), 'R$\u00A00,00');
  assert.equal(formatCurrencyBrl(NaN), 'R$\u00A00,00');
  assert.equal(formatCurrencyBrl(250), 'R$\u00A0250,00');

  // 2. Formatação segura de data sem bug de UTC do new Date
  assert.equal(formatDateForDisplay('2026-11-16'), '16/11/2026');
  assert.equal(formatDateForDisplay('2027-02-28'), '28/02/2027');

  // 3. Fuso da Agenda (Europe/Dublin) vs Brasília
  const testDate = new Date('2026-11-16T22:00:00Z'); // 22h UTC
  const dublin = getScheduleNow('Europe/Dublin', testDate);
  const brasilia = getScheduleNow('America/Sao_Paulo', testDate);

  // Na Irlanda no inverno (GMT = UTC+0), 22h UTC é 22h do dia 16/11
  assert.equal(dublin.hour, 22);
  assert.equal(dublin.dateString, '2026-11-16');

  // Em Brasília (UTC-3), 22h UTC é 19h do dia 16/11
  assert.equal(brasilia.hour, 19);
  assert.equal(brasilia.dateString, '2026-11-16');

  // 4. Janela móvel de 3 meses no calendário
  const baseNov = new Date('2026-11-16T12:00:00Z');
  const limitFromNov = getThreeMonthsFutureLimit('Europe/Dublin', baseNov);
  // 16 de Novembro + 3 meses = 16 de Fevereiro de 2027
  assert.equal(limitFromNov, '2027-02-16');

  // Teste de ajuste de fim de mês: 31 de Agosto + 3 meses = 30 de Novembro (Novembro só tem 30 dias)
  const baseAug = new Date('2026-08-31T12:00:00Z');
  const limitFromAug = getThreeMonthsFutureLimit('Europe/Dublin', baseAug);
  assert.equal(limitFromAug, '2026-11-30');

  // 5. Exibição com fuso duplo (Irlanda e Brasília)
  const dual = formatDualTimezone('2026-11-16', '14:00', '14:30', 'Europe/Dublin', 'America/Sao_Paulo');
  assert.ok(dual.combined.includes('Brasília') && dual.combined.includes('Irlanda'));
});

test('Chamadas VIP — Validação de Contato (WhatsApp Internacional & Telegram)', () => {
  // Telegram @handle
  const tg1 = validateClientContact('@nuaborges');
  assert.equal(tg1.valid, true);
  assert.equal(tg1.type, 'telegram');
  assert.equal(tg1.normalized, '@nuaborges');

  const tg2 = validateClientContact('cliente_vip');
  assert.equal(tg2.valid, true);
  assert.equal(tg2.type, 'telegram');
  assert.equal(tg2.normalized, '@cliente_vip');

  // WhatsApp Brasil com DDD
  const br = validateClientContact('(11) 98765-4321');
  assert.equal(br.valid, true);
  assert.equal(br.type, 'whatsapp');
  assert.equal(br.normalized, '11987654321');

  // WhatsApp Internacional da Irlanda (+353)
  const ie = validateClientContact('+353 87 123 4567');
  assert.equal(ie.valid, true);
  assert.equal(ie.type, 'whatsapp');
  assert.equal(ie.normalized, '+353871234567');

  // Contato inválido curto
  const inv = validateClientContact('123');
  assert.equal(inv.valid, false);
});

test('Chamadas VIP — Motor de Disponibilidade e Limite de 3 Meses', () => {
  const modality = DEFAULT_MODALITIES[0]; // 30 min
  const settings = {
    ...DEFAULT_SCHEDULE_SETTINGS,
    timezone: 'Europe/Dublin',
  };

  const currentDate = new Date('2026-11-16T10:00:00Z'); // Segunda-feira às 10h em Dublin

  // 1. Data válida dentro dos 3 meses
  const slotsValid = computeAvailableSlotsForDate('2026-11-16', modality, settings, [], currentDate);
  assert.ok(slotsValid.length > 0, 'Deve gerar slots para segunda-feira aberta');

  // 2. Data além de 3 meses (ex: Maio de 2027)
  const slotsFarFuture = computeAvailableSlotsForDate('2027-05-20', modality, settings, [], currentDate);
  assert.equal(slotsFarFuture.length, 0, 'Não deve permitir agendamento além de 3 meses');

  const oneMonthSettings = { ...settings, maxAdvanceMonths: 1 };
  assert.ok(computeAvailableSlotsForDate('2026-12-01', modality, oneMonthSettings, [], currentDate).length > 0,
    'A configuração de um mês deve permitir datas dentro da janela escolhida');
  assert.equal(computeAvailableSlotsForDate('2027-01-01', modality, oneMonthSettings, [], currentDate).length, 0,
    'A configuração de um mês deve bloquear datas fora da janela');

  const sixMonthSettings = { ...settings, maxAdvanceMonths: 6 };
  assert.ok(computeAvailableSlotsForDate('2027-04-20', modality, sixMonthSettings, [], currentDate).length > 0,
    'A configuração de seis meses deve ampliar a janela da agenda');

  // 3. Data no passado
  const slotsPast = computeAvailableSlotsForDate('2026-11-15', modality, settings, [], currentDate);
  assert.equal(slotsPast.length, 0, 'Não deve permitir data passada');

  // 4. Dia bloqueado por folga
  const settingsWithBlock = {
    ...settings,
    blockedDates: ['2026-11-16'],
  };
  const slotsBlocked = computeAvailableSlotsForDate('2026-11-16', modality, settingsWithBlock, [], currentDate);
  assert.equal(slotsBlocked.length, 0, 'Dia bloqueado não deve ter horários');
});

test('Chamadas VIP — Inteligência de Datas Passadas e Proteção de Chamadas', async () => {
  const { getDayClosureReason, isDayOpenForBooking } = await import('../lib/appointments/availabilityEngine.ts');
  const todayStr = '2026-11-17';
  const settings = {
    ...DEFAULT_SCHEDULE_SETTINGS,
    weeklyHours: {
      0: { enabled: false, ranges: [] },
      1: { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] },
      2: { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] },
      3: { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] },
      4: { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] },
      5: { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] },
      6: { enabled: true, ranges: [{ start: '14:00', end: '20:00' }] },
    },
  };

  // 1. Data passada (ex: 2026-11-16 quando hoje é 2026-11-17) deve retornar 'past'
  assert.equal(getDayClosureReason(settings, '2026-11-16', todayStr), 'past');
  assert.equal(isDayOpenForBooking(settings, '2026-11-16', todayStr), false);

  // 2. Data de hoje (2026-11-17, terça-feira aberta) deve ser null (aberto)
  assert.equal(getDayClosureReason(settings, '2026-11-17', todayStr), null);
  assert.equal(isDayOpenForBooking(settings, '2026-11-17', todayStr), true);

  // 3. Data futura em folga (domingo)
  assert.equal(getDayClosureReason(settings, '2026-11-22', todayStr), 'weekday');
  assert.equal(isDayOpenForBooking(settings, '2026-11-22', todayStr), false);
});

test('Chamadas VIP — .env local não pode movimentar dinheiro com credencial de produção', async () => {
  const env = { ENVIRONMENT: 'development', PAYMENT_TEST_MODE: 'true', MP_ACCESS_TOKEN: 'APP_USR-production-token' };
  await assert.rejects(
    createMercadoPagoPix(env, { amount: 10, description: 'teste', externalReference: 'apt_test' }),
    /credencial de teste TEST-/
  );
  const refund = await refundMercadoPagoPayment(env, '12345', 'booking-test');
  assert.equal(refund.success, false);
  assert.match(refund.error, /credencial de teste TEST-/);
});

test('Chamadas VIP — Token Seguro', () => {
  const token = generatePublicToken();
  assert.ok(token.startsWith('tok_'), 'Token deve começar obrigatoriamente com tok_');
  assert.ok(token.length >= 32, 'Token deve ter ao menos 32 caracteres');
});

test('Chamadas VIP — Limite diário (dailyBookingLimit) bloqueia o dia inteiro ao lotar', () => {
  const modality = DEFAULT_MODALITIES[0]; // 30 min
  const settings = {
    ...DEFAULT_SCHEDULE_SETTINGS,
    timezone: 'Europe/Dublin',
    dailyBookingLimit: 1,
  };
  const currentDate = new Date('2026-11-16T10:00:00Z');
  const existingBooking = {
    id: 'book_limit_1',
    date: '2026-11-16',
    startTime: '15:00',
    endTime: '15:30',
    status: 'confirmada',
    durationMinutes: 30,
  };
  const slotsBefore = computeAvailableSlotsForDate('2026-11-16', modality, settings, [], currentDate);
  assert.ok(slotsBefore.length > 0, 'Dia sem reservas deve ter horários livres');

  const slotsAfter = computeAvailableSlotsForDate('2026-11-16', modality, settings, [existingBooking], currentDate);
  assert.equal(slotsAfter.length, 0, 'Dia que atingiu dailyBookingLimit deve ficar sem nenhum horário livre');
});

test('Chamadas VIP — Conversão UTC para .ics preserva fuso e virada de meia-noite', () => {
  // 22:30 em Brasília (UTC-3) em 2026-11-16 equivale a 01:30 UTC do dia 2026-11-17
  const utcSlot = convertSlotBetweenTimezones('2026-11-16', '22:30', 'America/Sao_Paulo', 'UTC');
  assert.equal(utcSlot.date, '2026-11-17');
  assert.equal(utcSlot.time, '01:30');
});

test('Segurança P0 — sanitizeForPublicSite remove mídias privadas do conteúdo público mantendo contagens', async () => {
  const { sanitizeForPublicSite } = await import('../functions/api/content/sync.ts');
  const sanitized = sanitizeForPublicSite({
    library: [{ id: 'lib-1', url: '/media/private/secret.jpg' }],
    albums: [{ id: 'alb-1', title: 'Privado' }],
    avulsos: {
      items: [
        {
          id: 'pack-segredo',
          slug: 'pack-segredo',
          title: 'Pack Segredo',
          active: true,
          modality: 'pack',
          imageUrl: '/media/public-cover.jpg',
          exclusivePhotos: ['/media/private/pack-segredo/foto1.jpg', '/media/private/pack-segredo/foto2.jpg'],
          videos: [
            {
              id: 'vid-1',
              title: 'Cena 1',
              duration: '04:20',
              url: '/media/private/pack-segredo/video1.mp4',
              posterUrl: '/media/private/pack-segredo/poster-privado.jpg',
            },
            {
              id: 'vid-2',
              title: 'Cena 2',
              url: '/media/private/pack-segredo/video2.mp4',
              posterUrl: '/media/public-poster.jpg',
            },
          ],
          protectedMedia: [{ id: 'pm-1', path: '/media/private/x.mp4' }],
          privateFiles: ['/media/private/y.jpg'],
          files: ['/media/private/z.jpg'],
        },
        {
          id: 'item-avulso-secreto',
          slug: 'item-avulso-secreto',
          title: 'Avulso',
          active: true,
          modality: 'avulso',
        },
      ],
    },
  });

  assert.equal(sanitized.library.length, 0);
  assert.equal(sanitized.albums.length, 0);
  assert.equal(sanitized.avulsos.items.length, 1, 'Itens modality=avulso não vão para a vitrine pública');

  const pack = sanitized.avulsos.items[0];
  assert.deepEqual(pack.exclusivePhotos, [], 'exclusivePhotos nunca vaza na vitrine pública');
  assert.equal(pack.exclusivePhotosCount, 2, 'Contagem de fotos exclusivas preservada');
  assert.equal(pack.videosCount, 2, 'Contagem de vídeos preservada');
  assert.equal(pack.videos[0].url, '', 'URL do vídeo privado removida');
  assert.equal(pack.videos[0].posterUrl, undefined, 'Poster em /private/ removido');
  assert.equal(pack.videos[1].posterUrl, '/media/public-poster.jpg', 'Poster público preservado');
  assert.equal(pack.protectedMedia, undefined);
  assert.equal(pack.privateFiles, undefined);
  assert.equal(pack.files, undefined);
});

test('Chamadas VIP — Múltiplos agendamentos no mesmo dia e reset de dailyBookingLimit via JSON (null)', async () => {
  const { mergeScheduleSettings } = await import('../lib/appointments/types.ts');
  const modality = DEFAULT_MODALITIES[0]; // 30 min
  const currentDate = new Date('2026-11-16T10:00:00Z');

  // 1. Inicia com dailyBookingLimit = 1
  const lockedSettings = mergeScheduleSettings(DEFAULT_SCHEDULE_SETTINGS, {
    timezone: 'Europe/Dublin',
    dailyBookingLimit: 1,
  });
  assert.equal(lockedSettings.dailyBookingLimit, 1);

  const firstBooking = {
    id: 'book_1',
    date: '2026-11-16',
    startTime: '14:00',
    endTime: '14:30',
    status: 'confirmada',
    durationMinutes: 30,
  };
  assert.equal(
    computeAvailableSlotsForDate('2026-11-16', modality, lockedSettings, [firstBooking], currentDate).length,
    0,
    'Com dailyBookingLimit=1, o dia fecha após a 1ª reserva'
  );

  // 2. Admin altera para "Sem limite" (envia dailyBookingLimit: null passando por JSON.stringify)
  const payloadOverJson = JSON.parse(JSON.stringify({ ...lockedSettings, dailyBookingLimit: null }));
  const unlockedSettings = mergeScheduleSettings(lockedSettings, payloadOverJson);
  assert.equal(unlockedSettings.dailyBookingLimit, undefined, 'dailyBookingLimit deve ser limpo após enviar null');

  // 3. Mesmo com 2 chamadas ativas e 1 concluída/ausente no dia, os demais horários continuam livres!
  const secondBooking = {
    id: 'book_2',
    date: '2026-11-16',
    startTime: '16:00',
    endTime: '16:30',
    status: 'confirmada',
    durationMinutes: 30,
  };
  const completedBooking = {
    id: 'book_done',
    date: '2026-11-16',
    startTime: '18:00',
    endTime: '18:30',
    status: 'concluida',
    durationMinutes: 30,
  };
  const remainingSlots = computeAvailableSlotsForDate(
    '2026-11-16',
    modality,
    unlockedSettings,
    [firstBooking, secondBooking, completedBooking],
    currentDate
  );
  assert.ok(remainingSlots.length > 5, 'Deve manter múltiplos horários livres no mesmo dia');
  assert.ok(!remainingSlots.includes('14:00'), 'Horário reservado 14:00 não pode estar livre');
  assert.ok(!remainingSlots.includes('16:00'), 'Horário reservado 16:00 não pode estar livre');
  assert.ok(remainingSlots.includes('18:00'), 'Chamada concluída não deve bloquear horário futuro');
});

test('E-mails Transacionais — Conformidade RFC 5321/5322 (CRLF estrito, Date, Message-ID, Base64 <= 998 bytes)', async () => {
  const { buildRfc5322MimeMessage } = await import('../functions/api/_smtpHelper.ts');
  const { renderAccessCodeEmailHtml } = await import('../functions/api/id/_emailTemplates.ts');

  const tpl = renderAccessCodeEmailHtml({
    code: '849201',
    expiresMinutes: 10,
    contextLabel: 'sua conta privativa',
  });

  // Simula HTML longo em uma única linha para garantir que o empacotador Base64 quebre linhas <= 76 chars
  const longHtml = tpl.html + '<!-- ' + 'A'.repeat(2500) + ' -->';
  const { mime: raw, messageId } = buildRfc5322MimeMessage({
    from: 'contato@nuaborges.com.br',
    to: 'cliente@exemplo.com',
    replyTo: 'contato@nuaborges.com.br',
    subject: tpl.subject,
    html: longHtml,
  });

  assert.ok(messageId.startsWith('<') && messageId.endsWith('@nuaborges.com.br>'), 'Message-ID válido');
  assert.ok(raw.includes('Date: '), 'Deve conter cabeçalho Date RFC 5322');
  assert.ok(raw.includes(`Message-ID: ${messageId}`), 'Deve conter cabeçalho Message-ID');
  assert.ok(raw.includes('MIME-Version: 1.0'), 'Deve conter MIME-Version: 1.0');
  assert.ok(raw.includes('Content-Type: multipart/alternative;'), 'Deve ser multipart/alternative');
  assert.ok(raw.includes('Content-Transfer-Encoding: base64'), 'Deve codificar partes em base64');

  // Verifica ausência de \n solto sem \r antes
  const bareLfMatch = raw.match(/(?<!\r)\n/);
  assert.equal(bareLfMatch, null, 'Não pode existir nenhum LF solto (todos devem ser CRLF)');

  // Verifica limite máximo de linha RFC 5321 (998 bytes)
  const lines = raw.split('\r\n');
  for (const line of lines) {
    assert.ok(
      Buffer.byteLength(line, 'utf8') <= 998,
      `Linha excedeu 998 bytes: ${Buffer.byteLength(line, 'utf8')}`
    );
  }
});
