import { describe, it, expect } from 'vitest';
import { computeSidebarBadges } from '@/lib/admin/sidebarBadges';
import type { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';
import {
  onRequestGet,
  onRequestPost,
} from '@/functions/api/admin/notification-prefs';
import { createMemoryNuaIdStore } from '@/functions/api/id/_nuaIdStore';

describe('Sidebar Badges — Novo vs Visualizado vs Pendente (sem duplicação)', () => {
  const sampleOrders: UnifiedOrderFeedItem[] = [
    {
      id: 'ord_pack_1',
      type: 'pack',
      title: 'Ensaio Ouro',
      customerName: 'João',
      amount: 99,
      amountFormatted: 'R$ 99,00',
      status: 'paid',
      statusLabel: 'Pago / Liberado',
      createdAt: '2026-11-25T12:00:00Z',
      tab: 'historico',
      meta: { isPack: true },
    },
    {
      id: 'pers_1',
      type: 'personalizado',
      title: 'Personalizado (5 fotos)',
      customerName: 'Carlos',
      amount: 250,
      amountFormatted: 'R$ 250,00',
      status: 'em_producao',
      statusLabel: 'Pago / Em Produção',
      createdAt: '2026-11-25T11:00:00Z',
      tab: 'personalizados',
    },
    {
      id: 'apt_1',
      type: 'appointment',
      title: 'Chamada: VIP 30min',
      customerName: 'Lucas',
      amount: 350,
      amountFormatted: 'R$ 350,00',
      status: 'confirmada',
      statusLabel: 'Confirmada',
      createdAt: '2026-11-25T10:00:00Z',
      tab: 'chamadas',
    },
    {
      id: 'apt_2',
      type: 'appointment',
      title: 'Chamada: VIP 15min',
      customerName: 'Pedro',
      amount: 180,
      amountFormatted: 'R$ 180,00',
      status: 'concluida',
      statusLabel: 'Concluída',
      createdAt: '2026-11-24T10:00:00Z',
      tab: 'historico',
    },
  ];

  it('distribui indicadores sem duplicação entre módulos', () => {
    const badges = computeSidebarBadges(sampleOrders, new Set());
    expect(badges.conteudos?.count).toBe(1);
    expect(badges.personalizados?.count).toBe(1);
    expect(badges.chamadas?.count).toBe(1);
    expect(badges.historico?.count).toBe(1); // apenas apt_2 (concluída e não visualizada)
  });

  it('mantém pendências operacionais mesmo depois de visualizadas, mas limpa packs visualizados', () => {
    const allRead = new Set(['ord_pack_1', 'pers_1', 'apt_1', 'apt_2']);
    const badges = computeSidebarBadges(sampleOrders, allRead);

    // Pack visualizado sai da badge
    expect(badges.conteudos).toBeUndefined();
    // Histórico visualizado sai da badge
    expect(badges.historico).toBeUndefined();
    // Personalizado em produção e Chamada confirmada continuam pendentes!
    expect(badges.personalizados?.count).toBe(1);
    expect(badges.chamadas?.count).toBe(1);
  });

  it('oculta módulos sem pendências e ignora packs estornados', () => {
    const refundedPack: UnifiedOrderFeedItem = {
      ...sampleOrders[0],
      id: 'ord_pack_ref',
      status: 'refunded',
    };
    const badges = computeSidebarBadges([refundedPack], new Set());
    expect(badges.conteudos).toBeUndefined();
    expect(badges.personalizados).toBeUndefined();
    expect(badges.chamadas).toBeUndefined();
    expect(badges.historico).toBeUndefined();
  });
});

describe('API /api/admin/notification-prefs — Persistência e isolamento por perfil', () => {
  it('rejeita acesso sem autenticação', async () => {
    const store = createMemoryNuaIdStore();
    const env = { ENVIRONMENT: 'production', __NUA_ID_TEST_STORE__: store } as any;
    const res = await onRequestGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/notification-prefs'),
      env,
    });
    expect(res.status).toBe(401);
  });

  it('mantém preferências e reconhecimentos isolados entre Nua Borges e PHDEV', async () => {
    const store = createMemoryNuaIdStore();
    const env = { ENVIRONMENT: 'production', __NUA_ID_TEST_STORE__: store } as any;

    // Nua desativa som e reconhece ord_1
    const resNuaSave = await onRequestPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/notification-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_settings',
          settings: { alertsEnabled: true, soundEnabled: false, windowsNotificationEnabled: true, tabFlashEnabled: true },
        }),
      }),
      env,
      data: { actor: { role: 'dev', subject: 'nua_borges', authMethod: 'cookie' } },
    });
    expect(resNuaSave.status).toBe(200);

    await onRequestPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/notification-prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge', orderIds: ['ord_1'] }),
      }),
      env,
      data: { actor: { role: 'dev', subject: 'nua_borges', authMethod: 'cookie' } },
    });

    // PHDEV continua com som ativado e ord_1 ainda não reconhecido
    const resPhdev = await onRequestGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/notification-prefs'),
      env,
      data: { actor: { role: 'dev', subject: 'phdev', authMethod: 'cookie' } },
    });
    const phdevJson: any = await resPhdev.json();
    expect(phdevJson.state.profile).toBe('phdev');
    expect(phdevJson.state.settings.soundEnabled).toBe(true);
    expect(phdevJson.state.acknowledgedOrderIds).toEqual([]);

    // Nua recarrega e recupera estado persistido
    const resNua = await onRequestGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/notification-prefs'),
      env,
      data: { actor: { role: 'dev', subject: 'nua_borges', authMethod: 'cookie' } },
    });
    const nuaJson: any = await resNua.json();
    expect(nuaJson.state.profile).toBe('nua');
    expect(nuaJson.state.settings.soundEnabled).toBe(false);
    expect(nuaJson.state.acknowledgedOrderIds).toContain('ord_1');
  });
});
