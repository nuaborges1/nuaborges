import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PhdevKonohaConsole } from '@/components/nua/admin/phdev/PhdevKonohaConsole';
import { DEFAULT_SITE_CONTENT } from '@/lib/defaultContent';
import type { SystemControlSnapshot } from '@/lib/phdev/konohagakure/types';

function mockControlFetch(snapshot: SystemControlSnapshot | null, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/api/control/system')) {
      if (!snapshot || status >= 400) {
        return new Response(JSON.stringify({ success: false, error: 'Telemetria indisponível' }), {
          status: status >= 400 ? status : 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

const PEACE_SNAPSHOT: SystemControlSnapshot = {
  success: true,
  containment: [],
  emergencyAccessVerified: true,
  registeredPolicies: 42,
  recovery: {
    at: '2026-11-27T02:00:00.000Z',
    vault: { needsIntervention: 0 },
    paidEmail: { needsIntervention: 0 },
    refunds: { needsIntervention: 0 },
    refundsPaused: false,
  },
  integrations: {
    supabase: { configured: true, connected: true },
    backblazeB2: { configured: true },
    mercadoPagoCommercial: { configured: true, connected: true, nickname: 'NUA_TEST' },
    mensalidadeStaticPix: { configured: true },
    turnstile: { configured: true },
    smtp: { configured: true },
  },
  recentAudit: [],
};

describe('PHDEV — NUA Protocol Konohagakure Edition', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/admin');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseProps = {
    content: DEFAULT_SITE_CONTENT,
    activeModule: 'configuracoes' as const,
    onSelectModule: vi.fn(),
    onLogout: vi.fn(),
  };

  it('renderiza os 9 protocolos oficiais, HAGOROMO separado como ROOT AUTHORITY e banner "A vila está em paz." quando comprovado', async () => {
    mockControlFetch(PEACE_SNAPSHOT);

    render(<PhdevKonohaConsole {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('A vila está em paz.')).toBeInTheDocument();
    });

    for (const id of ['kakashi', 'minato', 'kakuzu', 'neji', 'tobirama', 'itachi', 'madara', 'naruto', 'kaguya']) {
      expect(screen.getByTestId(`phdev-protocol-card-${id}`)).toBeInTheDocument();
    }

    expect(screen.getByTestId('phdev-hagoromo-authority')).toBeInTheDocument();
    expect(screen.getByText(/ROOT AUTHORITY/i)).toBeInTheDocument();

    expect(screen.queryByText(/Kage Bunshin/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('phdev-protocol-card-pain')).not.toBeInTheDocument();
    expect(screen.queryByText(/Protocolo Pain ativado/i)).not.toBeInTheDocument();
  });

  it('abre a página personalizada de cada um dos 9 protocolos e do HAGOROMO com troca rápida e retorno à visão geral', async () => {
    mockControlFetch(PEACE_SNAPSHOT);

    render(<PhdevKonohaConsole {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('phdev-protocol-card-kakashi')).toBeInTheDocument();
    });

    // Abre P01 KAKASHI a partir do card e valida slug limpo
    fireEvent.click(screen.getByTestId('phdev-protocol-card-kakashi'));
    expect(screen.getByTestId('phdev-protocol-page-kakashi')).toBeInTheDocument();
    expect(screen.getByTestId('phdev-protocol-hero')).toHaveTextContent('Protocolo KAKASHI');
    expect(window.location.pathname).toBe('/admin/protocolos/kakashi');
    expect(window.location.search).toBe('');

    // Alterna pelos demais protocolos via Quick Switcher
    for (const id of ['minato', 'kakuzu', 'neji', 'tobirama', 'itachi', 'madara', 'naruto', 'kaguya'] as const) {
      fireEvent.click(screen.getByTestId(`phdev-switch-${id}`));
      expect(screen.getByTestId(`phdev-protocol-page-${id}`)).toBeInTheDocument();
      expect(window.location.pathname).toBe(`/admin/protocolos/${id}`);
    }

    // Abre HAGOROMO ROOT AUTHORITY via Quick Switcher
    fireEvent.click(screen.getByTestId('phdev-switch-hagoromo'));
    expect(screen.getByTestId('phdev-protocol-page-hagoromo')).toBeInTheDocument();
    expect(screen.getByTestId('phdev-protocol-hero')).toHaveTextContent('HAGOROMO — ROOT AUTHORITY');
    expect(window.location.pathname).toBe('/admin/protocolos/hagoromo');

    // Retorna para a visão geral
    fireEvent.click(screen.getByTestId('phdev-back-to-overview'));
    expect(screen.getByTestId('phdev-protocol-card-kakashi')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/protocolos');
  });

  it('exibe "A vila aguarda novas informações." quando faltam integrações verificadas (nunca normalidade artificial)', async () => {
    mockControlFetch({
      success: true,
      containment: [],
      emergencyAccessVerified: false,
      registeredPolicies: 42,
      integrations: {
        supabase: { configured: true, connected: true },
        backblazeB2: { configured: false },
        mercadoPagoCommercial: { configured: false, connected: false },
      },
      recentAudit: [],
    });

    render(<PhdevKonohaConsole {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('A vila aguarda novas informações.')).toBeInTheDocument();
    });
    expect(screen.queryByText('A vila está em paz.')).not.toBeInTheDocument();
  });

  it('exibe o banner PAIN apenas diante de incidente crítico confirmado (MADARA ou KAGUYA) com evidência real', async () => {
    mockControlFetch({
      ...PEACE_SNAPSHOT,
      containment: [
        {
          protocol: 'madara',
          active: true,
          incidentId: 'INC-2026-091',
          evidence: 'Comprometimento confirmado de token administrativo no gateway.',
          scopes: [],
          changedBy: 'phdev',
          changedAt: '2026-11-27T02:15:00.000Z',
          revision: 'rev-madara-1',
        },
      ],
    });

    render(<PhdevKonohaConsole {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByText('A vila está sob ataque. Protocolo Pain ativado.')).toBeInTheDocument();
    });
    expect(screen.getByTestId('phdev-operational-banner')).toHaveAttribute('data-banner-kind', 'pain');
    expect(screen.getAllByText(/INC-2026-091/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Madara — Infinite Tsukuyomi ativado\./).length).toBeGreaterThanOrEqual(1);
  });

  it('não exibe PAIN quando apenas ITACHI (contenção seletiva) está ativo', async () => {
    mockControlFetch({
      ...PEACE_SNAPSHOT,
      emergencyAccessVerified: false,
      containment: [
        {
          protocol: 'itachi',
          active: true,
          incidentId: 'INC-2026-042',
          evidence: 'Pausa preventiva do checkout durante revisão de webhook.',
          scopes: ['checkout'],
          changedBy: 'phdev',
          changedAt: '2026-11-27T02:10:00.000Z',
          revision: 'rev-itachi-1',
        },
      ],
    });

    render(<PhdevKonohaConsole {...baseProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('A ameaça foi isolada.').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByText(/Protocolo Pain ativado/i)).not.toBeInTheDocument();
  });
});
