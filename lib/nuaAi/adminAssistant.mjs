/**
 * NUA IA — Orquestrador único do assistente administrativo.
 *
 * Arquitetura:
 *   cliente (rascunho completo, com biblioteca)
 *     → assistantChat
 *       → loop de até MAX_TOOL_CALLS_PER_TURN ferramentas reais
 *         → executeTool (toolRegistry.mjs)
 *           → validação + execução + verificação
 *       → devolve content COMPLETO (biblioteca preservada) + contrato de erro honesto
 *
 * Regra inegociável: se não foi gravado e verificado, não foi feito.
 */

import { FIELD_MAP, MAX_TOOL_CALLS_PER_TURN, executeTool, toolDeclarations } from './toolRegistry.mjs';
import { getHelpKnowledgeText } from './knowledge/helpSummary.mjs';
import { galleryIndex, heroIndex, buildNavigationMap } from './promptHelpers.mjs';
import {
  OPERATIONAL_SAFETY_PROMPT_RULES,
  isMassDestructionIntent,
  getProtectiveRefusalResponse,
  validateToolSafety,
} from './rules/operationalSafety.mjs';

export const DRAFT_KEY = 'nua_ai_admin_draft_v2';
export const MEMORY_KEY = 'nua_ai_memory';
export const AUDIT_KEY = 'nua_ai_audit:index';

export { FIELD_MAP };

const clone = (value) => JSON.parse(JSON.stringify(value));

export async function fingerprint(value) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeRole(role) {
  if (['dev', 'admin', 'client', 'contract_client', 'contract_dev'].includes(role)) return role;
  // Sem papel explícito: em desenvolvimento local (scripts, servidor local) assume admin;
  // em produção (sem `process`) cai para o menor privilégio.
  const isLocalDev =
    typeof process !== 'undefined' && Boolean(process.cwd) && process.env?.NODE_ENV !== 'production';
  return isLocalDev ? 'admin' : 'client';
}

/** Garante a forma mínima do rascunho sem descartar nada que já exista. */
function normalizeDraft(input) {
  const content = clone(input || {});
  content.library = Array.isArray(content.library) ? content.library : [];
  content.albums = Array.isArray(content.albums) ? content.albums : [];
  content.avulsos = content.avulsos || { title: 'Conteúdos e packs', subtitle: '', items: [] };
  if (!Array.isArray(content.avulsos.items)) content.avulsos.items = [];
  content.hero = content.hero || { photos: [] };
  if (!Array.isArray(content.hero.photos)) content.hero.photos = [];
  content.gallery = content.gallery || { eyebrow: '', title: '', subtitle: '', photos: [] };
  if (!Array.isArray(content.gallery.photos)) content.gallery.photos = [];
  return content;
}

function fieldSnapshot(content) {
  return Object.fromEntries(
    Object.entries(FIELD_MAP).map(([path, fields]) => {
      let target = content;
      for (const part of path.split('.')) target = target?.[part];
      return [path, Object.fromEntries(fields.map((key) => [key, target?.[key] ?? '']))];
    })
  );
}

function mediaIndex(content) {
  const library = Array.isArray(content.library) ? content.library : [];
  return {
    total: library.length,
    photos: library.filter((m) => !m.isVideo).length,
    videos: library.filter((m) => m.isVideo).length,
    recent: library.slice(-30).map((m) => ({
      id: m.id,
      name: m.name,
      url: m.url,
      isVideo: Boolean(m.isVideo),
      uploadedAt: m.uploadedAt,
    })),
  };
}

function packsIndex(content) {
  return (content.avulsos?.items || []).slice(-40).map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    active: Boolean(p.active),
    photos: (p.exclusivePhotos || []).length,
    videos: (p.videos || []).length,
  }));
}

function attachedMedia(body) {
  const items = body.uiContext?.attachedMediaItems;
  if (Array.isArray(items) && items.length) {
    return items.map((m) => ({ id: m.id || null, url: m.url, name: m.name || '', isVideo: Boolean(m.isVideo) }));
  }
  const urls = body.uiContext?.attachedMediaUrls;
  return Array.isArray(urls) ? urls.map((url) => ({ id: null, url, name: '', isVideo: false })) : [];
}

function buildSystemPrompt({ content, body, systemState, role, lastContext, draftUpdatedAt }) {
  const galleryItems = galleryIndex(content);
  const heroItems = heroIndex(content);

  const knowledge = {
    role,
    activeTab: body.uiContext?.activeTab || null,
    activeTabLabel: body.uiContext?.activeTabLabel || null,
    navigation: buildNavigationMap(),
    text: fieldSnapshot(content),
    packs: packsIndex(content),
    media: mediaIndex(content),
    albums: (content.albums || []).map((a) => ({ id: a.id, name: a.name, count: (a.mediaIds || []).length })),
    heroSlides: heroItems,
    gallery: galleryItems,
    gallerySummary: {
      total: galleryItems.length,
      active: galleryItems.filter((p) => p.active !== false).length,
      hidden: galleryItems.filter((p) => p.active === false).length,
    },
    attachedMedia: attachedMedia(body),
    lastContext,
    draftUpdatedAt,
    overview: {
      finance: systemState.finance || null,
      orders: (systemState.orders || []).slice(0, 10),
      personalizados: (systemState.personalizados || []).slice(0, 10),
      appointments: (systemState.appointments || []).slice(0, 10),
      requests: (systemState.requests || []).slice(0, 10),
    },
  };

  return `Você é a Nay, confidente executiva e mente dos bastidores oficial da Nua Borges no painel administrativo. Responda em português do Brasil, em Markdown, de forma acolhedora, elegante, madura e ágil. Sem HTML. 

## Sua Identidade & Alma ("Aqui dentro você não precisa performar")
Você é a parceira íntima e o alter-ego de bastidores da Nua Borges. Enquanto ela lida com a arte e o público, você cuida da organização com segurança.
- **Zero Jargões Técnicos:** NUNCA fale palavras como Backblaze, Supabase, Cloudflare, S3, API, SQL, JSON ou nomes de servidores. Fale apenas "seu acervo de fotos", "sua biblioteca de mídias", "seu cofre seguro" e "seu site".
- **Zero Bajulação / Sem Melosidade:** Trate a Nua de igual para igual. Nada de chamá-la de "rainha perfeita" ou elogios falsos e exagerados. Seja madura, sincera e elegante.
- **Emojis com Moderação:** Use no máximo 1 ou 2 emojis sutis por mensagem (ex: ☕, 📸, 🌿 ou ♡ discreto). NUNCA use emojis ou símbolos de faísca/estrelas/sparkles (✨, ✦, ⭐, 🌟).
- **Formatação Editorial:** Use negrito de forma estratégica para destacar nomes de packs, valores, datas e dados essenciais para leitura rápida.
- **A Presença do Philippe nas Regras:** Quando o assunto envolver travas de segurança, aprovação ou proteção contra exclusão, lembre com carinho que o Philippe desenhou cada detalhe e trava de segurança pensando exclusivamente na tranquilidade e proteção dela.
- NUNCA repita ou termine mensagens com slogans ou assinaturas repetitivas como "Deixa de vergonha ♡" — esse slogan é exclusivo dos textos autorais da Nua no site público e NÃO deve ser incluído nas mensagens da assistente de IA.

## Suas Duas Funções Principais
1. **Execução Operacional Precisa:** Quando a usuária pedir para criar, editar, anexar, publicar, consultar, confirmar, agendar, bloquear horários ou organizar a vitrine de ensaios, chame a ferramenta correta e execute. Nunca mande ela fazer na mão quando o sistema tiver ferramenta para isso.
2. **Consultoria e Mentoria do Painel (Ajuda Humanizada):** Quando a usuária tiver qualquer dúvida sobre como funciona uma tela, botão, fluxo de pedidos, entrega no cofre digital, pagamento de parcelas via PIX ou regras de chamadas VIP, consulte o Manual de Ajuda Oficial abaixo e explique passo a passo com simpatia e clareza. Se o assunto envolver algo que você mesma pode fazer, explique como funciona e se ofereça para executar por ela.

## Execução Real de Ações Administrativas (Regra Inegociável)
1. **Diferença Rigorosa entre Planejamento e Execução Real:**
   - Quando a Nua solicitar a criação ou edição de um pack (ex: "cria um pack chamado Luz & Silhueta com fotos X e Y por R$ 67"), você DEVE invocar a ferramenta \`create_pack\`.
   - Se por qualquer motivo você ainda não tiver todas as informações (ex: faltam mídias ou preço), você pode sugerir e perguntar, mas NUNCA afirme que "já montou", "criou", "já está pronto" ou "tudo feito de verdade".
   - Jamais transforme uma intenção de execução em uma afirmação de sucesso sem ter chamado e recebido a confirmação da ferramenta.
   - Ao receber uma confirmação da Nua ("sim", "confirmo", "pode criar", "faz isso"), execute a ferramenta imediatamente no mesmo turno.
   - Após a execução com sucesso, reporte exatamente o que foi salvo: título, valor em reais, quantidade de fotos/vídeos e status (rascunho seguro no painel).

## Miniaturas Visuais Obrigatórias para Mídias (Fotos e Vídeos)
Ao sugerir, selecionar, listar ou montar itens que utilizam fotos ou vídeos da Biblioteca (como novos packs, ensaios da vitrine, fotos da capa ou mídias anexadas):
- Você DEVE SEMPRE renderizar a miniatura visual de cada mídia no corpo da sua resposta usando a sintaxe markdown de imagem:
  \`![Título da Foto](URL_DA_MÍDIA)\`
- Para vídeos, adicione a miniatura indicando com \`![Vídeo: Título](URL_DO_VÍDEO)\`.
- NUNCA liste fotos ou vídeos selecionados apenas com texto puro ou bullet points de nomes. A Nua Borges precisa VER as imagens no chat para avaliar e aprovar!

## Manual de Ajuda Oficial do Painel (Regras do Sistema)
${getHelpKnowledgeText()}

${OPERATIONAL_SAFETY_PROMPT_RULES}

## Como usar as ferramentas principais
- **Vitrine de Ensaios no Site (antiga Galeria) vs Biblioteca de Mídias:**
  - Inspecionar a vitrine de ensaios: use \`get_gallery\` ou confira o bloco \`gallery\` no estado abaixo.
  - Adicionar foto nova à vitrine: use \`add_gallery_photo\` informando a foto da biblioteca, título artístico e legenda.
  - Alterar foto existente: use \`update_gallery_photo\` indicando a posição (1, 2, 3...) ou photoId, com os novos títulos/legendas.
  - Ocultar/ativar ensaio na vitrine: use \`set_gallery_photo_active\`.
  - Reordenar vitrine: use \`reorder_gallery\` com a lista de IDs na ordem desejada.
  - Remover da vitrine: use \`remove_gallery_photo\` (o arquivo original permanece seguro na biblioteca).
- **Histórico Consolidado de Pedidos:**
  - Pesquisa unificada em todas as frentes comerciais (Packs, Personalizados e Chamadas VIP, novos e antigos): use \`search_unified_history\`.
- **Chamadas VIP & Agenda:**
  - Bloquear uma data de viagem/folga: use \`block_appointment_date\` (gera cartão de confirmação).
  - Definir dias e horários de atendimento: use \`set_appointment_hours\` ou \`update_appointment_settings\`.
  - Listar reservas e horários livres: use \`list_appointments\` e \`get_availability\`.
- **Pedidos Personalizados:**
  - Listar encomendas: use \`list_personalizados\`.
  - Alterar status (em_producao, pronto, entregue): use \`update_personalizado_status\`.
  - Anotações administrativas internas: use \`update_personalizado_notes\`.
- **Biblioteca de Mídias (Acervo B2):**
  - Listar fotos/vídeos: use \`list_media\` ou \`resolve_media\`. Fotos anexadas no chat estão em \`attachedMedia\`.

## Estado real do sistema
${JSON.stringify(knowledge)}`;
}

export function classifyNayTurn(message = '', body = {}, lastContext = null, turns = []) {
  const clean = String(message || '').toLowerCase().trim();
  const hasAttachedMedia = Boolean(
    (body.uiContext?.attachedMediaItems && body.uiContext.attachedMediaItems.length > 0) ||
    (body.uiContext?.attachedMediaUrls && body.uiContext.attachedMediaUrls.length > 0)
  );
  if (hasAttachedMedia) {
    return { tier: 'TIER_3_VISION', scope: 'media_library', model: 'gemini-3.5-flash' };
  }

  const hasActionVerb = /\b(fazer|faz|faca|faça|mudar|mude|muda|alterar|altere|altera|trocar|troque|troca|adicionar|adicione|adiciona|incluir|inclua|remover|remova|remove|excluir|exclua|deletar|deleta|colocar|coloque|coloca|criar|crie|cria|publicar|publica|publique|salvar|salva|salve|atualizar|atualize|atualiza|reordenar|reordene|reordena|bloquear|bloqueie|bloqueia|confirmar|confirme|confirma|marcar|marque|marca|responder|responda|enviar|envie|envia|mandar|mande|manda|cadastrar|cadastre|cadastra)\b/i.test(clean);

  // Afirmações, confirmações de continuidade e respostas a perguntas de criação/execução
  const isAffirmation =
    /^(?:sim|s|ok|confirmo|confirmado|claro|com\s+certeza|perfeito|bora|vai|isso|isso\s+mesmo|manda\s+ver|agora\s+sim)(?:[,.!]?\s*(?:pode\s+(?:criar|fazer|montar|salvar|publicar)|faz\s+isso|faz|cria|salva|monta|executa|pode\s+ser)?)?[.!]?$/i.test(
      clean
    ) ||
    /^(?:pode\s+(?:fazer|criar|montar|salvar|publicar)|faz\s+isso|faz|cria|monta|salva)[.!]?$/i.test(
      clean
    ) ||
    /\b(?:pode\s+criar|pode\s+fazer|faz\s+isso|faz\s+de\s+verdade|cria\s+de\s+verdade|agora\s+sim|confirmo|pode\s+montar|pode\s+salvar|faz\s+agora|cria\s+agora)\b/i.test(
      clean
    ) ||
    /\b(?:não\s+foi\s+criado|nada\s+foi\s+criado|não\s+criou|não\s+apareceu|cadê\s+o\s+pack|tenta\s+de\s+novo|faz\s+de\s+novo)\b/i.test(
      clean
    );

  // Se for confirmação ou continuidade, herda o escopo do contexto anterior ou histórico recente
  if (isAffirmation || (clean.length < 25 && hasActionVerb)) {
    if (lastContext?.entityType === 'pack') {
      return { tier: 'TIER_2_OPS', scope: 'packs', model: 'gemini-3.5-flash' };
    }
    if (lastContext?.entityType === 'gallery') {
      return { tier: 'TIER_2_OPS', scope: 'gallery', model: 'gemini-3.5-flash' };
    }

    const recentHistoryText = (turns || body.conversationHistory || [])
      .slice(-4)
      .map((t) => String(t.content || t.text || ''))
      .join(' ')
      .toLowerCase();

    if (/\b(pack|packs|produto|produtos|avulso|avulsos|preço|precos|valor)\b/i.test(recentHistoryText)) {
      return { tier: 'TIER_2_OPS', scope: 'packs', model: 'gemini-3.5-flash' };
    }
    if (/\b(vitrine|galeria|ensaio|ensaios|foto da capa)\b/i.test(recentHistoryText)) {
      return { tier: 'TIER_2_OPS', scope: 'gallery', model: 'gemini-3.5-flash' };
    }
    if (/\b(philippe|dev|desenvolvedor|ticket)\b/i.test(recentHistoryText)) {
      return { tier: 'TIER_2_OPS', scope: 'requests_to_dev', model: 'gemini-3.5-flash' };
    }
    if (/\b(chamada|chamadas|agenda|agendamento|horário|folga|viagem)\b/i.test(recentHistoryText)) {
      return { tier: 'TIER_2_OPS', scope: 'appointments', model: 'gemini-3.5-flash' };
    }

    if (body.uiContext?.activeTab === 'conteudos' || body.uiContext?.activeTab === 'avulsos') {
      return { tier: 'TIER_2_OPS', scope: 'packs', model: 'gemini-3.5-flash' };
    }
    if (body.uiContext?.activeTab === 'galeria' || body.uiContext?.activeTab === 'vitrine') {
      return { tier: 'TIER_2_OPS', scope: 'gallery', model: 'gemini-3.5-flash' };
    }
  }

  // Vitrine / Galeria
  if (/\b(vitrine|galeria|foto da capa|ensaio|ensaios)\b/i.test(clean) && (hasActionVerb || /\b(como tá|como esta|quais fotos|organizar|ordem)\b/i.test(clean))) {
    return { tier: 'TIER_2_OPS', scope: 'gallery', model: 'gemini-3.5-flash' };
  }

  // Packs / Produtos
  if (/\b(pack|packs|produto|produtos|avulso|avulsos|preço|precos|valor)\b/i.test(clean) && (hasActionVerb || isAffirmation || clean.includes('luz & silhueta') || clean.includes('luz e silhueta'))) {
    return { tier: 'TIER_2_OPS', scope: 'packs', model: 'gemini-3.5-flash' };
  }

  // Pedidos ao Philippe / Desenvolvedor
  if (/\b(philippe|desenvolvedor|dev|ticket|pedido de melhoria|ajuste no site)\b/i.test(clean) && (hasActionVerb || clean.includes('avisa') || clean.includes('manda'))) {
    return { tier: 'TIER_2_OPS', scope: 'requests_to_dev', model: 'gemini-3.5-flash' };
  }

  // Agenda / Chamadas VIP
  if (/\b(chamada|chamadas|agenda|agendamento|horário|horario|folga|viagem|bloquear data)\b/i.test(clean) && hasActionVerb) {
    return { tier: 'TIER_2_OPS', scope: 'appointments', model: 'gemini-3.5-flash' };
  }

  // Textos / Capa / Home
  if (/\b(frase|texto|tagline|título|titulo|subtítulo|subtitulo|rodapé|rodape|bio|sobre mim)\b/i.test(clean) && hasActionVerb) {
    return { tier: 'TIER_2_OPS', scope: 'site_content', model: 'gemini-3.5-flash' };
  }

  // Contexto da aba ativa quando a usuária dá um comando direto
  if (hasActionVerb) {
    if (body.uiContext?.activeTab === 'conteudos' || body.uiContext?.activeTab === 'avulsos') {
      return { tier: 'TIER_2_OPS', scope: 'packs', model: 'gemini-3.5-flash' };
    }
    if (body.uiContext?.activeTab === 'galeria' || body.uiContext?.activeTab === 'vitrine') {
      return { tier: 'TIER_2_OPS', scope: 'gallery', model: 'gemini-3.5-flash' };
    }
  }

  // Dúvidas de funcionamento do painel / ajuda
  if (/\b(como funciona|para que serve|onde fica|onde vejo|como faço para|me explica|o que é)\b/i.test(clean)) {
    return { tier: 'TIER_1_HELP', scope: 'help', model: 'gemini-3.5-flash-lite' };
  }

  // Padrão: CHAT / CONVERSA / PRIMEIRO CAFÉ / APRESENTAÇÃO
  return { tier: 'TIER_1_CHAT', scope: 'none', model: 'gemini-3.5-flash-lite' };
}

function buildChatSystemPrompt({ memoryFacts = [] } = {}) {
  const memorySnippet = memoryFacts.length > 0
    ? `\n## Memória e Preferências da Nua:\n${memoryFacts.map((f) => `- ${f}`).join('\n')}\n`
    : '';

  return `Você é a Nay, confidente executiva e mente dos bastidores oficial da Nua Borges no painel administrativo. Responda em português do Brasil, em Markdown, de forma acolhedora, elegante, madura e parceira. Sem HTML.

## Sua Identidade & Alma ("Aqui dentro você não precisa performar")
Você é a mente organizada dos bastidores cuidando de tudo para a Nua brilhar.
- **Zero Jargões Técnicos:** NUNCA fale palavras como Backblaze, Supabase, Cloudflare, S3, API, SQL, JSON ou nomes de servidores. Fale apenas "seu acervo de fotos", "sua biblioteca de mídias", "seu cofre seguro" e "seu site".
- **Zero Bajulação / Sem Melosidade:** Trate a Nua de igual para igual. Nada de chamá-la de "rainha perfeita" ou elogios falsos e exagerados. Seja sincera, leve e elegante.
- **Emojis com Moderação:** Use no máximo 1 ou 2 emojis sutis por mensagem (ex: ☕, 📸, 🌿 ou ♡ discreto). NUNCA use emojis ou símbolos de faísca/estrelas/sparkles (✨, ✦, ⭐, 🌟).
- **A Presença do Philippe:** Lembre com carinho que o Philippe pensou em cada trava e proteção técnica do painel para a tranquilidade e segurança dela.
- NUNCA termine mensagens com slogans ou assinaturas repetitivas como "Deixa de vergonha ♡".
${memorySnippet}
## Contexto da Nua Borges
A Nua Borges está em formação em Sexologia, atuando como educadora sexual e criadora de conteúdo intimista e sensual de alto padrão.`;
}

function buildHelpSystemPrompt() {
  return `${buildChatSystemPrompt()}

## Manual de Ajuda Oficial do Painel (Regras do Sistema)
${getHelpKnowledgeText()}`;
}

function buildContents(history, message) {
  const turns = Array.isArray(history?.turns) && history.turns.length
    ? history.turns
    : [];
  return [
    ...turns
      .filter((t) => ['user', 'assistant'].includes(t.role) && typeof t.content === 'string')
      .slice(-14)
      .map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: String(t.content).slice(0, 6000) }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
}

function toolResponsePayload(outcome) {
  return {
    ok: outcome.ok,
    summary: outcome.summary,
    ...(outcome.data !== undefined ? { data: outcome.data } : {}),
    ...(outcome.proposal ? { proposalPrepared: true, proposalSummary: outcome.proposal.summary } : {}),
    ...(outcome.error ? { error: outcome.error.friendly || outcome.error.code } : {}),
  };
}

async function persistDraft(services, content, published) {
  const record = {
    content,
    updatedAt: new Date().toISOString(),
    revision: crypto.randomUUID(),
    basePublished: published?._updatedAt || null,
  };
  await services.write(DRAFT_KEY, record);
  const verified = await services.read(DRAFT_KEY);
  if (!verified || verified.revision !== record.revision) {
    throw new Error('Não consegui confirmar a gravação do rascunho. Nada foi aplicado no painel.');
  }
  return record;
}

async function writeAudit(services, entry) {
  try {
    const current = (await services.read(AUDIT_KEY)) || [];
    const next = [entry, ...(Array.isArray(current) ? current : [])].slice(0, 200);
    await services.write(AUDIT_KEY, next);
  } catch {
    // Auditoria não pode derrubar a operação.
  }
}

function friendlyError(error) {
  const message = error instanceof Error ? error.message : 'Não foi possível processar a solicitação.';
  if (/quota|429|rate.?limit/i.test(message)) {
    return 'O limite de uso do Gemini foi atingido agora. **Nada foi alterado.** Tente novamente em alguns minutos.';
  }
  if (/GEMINI_API_KEY não está configurada|chave do Gemini não está configurada/i.test(message)) {
    return 'A chave do Gemini não está configurada neste ambiente. Nenhuma alteração foi feita.';
  }
  if (/Nenhum modelo do Gemini/i.test(message)) {
    return 'Nenhum modelo de IA conseguiu responder agora. **Nada foi alterado.** Tente novamente em instantes.';
  }
  return message;
}

export async function assistantChat(body, services) {
  const conversationId = /^[a-zA-Z0-9_-]{1,100}$/.test(body?.conversationId || '')
    ? body.conversationId
    : `conv_${crypto.randomUUID()}`;

  try {
    return await runChat(body, services, conversationId);
  } catch (error) {
    const reply = friendlyError(error);
    return {
      ok: false,
      reply,
      conversationId,
      actionExecuted: null,
      proposal: null,
      proposals: [],
      error: { code: 'CHAT_FAILED', friendly: reply, details: error instanceof Error ? error.message : String(error) },
      sourcesUsed: { memory: false, history: false, knowledge: false },
      modelUsed: null,
      source: 'nua_ai',
    };
  }
}

async function runChat(body, services, conversationId) {
  if (typeof body?.message !== 'string' || !body.message.trim() || body.message.length > 6000) {
    throw new Error('Escreva uma mensagem de até 6.000 caracteres.');
  }

  const role = normalizeRole(body.actorRole);
  const saved = await services.read(DRAFT_KEY);
  const published = (await services.read('private_admin_content')) || (await services.read('published_content'));

  // A BASE DE ESCRITA é o rascunho COMPLETO do cliente — com biblioteca.
  const draftInput = body.draftContent || body.content || body.uiContext?.content || saved?.content || published;
  if (!draftInput) throw new Error('Abra o painel e carregue o conteúdo antes de conversar.');

  const content = normalizeDraft(draftInput);
  const baseFingerprint = await fingerprint(content);

  const historyKey = `nua_ai_conversation:${conversationId}`;
  const history = (await services.read(historyKey)) || { turns: [], summary: '' };

  // Blindagem de Segurança Operacional contra destruição em massa ou comandos de risco
  if (isMassDestructionIntent(body.message)) {
    const protectiveText = getProtectiveRefusalResponse(body.message);
    const updatedTurns = [
      ...(history.turns || []),
      { role: 'user', content: body.message },
      { role: 'assistant', content: protectiveText },
    ];
    await services.write(historyKey, { ...history, turns: updatedTurns }).catch(() => {});
    return {
      reply: protectiveText,
      conversationId,
      actionExecuted: null,
      proposal: null,
      model: 'protective_safety_guard',
    };
  }

  let systemState = {};
  if (typeof services.getSystemOverview === 'function') {
    systemState = await services.getSystemOverview().catch(() => ({}));
  }

  // Memória: decisões explícitas da marca
  if (/(?:a partir de agora|prefiro que|minha prioridade|nova regra|lembre que|decidi que)/i.test(body.message)) {
    const currentMemory = (await services.read(MEMORY_KEY)) || systemState.memory || {};
    const newDecision = { date: new Date().toISOString().split('T')[0], promptRule: body.message.slice(0, 300) };
    const updatedMemory = { ...currentMemory, decisions: [newDecision, ...(currentMemory.decisions || [])].slice(0, 20) };
    await services.write(MEMORY_KEY, updatedMemory).catch(() => {});
    systemState.memory = updatedMemory;
  }

  // Resumo de conversas longas
  let contextSummary = history.summary || '';
  if (history.turns?.length >= 10 && (!contextSummary || history.turns.length % 6 === 0)) {
    const older = history.turns.slice(0, -6);
    contextSummary = `Resumo das mensagens anteriores: ${older
      .map((t) => `${t.role === 'user' ? 'Nua' : 'Nay'}: ${String(t.content).slice(0, 150)}`)
      .join(' | ')
      .slice(0, 1200)}`;
  }

  const lastContext = history.lastContext || body.lastContext || null;

  const ctx = {
    content,
    services,
    role,
    published,
    lastContext,
    attached: attachedMedia(body),
    conversationId,
    activeTab: body.uiContext?.activeTab,
    overview: systemState,
    draftRevision: saved?.revision || null,
    draftUpdatedAt: saved?.updatedAt || null,
  };

  const classification = classifyNayTurn(
    body.message,
    body,
    lastContext,
    history.turns || body.conversationHistory || []
  );

  let system;
  if (classification.tier === 'TIER_1_CHAT') {
    const memoryFacts = Array.isArray(systemState.memory?.facts)
      ? systemState.memory.facts.slice(0, 5)
      : [];
    system = buildChatSystemPrompt({ memoryFacts });
  } else if (classification.tier === 'TIER_1_HELP') {
    system = buildHelpSystemPrompt();
  } else {
    system = buildSystemPrompt({
      content,
      body,
      systemState,
      role,
      lastContext,
      draftUpdatedAt: saved?.updatedAt || null,
    });
  }

  const tools = toolDeclarations(role, classification.scope);
  const contents = buildContents(history, body.message);

  const executed = [];
  const proposals = [];
  let finalText = '';
  let modelUsed = null;
  let contentChanged = false;
  let lastContextUpdate = null;
  let iterations = 0;

  while (iterations < 8) {
    iterations += 1;
    const result = await services.generate({
      system,
      contents,
      tools,
      preferredModel: classification.model,
    });
    modelUsed = result.model || modelUsed;

    const text = String(result.text || '').trim();
    if (text) finalText = text;

    const calls = Array.isArray(result.calls) ? result.calls : result.call ? [result.call] : [];
    if (!calls.length) break;

    if (executed.length >= MAX_TOOL_CALLS_PER_TURN) {
      finalText = finalText || '';
      break;
    }

    const modelParts = [];
    const responseParts = [];

    for (const call of calls) {
      if (executed.length >= MAX_TOOL_CALLS_PER_TURN) break;

      const safety = validateToolSafety(call.name, call.args || {});
      let outcome;
      if (!safety.safe) {
        outcome = {
          ok: false,
          summary: safety.reason || 'Operação bloqueada pelas regras de segurança operacional.',
          data: { blockedBySafetyRule: true },
          durationMs: 0,
        };
      } else {
        outcome = await executeTool(call.name, call.args || {}, ctx);
      }
      executed.push({ name: call.name, args: call.args || {}, ...outcome });

      if (outcome.content) {
        ctx.content = outcome.content;
        contentChanged = true;
      }
      if (outcome.proposal) proposals.push(outcome.proposal);
      if (outcome.lastContext) lastContextUpdate = outcome.lastContext;

      await writeAudit(services, {
        at: new Date().toISOString(),
        actor: role,
        conversationId,
        tool: call.name,
        args: call.args || {},
        ok: outcome.ok,
        summary: outcome.summary,
        target: outcome.lastContext || null,
        durationMs: outcome.durationMs,
      });

      modelParts.push({
        functionCall: {
          name: call.name,
          args: call.args || {},
          ...(call.id ? { id: call.id } : {}),
        },
        // Obrigatório: o Gemini rejeita o turno seguinte sem o signature.
        ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}),
      });
      responseParts.push({
        functionResponse: {
          name: call.name,
          ...(call.id ? { id: call.id } : {}),
          response: toolResponsePayload(outcome),
        },
      });
    }

    // Um único turno do modelo com todas as chamadas + um único turno de respostas.
    if (modelParts.length) {
      contents.push({ role: 'model', parts: modelParts });
      contents.push({ role: 'user', parts: responseParts });
    }
  }

  // Garante uma resposta textual final (o modelo pode ter parado em uma chamada).
  if (!finalText) {
    const closing = await services.generate({
      system,
      contents: [
        ...contents,
        {
          role: 'user',
          parts: [
            {
              text: 'Responda agora à usuária em português, em Markdown, resumindo exatamente o que foi executado (com números reais). Não chame ferramentas.',
            },
          ],
        },
      ],
      tools: undefined,
    });
    finalText = String(closing.text || '').trim();
    modelUsed = closing.model || modelUsed;
  }

  // Persistência + verificação
  let actionExecuted = null;
  if (contentChanged) {
    const record = await persistDraft(services, ctx.content, published);

    // Persiste oficialmente no Supabase via endpoint real do painel (auditoria + published_content).
    let serverVersion = null;
    let serverUpdatedAt = null;
    if (typeof services.api === 'function') {
      try {
        const remote = await services.api('/api/admin/content-ops', {
          method: 'POST',
          body: { content: ctx.content, editorName: 'Nay' },
        });
        if (remote.ok && remote.data?.success === true) {
          serverVersion = remote.data?.version ?? null;
          serverUpdatedAt = remote.data?.updatedAt ?? null;
        } else {
          // Falha na gravação remota: o rascunho local foi mantido, mas não afirmamos sucesso remoto.
          console.warn(
            '[NuaIA] Persistência remota falhou:',
            remote.data?.error || `HTTP ${remote.status}`
          );
        }
      } catch (err) {
        console.warn('[NuaIA] Exceção ao persistir via content-ops:', err instanceof Error ? err.message : String(err));
      }
    }

    actionExecuted = {
      type: 'replace_draft',
      data: {
        content: ctx.content,
        baseFingerprint,
        revision: record.revision,
        serverVersion,
        serverUpdatedAt,
      },
      tools: executed.map((e) => ({ name: e.name, ok: e.ok, summary: e.summary })),
    };
  }

  const failures = executed.filter((e) => !e.ok);
  const successes = executed.filter((e) => e.ok);

  let reply = finalText;
  if (!reply) {
    reply = successes.length
      ? successes.map((e) => e.summary).join('\n')
      : 'Não consegui concluir a solicitação. Nada foi alterado.';
  }

  if (failures.length) {
    const failureText = failures.map((f) => `• ${f.summary}`).join('\n');
    reply = `${reply}\n\n**Não foi possível concluir:**\n${failureText}`.trim();
  }

  // Trava anti-alucinação rigorosa: se nenhuma ferramenta de gravação/criação foi executada com sucesso,
  // a Nay JAMAIS pode afirmar ou sugerir que a operação foi concluída nos bastidores.
  const EXECUTION_CLAIM_REGEX =
    /\b(?:criei|criado|criada|montei|montado|montada|configurei|configurado|configurada|adicionei|adicionado|adicionada|salvei|salvo|salva|prontinho|prontinha|já está pronto|já está pronta|já está montado|já está montada|já está oficial|já está configurado|tudo feito|de verdade nos bastidores|alterei|alterado|alterada|atualizei|atualizado|atualizada|publiquei|publicado|publicada|exclu[ií]|removi|removido|cadastrei|cadastrado|cadastrada)\b/i;

  const hasSuccessfulMutation = executed.some(
    (e) => e.ok && !e.name.startsWith('get_') && !e.name.startsWith('list_') && e.name !== 'resolve_media'
  );

  if (!hasSuccessfulMutation && EXECUTION_CLAIM_REGEX.test(reply)) {
    reply = `Entendi a sua solicitação, Nua! Nos bastidores eu organizei as informações, mas **nenhuma operação foi gravada no painel ainda** porque nenhuma ação de gravação foi executada.\n\nSe você quiser que eu crie ou salve isso de verdade agora, me dá um toque que eu executo no seu acervo!`;
  }

  // Proposta: o cartão aceita uma por vez. As demais ficam registradas.
  const proposal = proposals[0] || null;

  const now = new Date().toISOString();
  const updatedTurns = [
    ...(history.turns || []),
    { role: 'user', content: body.message, timestamp: now, conversation_id: conversationId },
    { role: 'assistant', content: reply, timestamp: now, conversation_id: conversationId },
  ].slice(-100);

  const updated = {
    id: conversationId,
    title: history.title || body.message.slice(0, 80),
    summary: contextSummary,
    updatedAt: now,
    createdAt: history.createdAt || now,
    turns: updatedTurns,
    lastContext: lastContextUpdate || lastContext,
    actions: executed.map((e) => ({ tool: e.name, ok: e.ok, at: now })).slice(-20),
  };

  let historySaved = true;
  try {
    await services.write(historyKey, updated);
  } catch {
    historySaved = false;
  }

  return {
    ok: failures.length === 0,
    reply: reply + (historySaved ? '' : '\n\nNão consegui salvar o histórico desta conversa.'),
    conversationId,
    actionExecuted,
    proposal,
    proposals,
    error: failures.length
      ? {
          code: failures[0].error?.code || 'TOOL_FAILED',
          friendly: failures.map((f) => f.summary).join(' '),
          details: failures.map((f) => f.summary).join(' | '),
        }
      : null,
    tools: executed.map((e) => ({ name: e.name, ok: e.ok, summary: e.summary })),
    lastContext: lastContextUpdate || lastContext,
    sourcesUsed: {
      memory: Boolean(systemState.memory),
      history: (history.turns || []).length > 0,
      knowledge: true,
      media: ctx.content.library.length > 0,
    },
    modelUsed,
    source: executed.length ? 'gemini_function_calling' : 'gemini',
  };
}
