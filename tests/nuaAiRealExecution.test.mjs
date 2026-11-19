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
});
