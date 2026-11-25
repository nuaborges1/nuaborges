import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrelaunchFeedbackForm } from '@/components/nua/feedback/PrelaunchFeedbackForm';
import { PrelaunchFeedbackModule } from '@/components/nua/admin/PrelaunchFeedbackModule';
import { HelpModalProvider } from '@/components/nua/admin/help/HelpModalContext';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('UI — Formulário /avaliacao/[codigo] & Central Avaliações do Pré-lançamento', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    const memStorage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', { value: memStorage, configurable: true, writable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: memStorage, configurable: true, writable: true });
    Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true });
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  it('navega entre etapas, aplica perguntas condicionais, pula áreas não visitadas, salva rascunho local, relata múltiplos problemas e conclui envio', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/prelaunch-feedback/session')) {
        return Response.json({ state: 'available', linkId: 'link_ui_1', retentionDays: 90 });
      }
      if (url.includes('/api/prelaunch-feedback/start')) {
        return Response.json({ ok: true, state: 'in_progress', linkId: 'link_ui_1' });
      }
      if (url.includes('/api/prelaunch-feedback/submit')) {
        const payload = JSON.parse(String(init?.body || '{}'));
        expect(payload.firstName).toBe('Marina');
        expect(payload.lastName).toBe('Alves');
        expect(payload.issues).toHaveLength(2);
        return Response.json({ ok: true, message: 'Obrigada por fazer parte desse momento!' }, { status: 201 });
      }
      return Response.json({});
    });
    globalThis.fetch = fetchMock as typeof fetch;

    render(<PrelaunchFeedbackForm initialCode="codigo-teste-ui-1234567890" />);

    // Apresentação inicial
    expect(await screen.findByText('Sua opinião faz parte dessa história.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Começar avaliação/i }));

    // Parte 1
    expect(await screen.findByText('O que achou do site?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    // Parte 2 (pergunta condicional)
    expect(await screen.findByText('Foi fácil encontrar as coisas?')).toBeInTheDocument();
    const naoButtons = screen.getAllByRole('radio', { name: 'Não' });
    fireEvent.click(naoButtons[0]);
    expect(await screen.findByPlaceholderText(/Qual página você teve dificuldade/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    // Parte 3 (pular Packs)
    expect(await screen.findByText('O que achou dos Packs?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Não visitei \(pular esta parte\)/i }));
    expect(screen.getByText(/Você pode avançar direto/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    // Parte 4 (Personalizados) -> pula
    expect(await screen.findByText('Como foi montar um Personalizado?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    // Parte 5 (Chamadas VIP) -> pula
    expect(await screen.findByText('Como foi escolher uma Chamada VIP?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    // Parte 6 (condicional por atividade)
    expect(await screen.findByText('Conseguiu comprar e acessar seus conteúdos?')).toBeInTheDocument();
    expect(screen.queryByText('Recebeu o e-mail esperado?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Recebi um e-mail do site/i }));
    expect(await screen.findByText('Recebeu o e-mail esperado?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    // Parte 7 (múltiplos problemas)
    expect(await screen.findByText('Alguma coisa deu errado?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Contar um problema/i }));
    const tryingInputs1 = screen.getAllByPlaceholderText(/Tentei abrir as fotos/i);
    fireEvent.change(tryingInputs1[0], { target: { value: 'Abrir galeria' } });
    fireEvent.click(screen.getByRole('button', { name: /Contar outro problema/i }));
    const tryingInputs2 = screen.getAllByPlaceholderText(/Tentei abrir as fotos/i);
    fireEvent.change(tryingInputs2[1], { target: { value: 'Clicar em contato' } });

    // Verifica rascunho salvo no localStorage sem conter o código bruto
    const savedRaw = localStorage.getItem('nua_prelaunch_draft_link_ui_1');
    expect(savedRaw).toBeTruthy();
    expect(savedRaw).not.toContain('codigo-teste-ui-1234567890');

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));

    // Parte 8
    expect(await screen.findByText('O que você mudaria?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ir para a etapa final/i }));

    // Identificação final + envio
    expect(await screen.findByText('Como podemos te chamar?')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Nome/i), { target: { value: 'Marina' } });
    fireEvent.change(screen.getByLabelText(/^Sobrenome/i), { target: { value: 'Alves' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar avaliação/i }));

    expect(await screen.findByText('Obrigada por fazer parte desse momento!')).toBeInTheDocument();
    // Rascunho local deve ser limpo após conclusão
    expect(localStorage.getItem('nua_prelaunch_draft_link_ui_1')).toBeNull();
  });

  it('exibe central administrativa com 4 abas, geração/cópia de links e filtros', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    let currentLinks = [
      {
        id: 'lnk-1',
        adminCode: 'AV-001',
        status: 'completed',
        startedAt: '2026-11-25T10:00:00Z',
        completedAt: '2026-11-25T10:15:00Z',
        revokedAt: null,
        responseId: 'resp-1',
        participantName: 'Lucas Lima',
        createdAt: '2026-11-25T09:00:00Z',
      },
    ];

    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        if (body.action === 'generate_links') {
          currentLinks = [
            {
              id: 'lnk-2',
              adminCode: 'AV-002',
              status: 'available',
              startedAt: null,
              completedAt: null,
              revokedAt: null,
              responseId: null,
              participantName: null,
              createdAt: '2026-11-25T11:00:00Z',
            },
            ...currentLinks,
          ];
          return Response.json(
            {
              success: true,
              generated: [
                {
                  id: 'lnk-2',
                  adminCode: 'AV-002',
                  url: 'https://nuaborges.com.br/avaliacao/segredo12345678901234',
                  createdAt: '2026-11-25T11:00:00Z',
                },
              ],
            },
            { status: 201 }
          );
        }
      }

      return Response.json({
        success: true,
        settings: { collectionActive: true, hideFromSidebar: false, retentionDays: 90, closedAt: null, updatedAt: null },
        metrics: {
          linksGenerated: currentLinks.length,
          linksAvailable: currentLinks.filter((l) => l.status === 'available').length,
          linksInProgress: 0,
          linksCompleted: 1,
          linksRevoked: 0,
          responsesReceived: 1,
          responsesPendingReview: 1,
          issuesReported: 1,
          issuesResolved: 0,
          averageOverallRating: 5,
          averageAppearanceRating: 5,
          averagePacksRating: 4,
          topEvaluatedAreas: [{ area: 'Packs', count: 1 }],
          areasWithMostIssues: [{ area: 'Packs', count: 1 }],
        },
        links: currentLinks,
        responses: [
          {
            id: 'resp-1',
            linkId: 'lnk-1',
            adminCode: 'AV-001',
            firstName: 'Lucas',
            lastName: 'Lima',
            participantName: 'Lucas Lima',
            overallRating: 5,
            appearanceRating: 5,
            deviceUsed: 'celular',
            areasVisited: ['Packs'],
            answers: { p1_nota_aparencia: 5, p8_nota_geral: 5 },
            reviewStatus: 'new',
            adminNotes: '',
            issuesCount: 1,
            issues: [],
            submittedAt: '2026-11-25T10:15:00Z',
            updatedAt: '2026-11-25T10:15:00Z',
          },
        ],
        issues: [
          {
            id: 'iss-1',
            responseId: 'resp-1',
            linkId: 'lnk-1',
            participantName: 'Lucas Lima',
            area: 'Packs',
            whatTrying: 'Ver capa',
            whatHappened: 'Demorou',
            whatExpected: 'Carregar rápido',
            happenedMoreThanOnce: 'yes',
            attachments: [],
            issueStatus: 'new',
            adminNotes: '',
            clusterKey: 'packs:demorou',
            similarCount: 2,
            createdAt: '2026-11-25T10:15:00Z',
            updatedAt: '2026-11-25T10:15:00Z',
          },
        ],
      });
    }) as typeof fetch;

    render(
      <HelpModalProvider>
        <PrelaunchFeedbackModule />
      </HelpModalProvider>
    );

    expect(await screen.findByText('Avaliações do Pré-lançamento')).toBeInTheDocument();
    expect(screen.getAllByText('5.0 / 5').length).toBeGreaterThanOrEqual(1);

    // Aba Links -> Gerar e Copiar
    fireEvent.click(screen.getByRole('button', { name: /Links de avaliação/i }));
    expect(await screen.findByText('AV-001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /\+5 links/i }));
    await waitFor(() => expect(screen.getAllByText('AV-002').length).toBeGreaterThanOrEqual(1));

    fireEvent.click(screen.getByRole('button', { name: /Copiar todos os links disponíveis/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('AV-002: https://nuaborges.com.br/avaliacao/'));

    // Aba Respostas recebidas
    fireEvent.click(screen.getByRole('button', { name: /Respostas recebidas/i }));
    expect((await screen.findAllByText('Lucas Lima')).length).toBeGreaterThanOrEqual(1);

    // Aba Problemas encontrados
    fireEvent.click(screen.getByRole('button', { name: /Problemas encontrados/i }));
    expect(await screen.findByText(/2 relatos semelhantes/i)).toBeInTheDocument();
  });
});
