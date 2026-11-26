import { describe, expect, it } from 'vitest';
import {
  buildDiscreetPaymentDescription,
  resolveStatementDescriptor,
} from '../../functions/api/_mercadopago';
import {
  buildRfc5322MimeMessage,
  resolveDiscreetEmailDisplayName,
} from '../../functions/api/_smtpHelper';
import {
  renderAccessCodeEmailHtml,
  renderAppointmentReminderEmailHtml,
  renderEmailChangeCodeEmailHtml,
  renderRefundConfirmationEmailHtml,
  renderSecurityAlertEmailHtml,
  renderTransactionalNotificationHtml,
  renderVaultBrowserConfirmationEmailHtml,
  renderVaultDeliveryEmailHtml,
} from '../../functions/api/id/_emailTemplates';
import { renderTokenAccessEmailHtml } from '../../functions/api/payments/send-otp';
import { renderPersonalizadoClientEmailHtml } from '../../functions/api/personalizados/_emailHelper';
import { generateIcsCalendar } from '../../lib/appointments/notifications';

const SENSITIVE_RE = /nua\s*borges|ensaio\s+secreto|chamada\s+vip|chamada\s+privativa|cofre\s+privativo|encomenda\s+personalizada/i;

describe('Discreet Purchase & Privacy Hardening', () => {
  it('gera descrição Pix e statement_descriptor 100% neutros sem expor marca ou produto', () => {
    const descPack = buildDiscreetPaymentDescription('ord_20261126_ab12cd34');
    const descVip = buildDiscreetPaymentDescription('app_99887766');
    const descCustom = buildDiscreetPaymentDescription('nua_pers_ped_55443322');

    for (const desc of [descPack, descVip, descCustom]) {
      expect(desc).toMatch(/^NB Servicos Digitais - Ref\. [A-Z0-9]{1,8}$/);
      expect(SENSITIVE_RE.test(desc)).toBe(false);
    }

    expect(resolveStatementDescriptor()).toBe('NB DIGITAL');
    expect(resolveStatementDescriptor({ MP_STATEMENT_DESCRIPTOR: 'Studio NB Prod!' })).toBe('STUDIO NB PROD');
  });

  it('usa remetente de e-mail neutro por padrão (sem NUA Borges no From)', () => {
    expect(resolveDiscreetEmailDisplayName()).toBe('NB Digital');
    expect(resolveDiscreetEmailDisplayName({ EMAIL_DISPLAY_NAME: 'NB Servicos' })).toBe('NB Servicos');

    const { mime } = buildRfc5322MimeMessage({
      from: 'contato@example.com',
      to: 'cliente@example.com',
      subject: 'Pedido confirmado',
      html: '<p>Ok</p>',
    });
    expect(mime).toContain('From: NB Digital <contato@example.com>');
    expect(mime).not.toContain('From: NUA Borges');
  });

  it('mantém assuntos, cabeçalhos e preheaders de e-mails ao cliente livres da marca e de títulos sensíveis', () => {
    const secretTitle = 'Ensaio Secreto Intimo 18+';
    const mails = [
      renderAccessCodeEmailHtml({ code: '123456', expiresMinutes: 10 }),
      renderEmailChangeCodeEmailHtml({ code: '654321', stage: 'current', expiresMinutes: 10 }),
      renderSecurityAlertEmailHtml({ deviceLabel: 'iPhone', atFormatted: '26/11 19:00' }),
      renderTransactionalNotificationHtml({
        subject: 'Atualização do seu pedido',
        heading: 'Status atualizado',
        message: 'Confira na sua conta.',
        orderRef: 'ord_123',
      }),
      renderAppointmentReminderEmailHtml({
        clientName: 'Marcos',
        modalityName: 'Chamada VIP 30min',
        dateFormatted: '26/11/2026',
        dualTimeCombined: '20:00 (Brasília)',
        stage: 'one_hour_before',
        accountUrl: 'https://nuaborges.com.br/conta',
        voucherUrl: 'https://nuaborges.com.br/chamadas/reserva?token=abc',
      }),
      renderVaultBrowserConfirmationEmailHtml({
        confirmUrl: 'https://nuaborges.com.br/conta',
        itemTitle: secretTitle,
      }),
      renderVaultDeliveryEmailHtml({
        itemTitle: secretTitle,
        kindLabel: 'Pack',
        orderRef: 'ord_123',
        vaultUrl: 'https://nuaborges.com.br/conta?tab=biblioteca&item=ord_123',
      }),
      renderRefundConfirmationEmailHtml({
        itemTitle: secretTitle,
        orderRef: 'ord_123',
        refundAmountFormatted: 'R$ 99,00',
      }),
      renderPersonalizadoClientEmailHtml(
        {
          id: 'ped_123456',
          clientName: 'Marcos',
          clientContact: 'marcos@example.com',
          photoCount: 5,
          videoDurationMinutes: 2,
          mentionName: false,
          express24h: false,
          briefing: 'Briefing privado',
          deliveryChannel: 'vault',
          totalPrice: 250,
          status: 'em_producao',
          payment: { status: 'paid', method: 'pix', amount: 250 },
          vaultFiles: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any,
        'marcos@example.com'
      ),
    ];

    for (const mail of mails) {
      expect(SENSITIVE_RE.test(mail.subject)).toBe(false);
      expect(mail.subject).not.toContain(secretTitle);
      expect(mail.html).not.toContain(secretTitle);
      expect(mail.html).toContain('NB DIGITAL');
      expect(mail.html).not.toContain('NUA BORGES');
    }

    const tokenHtml = renderTokenAccessEmailHtml({
      orderId: 'ord_999',
      purchaseToken: 'tok_999',
      itemTitle: secretTitle,
      itemSlug: 'ensaio',
      payerEmail: 'marcos@example.com',
    });
    expect(tokenHtml).not.toContain(secretTitle);
    expect(tokenHtml).not.toContain('Nua Borges');
  });

  it('gera arquivo .ics de calendário totalmente discreto sem marca ou modalidade explícita', () => {
    const ics = generateIcsCalendar({
      id: 'apt_123',
      publicToken: 'tok_123',
      modalityId: 'mod_1',
      modalityName: 'Chamada VIP Íntima 30min',
      durationMinutes: 30,
      price: 300,
      date: '2026-12-01',
      startTime: '20:00',
      endTime: '20:30',
      timezone: 'Europe/Dublin',
      clientTimezone: 'America/Sao_Paulo',
      clientName: 'Marcos',
      clientEmail: 'marcos@example.com',
      clientContact: '11999999999',
      status: 'confirmada',
      payment: { status: 'paid', method: 'pix', amount: 300 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      history: [],
    } as any);

    expect(ics).toContain('SUMMARY:Compromisso Reservado');
    expect(ics).toContain('PRODID:-//NB Digital//Agenda//PT-BR');
    expect(ics).not.toContain('Nua Borges');
    expect(ics).not.toContain('Chamada VIP');
    expect(ics).not.toContain('nuaborges.com.br');
  });
});
