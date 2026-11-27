import { describe, it, expect } from 'vitest';
import {
  buildProtocolActivityFeed,
  classifyAuditEvent,
  sanitizeEventDetails,
} from '@/functions/api/_central/protocolActivity';
import type { AuditEvent } from '@/functions/api/_auditHelper';

describe('PHDEV — Barramento de Atividade por Protocolo (protocolActivity)', () => {
  it('sanitiza estritamente segredos e credenciais antes de persistir ou exibir detalhes', () => {
    const clean = sanitizeEventDetails({
      orderId: 'ord_123',
      amount: 99.9,
      confirmationPassword: 'super-secret-password',
      authToken: 'tok_xyz',
      cookie: 'session=abc',
      cpf: '000.000.000-00',
      nested: {
        packTitle: 'Noite em Kyoto',
        secretKey: 'should-be-removed',
      },
    });

    expect(clean.orderId).toBe('ord_123');
    expect(clean.amount).toBe(99.9);
    expect(clean).not.toHaveProperty('confirmationPassword');
    expect(clean).not.toHaveProperty('authToken');
    expect(clean).not.toHaveProperty('cookie');
    expect(clean).not.toHaveProperty('cpf');
    expect((clean.nested as Record<string, unknown>).packTitle).toBe('Noite em Kyoto');
    expect(clean.nested as Record<string, unknown>).not.toHaveProperty('secretKey');
  });

  it('classifica automaticamente compras, uploads da NUA, entregas no Cofre, logins e contenções no protocolo correto', () => {
    const events: AuditEvent[] = [
      {
        id: 'ev-1',
        timestamp: '2026-11-27T01:40:00.000Z',
        type: 'MEDIA_UPLOAD',
        severity: 'info',
        actorRole: 'nua',
        actor: { ip: 'hash-1' },
        summary: 'NUA enviou foto ensaio-04.webp para a biblioteca',
        details: { fileName: 'ensaio-04.webp' },
      },
      {
        id: 'ev-2',
        timestamp: '2026-11-27T01:41:00.000Z',
        type: 'ORDER_PAID',
        severity: 'info',
        actorRole: 'webhook',
        actor: { ip: 'hash-2' },
        summary: 'Pagamento aprovado: Pack Kyoto',
        details: { orderId: 'ord_99', amount: 89.9 },
      },
      {
        id: 'ev-3',
        timestamp: '2026-11-27T01:42:00.000Z',
        type: 'VAULT_ACCESS_GRANTED',
        severity: 'info',
        actorRole: 'sistema',
        actor: { ip: 'hash-3' },
        summary: 'Acesso liberado no Cofre: Pack Kyoto',
        details: { orderId: 'ord_99' },
      },
      {
        id: 'ev-4',
        timestamp: '2026-11-27T01:43:00.000Z',
        type: 'GATEWAY_SECURITY_BLOCK',
        severity: 'warning',
        actorRole: 'sistema',
        actor: { ip: 'hash-4' },
        summary: 'Rate limit acionado em POST /api/payments/create-pix',
        details: { route: '/api/payments/create-pix' },
      },
      {
        id: 'ev-5',
        timestamp: '2026-11-27T01:44:00.000Z',
        type: 'SECURITY_ACTION',
        severity: 'critical',
        actorRole: 'phdev',
        actor: { ip: 'hash-5' },
        summary: 'Contenção ITACHI ativada (INC-2026-11)',
        details: { protocol: 'itachi', incidentId: 'INC-2026-11', scopes: ['checkout'] },
      },
    ];

    expect(classifyAuditEvent(events[0]).protocol).toBe('tobirama');
    expect(classifyAuditEvent(events[0]).actor).toBe('nua');
    expect(classifyAuditEvent(events[1]).protocol).toBe('kakuzu');
    expect(classifyAuditEvent(events[2]).protocol).toBe('naruto');
    expect(classifyAuditEvent(events[3]).protocol).toBe('kakashi');
    expect(classifyAuditEvent(events[4]).protocol).toBe('itachi');

    const feed = buildProtocolActivityFeed(events);
    expect(feed.summary.total).toBe(5);
    expect(feed.summary.nuaActions).toBe(1);
    expect(feed.countsByProtocol.neji).toBe(5);
    expect(feed.countsByProtocol.tobirama).toBe(1);
    expect(feed.countsByProtocol.kakuzu).toBe(1);
    expect(feed.countsByProtocol.naruto).toBe(1);
    expect(feed.countsByProtocol.kakashi).toBe(1);
    expect(feed.countsByProtocol.itachi).toBe(1);

    const onlyNua = buildProtocolActivityFeed(events, { actor: 'nua' });
    expect(onlyNua.events).toHaveLength(1);
    expect(onlyNua.events[0].id).toBe('ev-1');

    const onlyKakuzu = buildProtocolActivityFeed(events, { protocol: 'kakuzu' });
    expect(onlyKakuzu.events).toHaveLength(1);
    expect(onlyKakuzu.events[0].friendlySubtitle).toContain('R$');
  });
});
