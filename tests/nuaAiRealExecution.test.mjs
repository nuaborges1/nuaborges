import test from 'node:test';
import assert from 'node:assert/strict';
import { toolDeclarations, executeTool } from '../lib/nuaAi/toolRegistry.mjs';
import { classifyNayTurn, assistantChat } from '../lib/nuaAi/adminAssistant.mjs';
import { extractMarkdownImages } from '../components/nua/admin/ai/FormattedAiMessage.tsx';

test('Nua IA - Auditoria e Correção da Execução Real', async (t) => {
  await t.test('1. Papel "client" possui ferramentas operacionais liberadas', () => {
    const packsTools = toolDeclarations('client', 'packs').map((t) => t.name);
    assert.ok(packsTools.includes('create_pack'), 'create_pack deve estar disponível para client');
    assert.ok(packsTools.includes('list_packs'), 'list_packs deve estar disponível para client');
    assert.ok(packsTools.includes('update_pack'), 'update_pack deve estar disponível para client');
    assert.ok(packsTools.includes('attach_media'), 'attach_media deve estar disponível para client');

    const galleryTools = toolDeclarations('client', 'gallery').map((t) => t.name);
    assert.ok(galleryTools.includes('add_gallery_photo'), 'add_gallery_photo deve estar disponível para client');
    assert.ok(galleryTools.includes('get_gallery'), 'get_gallery deve estar disponível para client');
  });

  await t.test('2. create_pack executa mutação real no conteúdo com modality "pack" e isDraft', async () => {
    const initialContent = {
      library: [
        { id: 'm1', name: 'Luz & Silhueta', url: '/images/nua/gallery/gallery-1.png', isVideo: false },
        { id: 'm2', name: 'Sombras Íntimas', url: '/images/nua/gallery/gallery-2.png', isVideo: false },
      ],
      avulsos: {
        title: 'Conteúdos e packs',
        subtitle: '',
        items: [],
      },
    };

    const ctx = {
      content: initialContent,
      role: 'client',
      attached: [],
    };

    const outcome = await executeTool('create_pack', {
      title: 'Luz & Silhueta',
      description: 'Ensaio fotográfico autoral completo',
      price: '67.00',
      mediaNames: ['Luz & Silhueta', 'Sombras Íntimas'],
    }, ctx);

    assert.equal(outcome.ok, true, 'Tool execution deve retornar ok: true');
    assert.ok(outcome.content, 'Deve retornar content atualizado');
    assert.equal(outcome.content.avulsos.items.length, 1, 'Deve conter 1 pack nos avulsos');

    const pack = outcome.content.avulsos.items[0];
    assert.equal(pack.title, 'Luz & Silhueta');
    assert.equal(pack.modality, 'pack');
    assert.equal(pack.numericPrice, 67);
    assert.equal(pack.price, 'R$ 67,00');
    assert.equal(pack.exclusivePhotos.length, 2);
    assert.equal(pack.isDraft, true);
    assert.ok(pack.id.startsWith('pack_'));
    assert.equal(outcome.action.type, 'create_pack');
    assert.equal(outcome.lastContext.entityType, 'pack');
  });

  await t.test('3. classifyNayTurn herda escopo de packs em confirmações e follow-ups', () => {
    // Caso 1: Usuária diz "sim, faz isso" com lastContext de pack
    const turn1 = classifyNayTurn('sim, faz isso', {}, { entityType: 'pack' });
    assert.equal(turn1.scope, 'packs');
    assert.equal(turn1.tier, 'TIER_2_OPS');

    // Caso 2: Usuária confirma "pode criar"
    const turn2 = classifyNayTurn('pode criar', {}, null, [
      { role: 'user', content: 'Cria o pack Luz & Silhueta por 67 reais' },
      { role: 'assistant', content: 'Posso montar o rascunho com 2 fotos. Quer que eu faça?' },
    ]);
    assert.equal(turn2.scope, 'packs');
    assert.equal(turn2.tier, 'TIER_2_OPS');

    // Caso 3: Usuária reclama que não foi criado na sequência da conversa sobre packs
    const turn3 = classifyNayTurn('nada foi criado, confere pra mim', {}, null, [
      { role: 'user', content: 'Cria o pack Luz & Silhueta por 67 reais' },
      { role: 'assistant', content: 'Posso montar o rascunho com 2 fotos. Quer que eu faça?' },
    ]);
    assert.equal(turn3.scope, 'packs');
    assert.equal(turn3.tier, 'TIER_2_OPS');
  });

  await t.test('4. Trava anti-alucinação bloqueia falsa afirmação de sucesso sem execução de ferramenta', async () => {
    // Simula assistente tentando responder que criou o pack sem chamar nenhuma ferramenta
    const services = {
      read: async () => null,
      write: async () => true,
      generate: async () => ({
        text: 'Prontinho, Nua. Agora sim, tudo feito de verdade nos bastidores. O pack Luz & Silhueta já está oficialmente montado com valor de R$ 67,00.',
        calls: [],
      }),
    };

    const result = await assistantChat(
      {
        message: 'sim, confirma',
        actorRole: 'client',
        conversationId: 'conv_test_1',
        content: { library: [], avulsos: { items: [] } },
      },
      services
    );

    assert.equal(result.ok, true);
    assert.equal(result.actionExecuted, null, 'Nenhuma ação executada deve ser retornada');
    assert.ok(
      result.reply.includes('nenhuma operação foi gravada no painel ainda') ||
      result.reply.includes('nenhuma alteração foi gravada'),
      'Resposta deve ser interceptada e indicar ausência de gravação'
    );
    assert.equal(
      result.reply.includes('tudo feito de verdade nos bastidores'),
      false,
      'Não pode conter a alucinação de sucesso'
    );
  });

  await t.test('5. FormattedAiMessage extrai miniaturas mesmo com URLs quebradas em linhas e legendas repetidas', () => {
    const raw = `• Algumas fotos disponíveis na sua biblioteca para esse pack:

![Olhares](/media/media-1792615883000-
kf8cft/full.webp)
Olhares

![Galeria — Presença & Olhar]
(/images/nua/gallery/gallery-4.png)
Presença & Olhar

![Galeria — Luz & Silhueta]
(/images/nua/gallery/gallery-1.png)
Luz & Silhueta

![Galeria — Sombras Íntimas]
(/images/nua/gallery/gallery-2.png)
Sombras Íntimas`;

    const extracted = extractMarkdownImages(raw);
    assert.equal(extracted.images.length, 4, 'Deve extrair exatamente 4 imagens');
    assert.equal(extracted.images[0].url, '/media/media-1792615883000-kf8cft/full.webp');
    assert.equal(extracted.images[1].url, '/images/nua/gallery/gallery-4.png');
    assert.equal(extracted.images[1].title, 'Presença & Olhar');
    assert.equal(extracted.images[2].url, '/images/nua/gallery/gallery-1.png');
    assert.equal(extracted.images[3].url, '/images/nua/gallery/gallery-2.png');
    assert.equal(extracted.textWithoutImages, '• Algumas fotos disponíveis na sua biblioteca para esse pack:');
  });

  await t.test('6. assistantChat executa create_pack de verdade e grava rascunho', async () => {
    let savedContent = null;
    let remoteOpsCalled = false;

    const initialContent = {
      library: [
        { id: 'm1', name: 'Luz & Silhueta', url: '/images/nua/gallery/gallery-1.png', isVideo: false },
        { id: 'm2', name: 'Sombras Íntimas', url: '/images/nua/gallery/gallery-2.png', isVideo: false },
      ],
      avulsos: { items: [] },
    };

    let generateTurn = 0;
    const store = {};
    const services = {
      read: async (k) => store[k] || null,
      write: async (k, v) => {
        store[k] = v;
        if (k === 'nua_ai_admin_draft_v2') savedContent = v;
        return true;
      },
      api: async (path, options) => {
        if (path === '/api/admin/content-ops') {
          remoteOpsCalled = true;
          return { ok: true, data: { success: true, version: 2, updatedAt: new Date().toISOString() } };
        }
        return { ok: true, data: {} };
      },
      generate: async () => {
        generateTurn += 1;
        if (generateTurn === 1) {
          // No primeiro passo, Gemini invoca a ferramenta create_pack
          return {
            call: {
              name: 'create_pack',
              args: {
                title: 'Luz & Silhueta',
                description: 'Ensaio fotográfico autoral completo',
                price: '67.00',
                mediaNames: ['Luz & Silhueta', 'Sombras Íntimas'],
              },
            },
          };
        }
        // No segundo passo, após a ferramenta ter sido executada, o modelo gera a confirmação real
        return {
          text: 'Prontinho, Nua! Criei o pack **Luz & Silhueta** em rascunho por R$ 67,00 com as 2 fotos selecionadas.',
        };
      },
    };

    const result = await assistantChat(
      {
        message: 'cria o pack Luz & Silhueta por 67 reais',
        actorRole: 'client',
        conversationId: 'conv_real_test',
        content: initialContent,
      },
      services
    );

    assert.equal(result.ok, true);
    assert.ok(result.actionExecuted, 'Deve retornar actionExecuted');
    assert.equal(result.actionExecuted.type, 'replace_draft');
    assert.equal(remoteOpsCalled, true, 'Deve ter chamado /api/admin/content-ops');
    assert.equal(result.actionExecuted.data.content.avulsos.items.length, 1);
    assert.equal(result.actionExecuted.data.content.avulsos.items[0].title, 'Luz & Silhueta');
    assert.equal(result.actionExecuted.data.content.avulsos.items[0].modality, 'pack');
  });

  await t.test('7. Roteamento P0 cobre vendas, agenda, publicação, mídias anexadas e não bloqueia ajuda explicativa', async () => {
    const fin = classifyNayTurn('quanto eu faturei esse mês?', {}, null, []);
    assert.equal(fin.tier, 'TIER_2_OPS');
    assert.equal(fin.scope, 'orders_finance');

    const agenda = classifyNayTurn('quais chamadas eu tenho amanhã?', {}, null, []);
    assert.equal(agenda.tier, 'TIER_2_OPS');
    assert.equal(agenda.scope, 'appointments');

    const pub = classifyNayTurn('publica o site agora', {}, null, []);
    assert.equal(pub.tier, 'TIER_2_OPS');
    assert.equal(pub.scope, 'site_content');

    const attached = classifyNayTurn(
      'cria um pack com essas fotos',
      { uiContext: { attachedMediaUrls: ['https://example.com/1.jpg'] } },
      null,
      []
    );
    assert.equal(attached.tier, 'TIER_3_VISION');
    assert.equal(attached.scope, 'media_with_ops');
    const attachedTools = toolDeclarations('client', attached.scope).map((d) => d.name);
    assert.ok(attachedTools.includes('create_pack'), 'media_with_ops deve incluir create_pack');
    assert.ok(attachedTools.includes('add_gallery_photo'), 'media_with_ops deve incluir add_gallery_photo');

    // TIER_1_HELP explicativo com palavras como "salvo" ou "publicado" não pode ser apagado pela trava
    const helpRes = await assistantChat(
      {
        message: 'como funciona o rascunho no painel?',
        actorRole: 'client',
        conversationId: 'conv_help_test',
        content: { library: [], avulsos: { items: [] } },
      },
      {
        read: async () => null,
        write: async () => true,
        generate: async () => ({
          text: 'Quando você edita um texto, ele fica salvo no rascunho até ser publicado no site.',
          calls: [],
        }),
      }
    );
    assert.equal(helpRes.ok, true);
    assert.ok(
      helpRes.reply.includes('fica salvo no rascunho'),
      'Resposta explicativa de ajuda não deve ser interceptada pela trava anti-alucinação'
    );
  });

  await t.test('8. Bug do print: resumo de vendas + personalizados + chamadas com "Prontinho" funciona e deduplica PIX/espelhos', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    let capturedTools = [];
    let turn = 0;

    const services = {
      read: async () => null,
      write: async () => true,
      db: {
        select: async (table, params) => {
          assert.equal(table, 'orders');
          assert.equal(String(params?.select || '').includes('metadata'), false, 'Nunca selecionar coluna metadata inexistente');
          return [
            { id: 'ord_pack_1', pack_id: 'pack-ouro', status: 'paid', amount: 67, customer_name: 'Ana', created_at: `${today}T10:00:00Z` },
            { id: 'ord_pix_pendente', pack_id: 'pack-ouro', status: 'pending', amount: 67, customer_name: 'Bruno', created_at: `${today}T11:00:00Z` },
            { id: 'app_espelho_1', pack_id: 'chamada-30m', status: 'paid', amount: 250, customer_name: 'Carlos', created_at: `${today}T12:00:00Z` },
            { id: 'ped_espelho_1', pack_id: 'personalizado_1', status: 'paid', amount: 180, customer_name: 'Diego', created_at: `${today}T13:00:00Z` },
          ];
        },
      },
      api: async (path) => {
        if (path === '/api/personalizados/admin') {
          return {
            ok: true,
            data: {
              orders: [
                { id: 'pers_1', clientName: 'Diego', status: 'em_producao', totalPrice: 180, photoCount: 5, videoDurationMinutes: 2, express24h: true, createdAt: `${today}T13:00:00Z` },
                { id: 'pers_2', clientName: 'Edu', status: 'aguardando_pagamento', totalPrice: 90, createdAt: `${today}T14:00:00Z` },
              ],
            },
          };
        }
        if (path === '/api/appointments/admin') {
          return {
            ok: true,
            data: {
              bookings: [
                { id: 'app_1', clientName: 'Carlos', status: 'confirmada', date: today, startTime: '20:00', modalityName: 'Chamada 30min', price: 250, payment: { status: 'approved' }, createdAt: `${today}T12:00:00Z` },
              ],
            },
          };
        }
        return { ok: true, data: {} };
      },
      generate: async ({ tools, contents }) => {
        turn += 1;
        if (turn === 1) {
          capturedTools = (tools || []).map((d) => d.name);
          return { call: { name: 'get_business_summary', args: { period: 'month' } } };
        }
        // Verifica que o functionResponse trouxe exatamente R$ 497,00 (67 + 180 + 250), sem duplicar e sem contar pendentes
        const toolResp = contents[contents.length - 1]?.parts?.[0]?.functionResponse?.response;
        assert.equal(toolResp?.ok, true);
        assert.equal(toolResp?.data?.revenue?.total, 'R$ 497,00');
        assert.equal(toolResp?.data?.personalizadosParaEntregar?.length, 1);
        assert.equal(toolResp?.data?.proximasChamadas?.length, 1);
        return {
          text: 'Prontinho, Nua! Aqui está o resumo do seu mês: **R$ 497,00** confirmados, 1 personalizado em produção e 1 chamada confirmada hoje às 20:00.',
        };
      },
    };

    const res = await assistantChat(
      {
        message: 'Oi, Nay! Me faz um resumo das minhas vendas, personalizados pendentes e próximas chamadas.',
        actorRole: 'client',
        conversationId: 'conv_summary_bug_print',
        content: { library: [], avulsos: { items: [{ id: 'pack-ouro', title: 'Pack Ouro' }] } },
      },
      services
    );

    assert.equal(res.ok, true);
    assert.ok(capturedTools.includes('get_business_summary'), 'Turno operacional deve expor get_business_summary');
    assert.ok(capturedTools.includes('list_appointments'), 'Turno composto deve expor list_appointments');
    assert.ok(res.reply.includes('Prontinho, Nua!'), 'Saudação "Prontinho" em leitura não pode ser apagada');
    assert.ok(res.reply.includes('R$ 497,00'), 'Resumo real deve ser preservado integralmente');
  });

  await t.test('9. Perguntas abertas, visão real com inlineData, vipClub booleano, permissões client e refresh_panel', async () => {
    // Pergunta aberta não fica cega em TIER_1_CHAT; saudação pura sim
    const openQ = classifyNayTurn('como estão as coisas hoje?', {}, null, []);
    assert.equal(openQ.tier, 'TIER_2_OPS');
    assert.equal(openQ.scope, 'dashboard_ops');

    const hi = classifyNayTurn('oi, bom dia!', {}, null, []);
    assert.equal(hi.tier, 'TIER_1_CHAT');
    assert.equal(hi.scope, 'none');

    // Permissões client atualizadas
    const clientTools = toolDeclarations('client', 'dashboard_ops').map((d) => d.name);
    for (const expected of ['get_business_summary', 'list_music', 'update_music_config', 'update_personalizado_notes', 'delete_media']) {
      assert.ok(clientTools.includes(expected), `client deve ter acesso a ${expected}`);
    }

    // vipClub.active preserva boolean
    const vipRes = await executeTool(
      'edit_text',
      { section: 'vipClub', fields: { active: false } },
      { role: 'client', content: { vipClub: { active: true } }, services: {} }
    );
    assert.equal(vipRes.ok, true);
    assert.strictEqual(vipRes.content.vipClub.active, false);

    // Visão real envia inlineData para o Gemini
    let receivedInlineData = null;
    const visionRes = await assistantChat(
      {
        message: 'essa foto fica boa na capa?',
        actorRole: 'client',
        conversationId: 'conv_vision_test',
        content: { library: [], avulsos: { items: [] } },
        uiContext: {
          attachedMediaItems: [{ id: 'm1', url: 'https://cdn.example.com/foto.jpg', name: 'foto.jpg', isVideo: false }],
        },
      },
      {
        read: async () => null,
        write: async () => true,
        fetchMedia: async () => ({ mimeType: 'image/jpeg', data: 'ZmFrZV9qcGVn' }),
        generate: async ({ contents }) => {
          const lastParts = contents[contents.length - 1]?.parts || [];
          receivedInlineData = lastParts.find((p) => p.inlineData)?.inlineData || null;
          return { text: 'Fica ótima! A iluminação valoriza bem a capa.', calls: [] };
        },
      }
    );
    assert.equal(visionRes.ok, true);
    assert.deepEqual(receivedInlineData, { mimeType: 'image/jpeg', data: 'ZmFrZV9qcGVn' });

    // Mutação fora do content (personalizados) devolve actionExecuted refresh_panel
    let persTurn = 0;
    const refreshRes = await assistantChat(
      {
        message: 'marca o personalizado pers_1 como pronto',
        actorRole: 'client',
        conversationId: 'conv_refresh_test',
        content: { library: [], avulsos: { items: [] } },
      },
      {
        read: async () => null,
        write: async () => true,
        api: async () => ({ ok: true, data: { order: { id: 'pers_1', clientName: 'Diego', status: 'pronto' } } }),
        generate: async () => {
          persTurn += 1;
          if (persTurn === 1) {
            return { call: { name: 'update_personalizado_status', args: { id: 'pers_1', status: 'pronto' } } };
          }
          return { text: 'Atualizei o pedido do Diego para pronto.' };
        },
      }
    );
    assert.equal(refreshRes.ok, true);
    assert.equal(refreshRes.actionExecuted?.type, 'refresh_panel');
    assert.deepEqual(refreshRes.actionExecuted?.refreshModules, ['personalizados']);
  });

  await t.test('10. Financeiro oficial: get_business_summary espelha /api/admin/finance-dashboard ao centavo e não conta PIX pendente/cancelado como venda', async () => {
    const res = await executeTool(
      'get_business_summary',
      { period: 'month' },
      {
        role: 'client',
        content: { library: [], avulsos: { items: [] } },
        services: {
          api: async (path) => {
            if (path.startsWith('/api/admin/finance-dashboard')) {
              return {
                ok: true,
                data: {
                  success: true,
                  periodLabel: 'Novembro de 2026',
                  balance: { available: 0, pending: 0, currency: 'BRL' },
                  summary: {
                    totalReceived: 0,
                    totalNet: 0,
                    totalFees: 0,
                    totalRefunds: 0,
                    salesCount: 0,
                    pendingCount: 2,
                    failedCount: 3,
                  },
                  modalities: {
                    packs: { gross: 0, net: 0, fees: 0, count: 0 },
                    personalizados: { gross: 0, net: 0, fees: 0, count: 0 },
                    chamadas: { gross: 0, net: 0, fees: 0, count: 0 },
                  },
                  transactions: [],
                },
              };
            }
            if (path === '/api/personalizados/admin') return { ok: true, data: { orders: [] } };
            if (path === '/api/appointments/admin') return { ok: true, data: { bookings: [] } };
            return { ok: true, data: {} };
          },
        },
      }
    );

    assert.equal(res.ok, true);
    assert.equal(res.data.source, 'financeiro_oficial');
    assert.equal(res.data.revenue.total, 'R$ 0,00');
    assert.equal(res.data.revenue.vendasConfirmadas, 0);
    assert.equal(res.data.balance.disponivelParaSaque, 'R$ 0,00');
    assert.equal(res.data.tentativasNaoPagas.pixAguardandoPagamento, 2);
    assert.equal(res.data.tentativasNaoPagas.canceladosOuExpirados, 3);
  });
});
