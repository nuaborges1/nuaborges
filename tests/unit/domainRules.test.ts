import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MODALITIES,
  DEFAULT_SCHEDULE_SETTINGS,
  computeAvailableSlotsForDate,
  validateBookingAttempt,
  convertSlotBetweenTimezones,
  getDayClosureReason,
  getThreeMonthsFutureLimit,
  formatDualTimezone,
  type AppointmentBooking,
  type AppointmentScheduleSettings,
} from '@/lib/appointmentsCanonical';
import {
  DEFAULT_PERSONALIZADOS_SETTINGS,
  calculateOrderPrice,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';
import {
  getDefaultInstallments,
  calculateFinanceSummary,
  generateReceiptHash,
} from '@/lib/financeCanonical';
import { isPublicPack } from '@/lib/publicCatalog';
import { privatePath, packVaultFiles } from '@/functions/api/me/_vault';
import { wrapEmailLayout } from '@/functions/api/id/_emailTemplates';
import {
  mapMercadoPagoStatus,
  verifyMercadoPagoWebhookSignature,
} from '@/functions/api/payments/_paymentEngine';
import {
  isPaymentTestModeAllowed,
  isExpiredPix,
  createMercadoPagoPix,
} from '@/functions/api/_mercadopago';
import { sanitizeEmailHtml, sanitizeUrl } from '@/functions/api/mail/_sanitize';
import { signMercadoPagoWebhook, TEST_SECRETS } from '../factories/domainFactories';

describe('UNIT — Chamadas VIP (appointmentsCanonical & availabilityEngine)', () => {
  const openSettings: AppointmentScheduleSettings = {
    ...DEFAULT_SCHEDULE_SETTINGS,
    timezone: 'Europe/Dublin',
    minNoticeHours: 2,
    maxAdvanceMonths: 3,
    bufferMinutes: 15,
    weeklyHours: {
      0: { enabled: true, ranges: [{ start: '14:00', end: '18:00' }] },
      1: { enabled: true, ranges: [{ start: '14:00', end: '18:00' }] },
      2: { enabled: true, ranges: [{ start: '14:00', end: '18:00' }] },
      3: { enabled: true, ranges: [{ start: '14:00', end: '18:00' }] },
      4: { enabled: true, ranges: [{ start: '14:00', end: '18:00' }] },
      5: { enabled: true, ranges: [{ start: '14:00', end: '18:00' }] },
      6: { enabled: true, ranges: [{ start: '14:00', end: '18:00' }] },
    },
    blockedDates: ['2026-12-25'],
  };

  const modality15 = DEFAULT_MODALITIES[0];
  const refNow = new Date('2026-12-01T10:00:00.000Z');

  it('computes slots for same-day respecting minNoticeHours and rejects past dates', () => {
    const pastValidation = validateBookingAttempt(
      {
        modalityId: modality15.id,
        date: '2026-11-30',
        startTime: '14:00',
        clientName: 'Teste',
        clientEmail: 'teste@example.test',
        clientPhone: '+5511999999999',
        termsAccepted: true,
      },
      DEFAULT_MODALITIES,
      openSettings,
      [],
      refNow
    );
    expect(pastValidation.success).toBe(false);

    const todaySlots = computeAvailableSlotsForDate('2026-12-01', modality15, openSettings, [], refNow);
    expect(todaySlots.length).toBeGreaterThan(0);
    expect(todaySlots[0]).toBe('14:00');
  });

  it('enforces blocked dates, 3-month limit, and Dec->Jan year transition', () => {
    expect(getDayClosureReason(openSettings, '2026-12-25', '2026-12-01')).toBeTruthy();

    const limit = getThreeMonthsFutureLimit('Europe/Dublin', refNow, 3);
    expect(limit >= '2027-02-28').toBe(true);

    // Year transition into January 2027 works
    const janSlots = computeAvailableSlotsForDate('2027-01-05', modality15, openSettings, [], refNow);
    expect(janSlots.length).toBeGreaterThan(0);

    // Date beyond limit fails validation
    const tooFar = validateBookingAttempt(
      {
        modalityId: modality15.id,
        date: '2027-06-15',
        startTime: '14:00',
        clientName: 'Teste',
        clientEmail: 'teste@example.test',
        clientPhone: '+5511999999999',
        termsAccepted: true,
      },
      DEFAULT_MODALITIES,
      openSettings,
      [],
      refNow
    );
    expect(tooFar.success).toBe(false);
  });

  it('prevents overlapping bookings while allowing two non-overlapping slots on the same day', () => {
    const existingEnd = `14:${String(modality15.durationMinutes).padStart(2, '0')}`;
    const existing: AppointmentBooking[] = [
      {
        id: 'book_1',
        publicToken: 'tok_1',
        modalityId: modality15.id,
        modalityName: modality15.name,
        durationMinutes: modality15.durationMinutes,
        price: modality15.price,
        date: '2026-12-10',
        startTime: '14:00',
        endTime: existingEnd,
        timezone: 'Europe/Dublin',
        clientTimezone: 'America/Sao_Paulo',
        clientName: 'A',
        clientEmail: 'a@example.test',
        clientPhone: '+5511999999999',
        status: 'confirmada',
        payment: { status: 'approved', method: 'pix', amount: modality15.price },
        meeting: { platform: 'google_meet', visibleToClient: true },
        history: [],
        expiresAt: new Date(refNow.getTime() + 900_000).toISOString(),
        createdAt: refNow.toISOString(),
        updatedAt: refNow.toISOString(),
      },
    ];

    // Overlapping or within 15-min buffer
    const overlap = validateBookingAttempt(
      {
        modalityId: modality15.id,
        date: '2026-12-10',
        startTime: '14:15',
        clientName: 'Cliente B',
        clientEmail: 'b@example.test',
        clientPhone: '+5511988888888',
        termsAccepted: true,
      },
      DEFAULT_MODALITIES,
      openSettings,
      existing,
      refNow
    );
    expect(overlap.success).toBe(false);

    // Second non-overlapping slot from available slots on the same day succeeds
    const remainingSlots = computeAvailableSlotsForDate('2026-12-10', modality15, openSettings, existing, refNow);
    expect(remainingSlots.length).toBeGreaterThan(0);
    expect(remainingSlots.includes('14:00')).toBe(false);
    expect(remainingSlots.includes('14:15')).toBe(false);

    const secondOk = validateBookingAttempt(
      {
        modalityId: modality15.id,
        date: '2026-12-10',
        startTime: remainingSlots[0],
        clientName: 'Cliente B',
        clientEmail: 'b@example.test',
        clientPhone: '+5511988888888',
        termsAccepted: true,
      },
      DEFAULT_MODALITIES,
      openSettings,
      existing,
      refNow
    );
    expect(secondOk.success).toBe(true);
  });

  it('rejects duration exceeding available window and converts Dublin <-> Sao Paulo timezones', () => {
    const narrowSettings: AppointmentScheduleSettings = {
      ...openSettings,
      weeklyHours: {
        ...openSettings.weeklyHours,
        4: { enabled: true, ranges: [{ start: '14:00', end: '14:10' }] },
      },
    };
    // 2026-12-10 is Thursday (4); 15-min modality cannot fit in 10-min window
    const slots = computeAvailableSlotsForDate('2026-12-10', modality15, narrowSettings, [], refNow);
    expect(slots).toHaveLength(0);

    const converted = convertSlotBetweenTimezones('2026-12-10', '14:00', 'Europe/Dublin', 'America/Sao_Paulo');
    expect(converted.time).toBe('11:00');
    const dual = formatDualTimezone('2026-12-10', '14:00', '14:15', 'Europe/Dublin', 'America/Sao_Paulo');
    expect(dual.combined).toContain('11:00');
  });
});

describe('UNIT — Personalizados (personalizadosCanonical)', () => {
  it('calculates canonical prices accurately across photos, video, name mention, and express24h', () => {
    const settings = { ...DEFAULT_PERSONALIZADOS_SETTINGS };
    const zero = calculateOrderPrice(0, 'vid_none', false, false, settings);
    expect(zero.total).toBe(0);

    const photosOnly = calculateOrderPrice(3, 'vid_none', false, false, settings);
    expect(photosOnly.total).toBeGreaterThan(0);

    const withAddons = calculateOrderPrice(3, 'vid_none', true, true, settings);
    expect(withAddons.total).toBeGreaterThan(photosOnly.total);

    expect(formatCurrencyBrl(123.45)).toMatch(/123,45/);
  });
});

describe('UNIT — Mensalidade Financeira (financeCanonical)', () => {
  it('generates 10 segregated site installments and deterministic receipt hashes', () => {
    const installments = getDefaultInstallments();
    expect(installments).toHaveLength(10);
    const summary = calculateFinanceSummary(installments);
    expect(summary.installments).toHaveLength(10);
    expect(summary.totalContract).toBeGreaterThan(0);

    const hashA = generateReceiptHash(installments[0]);
    const hashB = generateReceiptHash(installments[0]);
    expect(hashA).toBe(hashB);
    expect(hashA.length).toBeGreaterThanOrEqual(8);
  });
});

describe('UNIT — Catálogo Público & Cofre privatePath', () => {
  it('filters drafts, inactive packs, and avulso modality from public catalog', () => {
    expect(isPublicPack({ id: '1', slug: 'pack-valido', title: 'Pack Válido', active: true, isDraft: false, modality: 'pack' } as any)).toBe(true);
    expect(isPublicPack({ id: '2', slug: 'pack-inativo', title: 'Pack Inativo', active: false, isDraft: false, modality: 'pack' } as any)).toBe(false);
    expect(isPublicPack({ id: '3', slug: 'pack-draft', title: 'Pack Draft', active: true, isDraft: true, modality: 'pack' } as any)).toBe(false);
    expect(isPublicPack({ id: '4', slug: 'item-avulso', title: 'Avulso', active: true, isDraft: false, modality: 'avulso' } as any)).toBe(false);
  });

  it.each([
    ['/media/private/pack-1/foto.webp', 'private/pack-1/foto.webp'],
    ['media/private/pack-1/vid.mp4', 'private/pack-1/vid.mp4'],
    ['private/pack-1/a.png', 'private/pack-1/a.png'],
    ['https://nuaborges.com.br/media/private/pack-1/x.webp', 'private/pack-1/x.webp'],
    [`/media/objects/private/${'a'.repeat(64)}/variants/full.webp`, `objects/private/${'a'.repeat(64)}/variants/full.webp`],
    [`https://admin.nuaborges.com.br/media/objects/private/${'b'.repeat(64)}/video-video-mp4-faststart-v1`, `objects/private/${'b'.repeat(64)}/video-video-mp4-faststart-v1`],
    [`media/objects/private/${'c'.repeat(64)}/full.webp`, `objects/private/${'c'.repeat(64)}/full.webp`],
    [`/media/objects/public/${'a'.repeat(64)}/full.webp`, ''],
    [`https://evil.example.com/media/objects/private/${'a'.repeat(64)}/full.webp`, ''],
    [`/media/objects/public/private/${'a'.repeat(64)}/full.webp`, ''],
    ['/media/gallery/public.webp', ''],
    ['https://evil.example.com/media/private/pack-1/x.webp', ''],
    ['//evil.example.com/media/private/pack-1/x.webp', ''],
    ['/media/private/../gallery/leak.webp', ''],
    ['/media/private/%2e%2e/leak.webp', ''],
    ['/media/private//double.webp', ''],
    ['javascript:alert(1)', ''],
    ['', ''],
  ])('privatePath(%j) -> %j', (input, expected) => {
    expect(privatePath(input)).toBe(expected);
  });

  it('[AUD-FINAL-01] packVaultFiles excludes public media URLs and keeps only private vault paths', () => {
    const files = packVaultFiles({
      exclusivePhotos: [
        '/media/gallery/public-preview.jpg',
        `/media/objects/public/${'a'.repeat(64)}/full.webp`,
        `/media/objects/private/${'b'.repeat(64)}/variants/full.webp`,
        '/media/private/pack-1/foto-01.webp',
      ],
      videos: [
        { url: `/media/objects/public/${'c'.repeat(64)}/video.mp4` },
        { url: `/media/objects/private/${'d'.repeat(64)}/video-mp4` },
      ],
    });
    expect(files.map((f) => f.path)).toEqual([
      `objects/private/${'b'.repeat(64)}/variants/full.webp`,
      'private/pack-1/foto-01.webp',
      `objects/private/${'d'.repeat(64)}/video-mp4`,
    ]);
  });

  it('[AUD-FINAL-02] transactional email layout omits unsupported 100% discreet bank statement claims', () => {
    const html = wrapEmailLayout({
      title: 'Teste',
      preheader: 'Resumo',
      heading: 'Acesso',
      bodyHtml: '<p>Conteúdo</p>',
    });
    expect(html.toLowerCase()).not.toContain('100% discret');
  });
});

describe('UNIT — Mercado Pago Engine & Guards', () => {
  it.each([
    ['approved', 'approved', 'paid', 'grant'],
    ['pending', 'pending', 'pending', 'none'],
    ['in_process', 'pending', 'pending', 'none'],
    ['authorized', 'pending', 'pending', 'none'],
    ['rejected', 'rejected', 'failed', 'none'],
    ['cancelled', 'cancelled', 'cancelled', 'revoke'],
    ['refunded', 'refunded', 'refunded', 'revoke'],
    ['charged_back', 'charged_back', 'charged_back', 'revoke'],
  ])('mapMercadoPagoStatus(%s)', (raw, payStatus, orderStatus, effect) => {
    const res = mapMercadoPagoStatus(raw);
    expect(res.paymentStatus).toBe(payStatus);
    expect(res.orderStatus).toBe(orderStatus);
    expect(res.accessEffect).toBe(effect);
  });

  it('verifies valid HMAC x-signature and rejects invalid/replayed/expired signatures', async () => {
    const now = Math.floor(Date.now() / 1000);
    const valid = await signMercadoPagoWebhook({ dataId: '998877', ts: now });
    expect(
      await verifyMercadoPagoWebhookSignature({
        xSignature: valid.xSignature,
        dataId: '998877',
        secret: TEST_SECRETS.MP_WEBHOOK_SECRET,
        requestId: valid.xRequestId,
        nowEpochSeconds: now,
      })
    ).toBe(true);

    // Tampered dataId
    expect(
      await verifyMercadoPagoWebhookSignature({
        xSignature: valid.xSignature,
        dataId: '998878',
        secret: TEST_SECRETS.MP_WEBHOOK_SECRET,
        requestId: valid.xRequestId,
        nowEpochSeconds: now,
      })
    ).toBe(false);

    // Expired (> 15 min)
    const old = await signMercadoPagoWebhook({ dataId: '998877', ts: now - 1200 });
    expect(
      await verifyMercadoPagoWebhookSignature({
        xSignature: old.xSignature,
        dataId: '998877',
        secret: TEST_SECRETS.MP_WEBHOOK_SECRET,
        requestId: old.xRequestId,
        nowEpochSeconds: now,
      })
    ).toBe(false);
  });

  it('forbids test mode in production and blocks non-TEST token in non-production', async () => {
    expect(isPaymentTestModeAllowed({ ENVIRONMENT: 'production', PAYMENT_TEST_MODE: 'true' })).toBe(false);
    expect(isPaymentTestModeAllowed({ ENVIRONMENT: 'development', PAYMENT_TEST_MODE: 'true' })).toBe(true);

    await expect(
      createMercadoPagoPix(
        { ENVIRONMENT: 'development', PAYMENT_TEST_MODE: 'true', MP_ACCESS_TOKEN: 'APP_USR-prod-token-blocked' },
        { amount: 50, description: 'QA', externalReference: 'ord_test' }
      )
    ).rejects.toThrow(/TEST-/);

    expect(isExpiredPix('expired')).toBe(true);
    expect(isExpiredPix('cancelled', 'expired')).toBe(true);
    expect(isExpiredPix('approved')).toBe(false);
  });
});

describe('UNIT — Mail Sanitizer (XSS & Tracking Protection)', () => {
  it('strips scripts/event handlers and blocks javascript: and protocol-relative tracker URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('//tracker.evil/pixel.gif', true)).toBeNull();
    const html = sanitizeEmailHtml('<p onclick="alert(1)">Olá</p><script>evil()</script><a href="javascript:xss()">link</a>');
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/onclick/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html.includes('Olá')).toBe(true);
  });
});
