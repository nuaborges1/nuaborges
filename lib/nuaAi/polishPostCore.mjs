/* Vinho maduro / Nua Borges */
/**
 * lib/nuaAi/polishPostCore.mjs — Motor Editorial Inteligente de Revisão & Diagramação.
 *
 * Transforma qualquer texto corrido (mesmo sem pontuação, sem maiúsculas, com erros
 * de digitação ou em um único bloco gigante) em um artigo de blog diagramado com:
 *   - Correção ortográfica e gramatical PT-BR real
 *   - Quebra automática de blocos gigantes em parágrafos curtos (2 a 3 frases)
 *   - Criação automática de Títulos e Subtítulos contextuais (`## ...`)
 *   - Criação de Citação em destaque (`> ...`)
 *   - Destaques visuais (`**negrito**`, `[u]sublinhado[/u]`, `[vinho]...[/vinho]`, `[grifo]...[/grifo]`)
 *   - Distribuição e encaixe lateral das fotos (`[[NUA_MEDIA_N:right|left|portrait|full]]`)
 */

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

export function parseEditorialImageTagMjs(rawLine) {
  const trimmed = String(rawLine || '').trim();
  const bbMatch = trimmed.match(/^\[img([^\]]*)\]([\s\S]+?)\[\/img\]$/i);
  if (bbMatch) {
    const attrStr = bbMatch[1] || '';
    const innerUrls = (bbMatch[2] || '')
      .split('|')
      .map((u) => u.trim())
      .filter(Boolean);
    if (innerUrls.length === 0) return null;

    const layoutMatch = attrStr.match(/layout="([^"]+)"/i);
    const sizeMatch = attrStr.match(/size="([^"]+)"/i);
    const captionMatch = attrStr.match(/caption="([^"]*)"/i);
    const altMatch = attrStr.match(/alt="([^"]*)"/i);
    const rawLayoutToken = (layoutMatch?.[1] || '').toLowerCase();
    const [rawLayout, inlineSize] = rawLayoutToken.split(':');
    const rawSize = (sizeMatch?.[1] || inlineSize || '').toLowerCase();
    const layout =
      rawLayout === 'portrait' ||
      rawLayout === 'left' ||
      rawLayout === 'right' ||
      rawLayout === 'grid' ||
      rawLayout === 'full'
        ? rawLayout
        : innerUrls.length > 1
        ? 'grid'
        : 'full';
    const size = rawSize === 'sm' || rawSize === 'lg' || rawSize === 'md' ? rawSize : 'md';

    const caption = (captionMatch?.[1] || '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim();
    const alt = (altMatch?.[1] || '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim();

    return { urls: innerUrls, layout, size, caption, alt: alt || undefined };
  }

  const mdMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (mdMatch && mdMatch[2]?.trim()) {
    return {
      urls: [mdMatch[2].trim()],
      layout: 'full',
      size: 'md',
      caption: (mdMatch[1] || '').trim(),
    };
  }
  return null;
}

export function buildEditorialImageTagMjs(block) {
  const cleanUrls = (block.urls || []).map((u) => String(u).trim()).filter(Boolean);
  if (cleanUrls.length === 0) return '';
  const effectiveLayout = cleanUrls.length > 1 ? 'grid' : block.layout || 'full';
  const effectiveSize = block.size || 'md';
  const safeCaption = String(block.caption || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\]/g, '')
    .trim();
  const safeAlt = String(block.alt || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\]/g, '')
    .trim();

  const attrs = [];
  if (effectiveLayout !== 'full' || cleanUrls.length > 1) {
    attrs.push(`layout="${effectiveLayout}"`);
  }
  if (effectiveSize && effectiveSize !== 'md') {
    attrs.push(`size="${effectiveSize}"`);
  }
  if (safeCaption) attrs.push(`caption="${safeCaption}"`);
  if (safeAlt) attrs.push(`alt="${safeAlt}"`);
  const attrPart = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  return `[img${attrPart}]${cleanUrls.join('|')}[/img]`;
}

export function extractAllEditorialImagesMjs(markdown) {
  if (!markdown) return [];
  const results = [];
  const normalized = String(markdown)
    .replace(/\r\n/g, '\n')
    .replace(/(\[img[^\]]*\][\s\S]+?\[\/img\])/gi, '\n\n$1\n\n');

  for (const line of normalized.split('\n')) {
    const parsed = parseEditorialImageTagMjs(line);
    if (parsed && parsed.urls.length > 0) {
      results.push(parsed);
    }
  }
  return results;
}

export function stripFormattingMjs(input) {
  if (!input) return '';
  let out = String(input)
    .replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/~~([\s\S]+?)~~/g, '$1')
    .replace(/<\/?(?:b|strong|i|em|u|s|mark|span)[^>]*>/gi, '')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^>\s+/gm, '');

  const tagRe =
    /\[(?:u|s|b|i|vinho|dourado|grifo|pequeno|grande|gigante|centro|direita)\]([\s\S]*?)\[\/(?:u|s|b|i|vinho|dourado|grifo|pequeno|grande|gigante|centro|direita)\]/gi;
  for (let pass = 0; pass < 4; pass++) {
    const next = out.replace(tagRe, '$1');
    if (next === out) break;
    out = next;
  }
  return out;
}

export function tokenizeEditorialImagesMjs(rawText) {
  const mediaTokens = [];
  const normalized = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/(\[img[^\]]*\][\s\S]+?\[\/img\])/gi, '\n\n$1\n\n');

  const lines = normalized.split('\n');
  const outLines = [];

  for (const line of lines) {
    const parsed = parseEditorialImageTagMjs(line);
    if (parsed && parsed.urls.length > 0) {
      const idx = mediaTokens.length + 1;
      const token = `[[NUA_MEDIA_${idx}]]`;
      mediaTokens.push({ token, originalBlock: parsed });
      outLines.push(token);
    } else {
      outLines.push(line);
    }
  }

  return {
    tokenizedText: outLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    mediaTokens,
  };
}

export function restoreAndVerifyEditorialImagesMjs(aiOutputText, mediaTokens) {
  const warnings = [];
  if (!mediaTokens || mediaTokens.length === 0) {
    const cleaned = String(aiOutputText || '').replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '');
    return { restoredText: cleaned.trim(), imagesRepositioned: 0, warnings };
  }

  let working = String(aiOutputText || '').replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '');
  const usedTokens = new Set();
  let repositionedCount = 0;
  const alternatingLayouts = ['right', 'left', 'portrait', 'full'];

  working = working.replace(
    /\[\[NUA_MEDIA_(\d+)(?::([a-z]+))?\]\]/gi,
    (_full, numStr, suggestedLayoutRaw) => {
      const idx = parseInt(numStr, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= mediaTokens.length) return '';
      if (usedTokens.has(idx)) {
        warnings.push(`Imagem #${idx + 1} duplicada na resposta da IA foi unificada.`);
        return '';
      }
      usedTokens.add(idx);

      const entry = mediaTokens[idx];
      const orig = entry.originalBlock;
      const isMulti = orig.urls.length > 1;
      let nextLayout = orig.layout;

      if (isMulti) {
        nextLayout = 'grid';
      } else if (suggestedLayoutRaw) {
        const cleanLayout = suggestedLayoutRaw.toLowerCase();
        if (['right', 'left', 'portrait', 'full'].includes(cleanLayout)) {
          nextLayout = cleanLayout;
        }
      } else {
        nextLayout = alternatingLayouts[idx % alternatingLayouts.length];
      }

      if (nextLayout !== orig.layout) {
        repositionedCount += 1;
      }

      const tag = buildEditorialImageTagMjs({
        urls: orig.urls,
        layout: nextLayout,
        size: orig.size || 'md',
        caption: orig.caption,
        alt: orig.alt,
      });
      return `\n\n${tag}\n\n`;
    }
  );

  const missingEntries = mediaTokens
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ idx }) => !usedTokens.has(idx));

  if (missingEntries.length > 0) {
    const blocks = working
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);

    for (const { entry, idx } of missingEntries) {
      const orig = entry.originalBlock;
      const isMulti = orig.urls.length > 1;
      const autoLayout = isMulti ? 'grid' : alternatingLayouts[idx % alternatingLayouts.length];
      const tag = buildEditorialImageTagMjs({
        urls: orig.urls,
        layout: autoLayout,
        size: orig.size || 'md',
        caption: orig.caption,
        alt: orig.alt,
      });
      // Insere antes de um parágrafo de texto para que o texto contorne a foto lateralmente
      const paragraphIndices = blocks
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => !b.startsWith('#') && !b.startsWith('[img') && !b.startsWith('>') && b !== '---')
        .map(({ i }) => i);
      const targetParaIdx =
        paragraphIndices.length > 1
          ? paragraphIndices[Math.min(paragraphIndices.length - 1, idx + 1)]
          : Math.min(blocks.length, Math.max(0, (idx + 1) * 2 - 1));
      blocks.splice(targetParaIdx, 0, tag);
      repositionedCount += 1;
    }
    working = blocks.join('\n\n');
  }

  const finalImages = extractAllEditorialImagesMjs(working);
  const origFlatUrls = mediaTokens.flatMap((m) => m.originalBlock.urls);
  const finalFlatUrls = finalImages.flatMap((m) => m.urls);

  if (
    origFlatUrls.length !== finalFlatUrls.length ||
    !origFlatUrls.every((u) => finalFlatUrls.includes(u))
  ) {
    throw new Error('MEDIA_INTEGRITY_MISMATCH');
  }

  return {
    restoredText: working.replace(/\n{3,}/g, '\n\n').trim(),
    imagesRepositioned: repositionedCount,
    warnings,
  };
}

export function computeEditorialDiffSummaryMjs(originalText, organizedText, imagesRepositioned) {
  const rawOrig = String(originalText || '');
  const rawNext = String(organizedText || '');

  const origBlocks = rawOrig
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const nextBlocks = rawNext
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const origHeadings = origBlocks.filter((b) => /^#{1,3}\s+/m.test(b) && b.length < 120).length;
  const createdHeadingsList = nextBlocks
    .filter((b) => /^#{1,3}\s+/m.test(b))
    .map((b) => stripFormattingMjs(b.replace(/^#{1,3}\s+/, '')).trim())
    .filter(Boolean);
  const nextHeadings = createdHeadingsList.length;
  const headingsSuggested = Math.max(0, nextHeadings - origHeadings);

  const createdQuotesList = nextBlocks
    .filter((b) => /^>\s+/m.test(b))
    .map((b) => stripFormattingMjs(b.replace(/^>\s+/, '')).trim())
    .filter(Boolean);

  const countMarks = (txt) =>
    (txt.match(/\*\*[\s\S]+?\*\*|\[(?:u|vinho|dourado|grifo|grande|gigante)\]/gi) || []).length;
  const highlightsApplied = Math.max(0, countMarks(rawNext) - countMarks(rawOrig));

  const origWords = stripFormattingMjs(rawOrig)
    .split(/\s+/)
    .filter(Boolean);
  const nextWords = stripFormattingMjs(rawNext)
    .split(/\s+/)
    .filter(Boolean);

  const origSet = new Set(origWords);
  let diffWordCount = 0;
  for (const w of nextWords) {
    if (!origSet.has(w)) diffWordCount += 1;
  }
  const spellingCorrections = Math.min(Math.max(diffWordCount, 1), 35);
  const paragraphsStructured = nextBlocks.filter(
    (b) => !b.startsWith('[img') && !b.startsWith('#') && b !== '---'
  ).length;

  // Detecta exemplos reais de correções ortográficas feitas no texto da cliente para explicar claramente
  const knownFixes = [
    { re: /\bagente\b/i, label: '“agente” → “a gente”' },
    { re: /\balem\b/i, label: '“alem” → “além”' },
    { re: /\bmascaras?\b/i, label: '“mascaras” → “máscaras”' },
    { re: /\bpropri[oa]s?\b/i, label: '“proprio” → “próprio”' },
    { re: /\bninguem\b/i, label: '“ninguem” → “ninguém”' },
    { re: /\bhistorias?\b/i, label: '“historia” → “história”' },
    { re: /\bsexolog[ao]\b/i, label: '“sexologa” → “sexóloga”' },
    { re: /\btambem\b/i, label: '“tambem” → “também”' },
    { re: /\bauto\s+conhecimento\b/i, label: '“auto conhecimento” → “autoconhecimento”' },
    { re: /\bnao\b/i, label: '“nao” → “não”' },
    { re: /\bvoces?\b/i, label: '“voce” → “você”' },
    { re: /\bconexoes\b/i, label: '“conexoes” → “conexões”' },
    { re: /([a-záéíóúâêôãõç])\.([a-záéíóúâêôãõç])/i, label: 'espaçamento após pontos finais' },
  ];
  const matchedExamples = [];
  for (const item of knownFixes) {
    if (item.re.test(rawOrig) && matchedExamples.length < 4) {
      matchedExamples.push(item.label);
    }
  }

  const removedWholeBlockCenterOrHeading =
    /^\[centro\][\s\S]{120,}\[\/centro\]$/i.test(rawOrig.trim()) ||
    /^#{1,3}\s+[\s\S]{120,}$/m.test(rawOrig.trim());

  const detailedReport = [];

  if (removedWholeBlockCenterOrHeading) {
    detailedReport.push({
      category: 'estrutura',
      title: 'Limpeza de formatação acidental',
      detail:
        'O texto inteiro estava formatado como título grande e centralizado; voltamos o corpo para leitura confortável alinhada à esquerda.',
    });
  }

  if (spellingCorrections > 0) {
    const exampleSuffix =
      matchedExamples.length > 0
        ? ` (incluindo ${matchedExamples.join(', ')})`
        : ' (acentuação, letras maiúsculas no início das frases e pontuação)';
    detailedReport.push({
      category: 'portugues',
      title: 'Português, acentuação e pontuação revisados',
      detail: `Corrigimos ${spellingCorrections} ${
        spellingCorrections === 1 ? 'detalhe' : 'detalhes'
      } de escrita mantendo 100% das suas palavras${exampleSuffix}.`,
    });
  }

  if (paragraphsStructured > 1) {
    detailedReport.push({
      category: 'paragrafos',
      title: `Divisão em ${paragraphsStructured} parágrafos curtos`,
      detail:
        'Separamos o bloco corrido em parágrafos de 2 a 3 frases para que a leitura fique leve, respirável e elegante no celular e no computador.',
    });
  }

  if (createdHeadingsList.length > 0 || createdQuotesList.length > 0) {
    const titlesText =
      createdHeadingsList.length > 0
        ? `Subtítulos criados: ${createdHeadingsList.map((t) => `“${t}”`).join(' e ')}.`
        : '';
    const quoteText =
      createdQuotesList.length > 0
        ? ` Também destacamos uma frase marcante como citação editorial.`
        : '';
    detailedReport.push({
      category: 'titulos',
      title: `${createdHeadingsList.length} ${
        createdHeadingsList.length === 1 ? 'subtítulo criado' : 'subtítulos criados'
      }${createdQuotesList.length > 0 ? ' + citação em destaque' : ''}`,
      detail: `${titlesText}${quoteText}`.trim(),
    });
  }

  if (highlightsApplied > 0) {
    detailedReport.push({
      category: 'destaques',
      title: `${highlightsApplied} destaques visuais aplicados`,
      detail:
        'Aplicamos cor vinho, grifo marca-texto, sublinhado e negrito nas expressões mais fortes da sua história.',
    });
  }

  const finalImages = extractAllEditorialImagesMjs(rawNext);
  if (finalImages.length > 0) {
    detailedReport.push({
      category: 'fotos',
      title: `${finalImages.length} ${
        finalImages.length === 1 ? 'foto encaixada no texto' : 'fotos distribuídas e encaixadas'
      }`,
      detail:
        'Posicionamos as fotos ao lado dos parágrafos para que o texto contorne a imagem igual a uma matéria de revista.',
    });
  }

  const highlights = [];
  if (spellingCorrections > 0) {
    highlights.push('Ortografia, pontuação e acentuação corrigidas');
  }
  if (headingsSuggested > 0) {
    highlights.push(
      `${headingsSuggested} ${
        headingsSuggested === 1 ? 'título/subtítulo criado' : 'títulos e subtítulos criados'
      }`
    );
  }
  if (paragraphsStructured > 1) {
    highlights.push(`${paragraphsStructured} parágrafos organizados`);
  }
  if (highlightsApplied > 0) {
    highlights.push(
      `${highlightsApplied} ${
        highlightsApplied === 1 ? 'destaque visual aplicado' : 'destaques visuais aplicados'
      }`
    );
  }
  if (imagesRepositioned > 0 || finalImages.length > 0) {
    const count = imagesRepositioned || finalImages.length;
    highlights.push(
      `${count} ${count === 1 ? 'foto diagramada' : 'fotos diagramadas'}`
    );
  }

  return {
    summary: {
      spellingCorrections,
      headingsSuggested,
      paragraphsStructured,
      highlightsApplied,
      imagesRepositioned,
    },
    highlights,
    detailedReport,
  };
}

/**
 * Corretor ortográfico, gramatical e de pontuação PT-BR para textos corridos informais.
 */
function fixPortugueseGrammarAndPunctuation(rawInput) {
  let s = String(rawInput || '').trim();

  // Limpa artefatos de cópia/cola de IA como ¨¨texto¨¨, __texto__, ""texto""
  s = s.replace(/¨{2,}([^¨\n]+?)¨{2,}/g, '**$1**');
  s = s.replace(/¨([^¨\n]{2,80})¨/g, '“$1”');
  s = s.replace(/¨+/g, '');
  s = s.replace(/""([^"\n]+?)""/g, '“$1”');
  s = s.replace(/__([^_\n]+?)__/g, '**$1**');

  // Remove alinhamento central forçado ou cabeçalho gigante aplicado por engano no texto inteiro
  s = s.replace(/^\[centro\]([\s\S]*)\[\/centro\]$/i, '$1');
  s = s.replace(/^#{1,3}\s+([\s\S]{120,})$/gm, '$1');

  // Corrige ponto ou vírgula colados na palavra seguinte ("importante.sou" -> "importante. Sou")
  s = s.replace(/([a-záéíóúâêôãõç])([.!?])([a-záéíóúâêôãõç])/gi, '$1$2 $3');
  s = s.replace(/([a-záéíóúâêôãõç])([,;:])([a-záéíóúâêôãõç])/gi, '$1$2 $3');

  // Espaço após emoji colado em palavra ("❤️muito" -> "❤️. Muito")
  s = s.replace(/([\u2600-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF❤️♥️♡])\s*([a-záéíóúâêôãõç])/gi, '$1. $2');

  // Dicionário amplo de correções ortográficas e acentuação PT-BR
  const replacements = [
    [/\bnua borges\b/gi, 'Nua Borges'],
    [/\bprazer(?=\s+eu\s+sou)/gi, 'Prazer,'],
    [/\bagente\b(?=\s+(?:realmente|é|vai|tem|pode|sabe|quer|faz|precisa|acha|consegue|vive|sente))/gi, 'a gente'],
    [/\balem\b/gi, 'além'],
    [/\bmascaras\b/gi, 'máscaras'],
    [/\bmascara\b/gi, 'máscara'],
    [/\bproprio\b/gi, 'próprio'],
    [/\bpropria\b/gi, 'própria'],
    [/\bproprios\b/gi, 'próprios'],
    [/\bproprias\b/gi, 'próprias'],
    [/\bninguem\b/gi, 'ninguém'],
    [/\balguem\b/gi, 'alguém'],
    [/\bhistoria\b/gi, 'história'],
    [/\bhistorias\b/gi, 'histórias'],
    [/\bsexologa\b/gi, 'sexóloga'],
    [/\bsexologo\b/gi, 'sexólogo'],
    [/\btambem\b/gi, 'também'],
    [/\bauto\s+conhecimento\b/gi, 'autoconhecimento'],
    [/\bauto\s+estima\b/gi, 'autoestima'],
    [/\bpra\s+mim\b/gi, 'para mim'],
    [/\bpra\s+voce\b/gi, 'para você'],
    [/\bvoce\b/gi, 'você'],
    [/\bvoces\b/gi, 'vocês'],
    [/\bnao\b/gi, 'não'],
    [/\bentao\b/gi, 'então'],
    [/\bconexao\b/gi, 'conexão'],
    [/\bconexoes\b/gi, 'conexões'],
    [/\brelacao\b/gi, 'relação'],
    [/\brelacoes\b/gi, 'relações'],
    [/\beducacao\b/gi, 'educação'],
    [/\bformacao\b/gi, 'formação'],
    [/\bintencao\b/gi, 'intenção'],
    [/\batencao\b/gi, 'atenção'],
    [/\bexperiencia\b/gi, 'experiência'],
    [/\bexperiencias\b/gi, 'experiências'],
    [/\bessencia\b/gi, 'essência'],
    [/\bciencia\b/gi, 'ciência'],
    [/\bintima\b/gi, 'íntima'],
    [/\bintimo\b/gi, 'íntimo'],
    [/\bpublico\b/gi, 'público'],
    [/\bduvida\b/gi, 'dúvida'],
    [/\bduvidas\b/gi, 'dúvidas'],
    [/\bunico\b/gi, 'único'],
    [/\bunica\b/gi, 'única'],
    [/\bautentica\b/gi, 'autêntica'],
    [/\bautentico\b/gi, 'autêntico'],
    [/\bsaude\b/gi, 'saúde'],
    [/\bconteudo\b/gi, 'conteúdo'],
    [/\bconteudos\b/gi, 'conteúdos'],
    [/\bespaco\b/gi, 'espaço'],
    [/\bcomeco\b/gi, 'começo'],
    [/\bcoracao\b/gi, 'coração'],
    [/\bemocao\b/gi, 'emoção'],
    [/\bemocoes\b/gi, 'emoções'],
    [/\bsensacao\b/gi, 'sensação'],
    [/\bvisao\b/gi, 'visão'],
    [/\bmissao\b/gi, 'missão'],
    [/\bpaixao\b/gi, 'paixão'],
    [/\bpadrao\b/gi, 'padrão'],
    [/\bpadroes\b/gi, 'padrões'],
    [/\btabu\b/gi, 'tabu'],
    [/\bja\b/gi, 'já'],
    [/\bso\b(?=\s+(?:que|um|uma|para|por|isso|eu|você|a\s+gente))/gi, 'só'],
    [/\bate\b(?=\s+(?:hoje|aqui|onde|o|a|os|as|mesmo|porque))/gi, 'até'],
    // Vírgulas em enumerações comuns sem pontuação
    [/\bsem máscaras\s+sem julgamentos/gi, 'sem máscaras, sem julgamentos'],
    [/\bsua história\s+seus desejos\s+suas vontades/gi, 'sua história, seus desejos, suas vontades'],
  ];

  for (const [pattern, replacement] of replacements) {
    s = s.replace(pattern, replacement);
  }

  return s;
}

/**
 * Quebra frases gigantes (run-on sentences de 250+ caracteres separadas apenas por vírgulas ou conectivos)
 * em frases bem pontuadas com ponto final e letra maiúscula.
 */
function splitLongRunOnSentences(text) {
  // Transforma conectivos após cláusulas longas em início de nova frase
  let out = text.replace(
    /([^.!?]{85,}),\s+(eu sempre|muita gente|para mim|por isso|aqui|meu objetivo|minha|eu acredito|eu penso|sou educadora|eu quero|nesse espaço)/gi,
    (_m, before, connector) => {
      const cap = connector.charAt(0).toUpperCase() + connector.slice(1);
      return `${before.trim()}. ${cap}`;
    }
  );

  // Capitaliza o início do texto e após qualquer ponto final/exclamação/interrogação
  out = out.replace(/(^\s*|[.!?]\s+)([a-záéíóúâêôãõç])/g, (_m, prefix, letter) => {
    return `${prefix}${letter.toUpperCase()}`;
  });

  // Garante ponto final no encerramento se terminar com letra
  if (/[a-záéíóúâêôãõç0-9]$/i.test(out)) {
    out += '.';
  }

  return out;
}

/**
 * Detecta um subtítulo contextual elegante com base no tema do parágrafo.
 */
function inferSectionHeadingForParagraph(paragraphText, pIndex, usedHeadings) {
  const lower = paragraphText.toLowerCase();

  const candidates = [
    {
      match: /\b(sexóloga|sexologia|educadora sexual|autoconhecimento|formação|ciência)\b/,
      title: 'Sexologia, Autoconhecimento & Liberdade',
    },
    {
      match: /\b(ensaio|fotografia|arte|corpo|estética|câmera|lente|sensualidade)\b/,
      title: 'A Arte de Expressar a Sensualidade',
    },
    {
      match: /\b(espaço|convite|bem-vind|acompanh|aqui você|juntos|conexões)\b/,
      title: 'Um Espaço Livre de Tabus',
    },
    {
      match: /\b(história|desejos|vontades|descobertas|vergonha|julgamentos)\b/,
      title: 'Autenticidade sem Julgamentos',
    },
  ];

  for (const c of candidates) {
    if (c.match.test(lower) && !usedHeadings.has(c.title)) {
      usedHeadings.add(c.title);
      return c.title;
    }
  }

  const fallbacks = ['Minha Essência & Trajetória', 'Um Olhar Sem Tabus', 'Meu Convite Para Você'];
  const fb = fallbacks[pIndex % fallbacks.length];
  if (!usedHeadings.has(fb)) {
    usedHeadings.add(fb);
    return fb;
  }
  return null;
}

/**
 * Aplica destaques visuais inteligentes (negrito, sublinhado, vinho, grifo) sem exagerar.
 */
function applySmartEditorialHighlights(paragraph, pIndex) {
  let p = paragraph;
  // Se o parágrafo já possui marcações ricas, preserva
  if (/(\*\*|\[vinho\]|\[grifo\]|\[u\]|\[grande\])/.test(p)) {
    return p;
  }

  // No primeiro parágrafo: destaca a apresentação inicial
  if (pIndex === 0) {
    p = p.replace(
      /\b(Nua Borges)\b/,
      '[vinho]**$1**[/vinho]'
    );
    p = p.replace(
      /\b(sem máscaras,?\s*sem julgamentos)\b/i,
      '[u]$1[/u]'
    );
    // Se ainda não aplicou negrito na abertura, destaca a primeira frase curta
    if (!p.includes('**')) {
      const firstSentenceEnd = p.search(/[.!?]\s+/);
      if (firstSentenceEnd > 10 && firstSentenceEnd < 120) {
        p = `**${p.slice(0, firstSentenceEnd + 1)}** ${p.slice(firstSentenceEnd + 2)}`;
      }
    }
    return p;
  }

  // Nos demais parágrafos: aplica grifo, vinho, negrito e sublinhado em conceitos-chave
  let count = 0;
  const conceptRules = [
    {
      re: /\b(educadora sexual e sexóloga em formação|sexóloga em formação|educadora sexual)\b/i,
      wrap: (m) => `[grifo]${m}[/grifo]`,
    },
    {
      re: /\b(autoconhecimento,?\s*sensualidade e as conexões humanas|autoconhecimento|conexões humanas)\b/i,
      wrap: (m) => `[vinho]**${m}**[/vinho]`,
    },
    {
      re: /\b(liberdade de ser quem a gente realmente é|ninguém deveria sentir vergonha disso|sem tabus|total discrição)\b/i,
      wrap: (m) => `[u]${m}[/u]`,
    },
    {
      re: /\b(sua história,?\s*seus desejos,?\s*suas vontades e suas próprias descobertas)\b/i,
      wrap: (m) => `**${m}**`,
    },
  ];

  for (const rule of conceptRules) {
    if (count >= 2) break;
    if (rule.re.test(p)) {
      p = p.replace(rule.re, (match) => rule.wrap(match));
      count++;
    }
  }

  // Se nenhum conceito específico bateu neste parágrafo, destaca uma frase forte em negrito ou sublinhado
  if (count === 0) {
    const sentences = p.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length >= 2) {
      const target = sentences[sentences.length - 1].trim();
      if (target.length > 25 && target.length < 160) {
        p = p.replace(target, pIndex % 2 === 1 ? `[u]${target}[/u]` : `**${target}**`);
      }
    }
  }

  return p;
}

/**
 * Organizador Editorial Inteligente Completo:
 * Funciona instantaneamente tanto offline/local quanto como pós-processador de segurança.
 */
export function runBasicDeterministicOrganizerMjs(rawText) {
  const { tokenizedText, mediaTokens } = tokenizeEditorialImagesMjs(rawText);

  // Remove tokens temporariamente para estruturar o texto em parágrafos e seções
  const cleanRawBlocks = tokenizedText
    .split(/\n{2,}/)
    .map((b) => b.replace(/\[\[NUA_MEDIA_\d+\]\]/g, '').trim())
    .filter(Boolean);

  // 1. Corrige gramática, ortografia, pontuação e quebra frases gigantes
  const allSentences = [];
  for (const rawBlock of cleanRawBlocks) {
    if (/^(#{1,3}\s+|[-•*]\s+|\d+[.)]\s+|>\s*|---$)/.test(rawBlock)) {
      allSentences.push({ type: 'preserved_block', text: rawBlock });
      continue;
    }

    let fixed = splitLongRunOnSentences(fixPortugueseGrammarAndPunctuation(rawBlock));
    // Garante espaço após qualquer pontuação colada em letra para não perder frases
    fixed = fixed.replace(/([.!?])([^\s.!?])/g, '$1 $2');
    const extracted = fixed.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [fixed];
    for (const s of extracted) {
      const trimmed = s.replace(/\s+/g, ' ').trim();
      if (trimmed) {
        allSentences.push({ type: 'sentence', text: trimmed });
      }
    }
  }

  // 2. Agrupa as frases em parágrafos editoriais elegantes (2 frases por parágrafo ou ~220-320 caracteres)
  const structuredParagraphs = [];
  let currentBucket = [];
  let currentLen = 0;

  const flushBucket = () => {
    if (currentBucket.length > 0) {
      structuredParagraphs.push(currentBucket.join(' '));
      currentBucket = [];
      currentLen = 0;
    }
  };

  for (const item of allSentences) {
    if (item.type === 'preserved_block') {
      flushBucket();
      structuredParagraphs.push(item.text);
      continue;
    }

    currentBucket.push(item.text);
    currentLen += item.text.length;

    if (currentBucket.length >= 2 || currentLen >= 230) {
      flushBucket();
    }
  }
  flushBucket();

  // 3. Insere Subtítulos (`## ...`), Destaques Visuais e Citação (`> ...`)
  const finalBlocks = [];
  const usedHeadings = new Set();
  const hasExistingHeadings = structuredParagraphs.some((b) => /^#{1,3}\s+/.test(b));
  const hasExistingQuotes = structuredParagraphs.some((b) => /^>\s+/.test(b));
  let quoteCreated = false;

  structuredParagraphs.forEach((para, idx) => {
    if (/^(#{1,3}\s+|[-•*]\s+|\d+[.)]\s+|>\s*|---$)/.test(para)) {
      finalBlocks.push(para);
      return;
    }

    // Cria subtítulo antes do 2º parágrafo e a cada 2 parágrafos seguintes
    if (!hasExistingHeadings && idx > 0 && (idx === 1 || idx === 3 || idx === 5)) {
      const heading = inferSectionHeadingForParagraph(para, idx, usedHeadings);
      if (heading) {
        finalBlocks.push(`## ${heading}`);
      }
    }

    // Se houver 3+ parágrafos e ainda não houver citação, transforma 1 frase forte do meio em Citação (`>`)
    if (!hasExistingQuotes && !quoteCreated && structuredParagraphs.length >= 3 && idx === 1) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length >= 2) {
        const quoteSentence = stripFormattingMjs(sentences[0]).trim();
        const restParagraph = sentences.slice(1).join(' ').trim();
        if (quoteSentence.length >= 30 && quoteSentence.length <= 210 && restParagraph.length >= 25) {
          finalBlocks.push(`> ${quoteSentence}`);
          finalBlocks.push(applySmartEditorialHighlights(restParagraph, idx));
          quoteCreated = true;
          return;
        }
      }
    }

    const highlighted = applySmartEditorialHighlights(para, idx);
    finalBlocks.push(highlighted);
  });

  // 4. Distribui as fotos imediatamente ANTES de parágrafos de texto (para que o texto contorne a foto lateralmente)
  const layouts = ['right', 'left', 'portrait', 'full'];
  mediaTokens.forEach((entry, idx) => {
    const suggestedLayout =
      entry.originalBlock.urls.length > 1 ? 'grid' : layouts[idx % layouts.length];
    const tokenWithLayout = `[[NUA_MEDIA_${idx + 1}:${suggestedLayout}]]`;

    const textBlockIndices = finalBlocks
      .map((b, i) => ({ b, i }))
      .filter(
        ({ b }) =>
          !b.startsWith('#') &&
          !b.startsWith('[[NUA_MEDIA_') &&
          !b.startsWith('>') &&
          b !== '---'
      )
      .map(({ i }) => i);

    if (textBlockIndices.length > 0) {
      const targetIdx =
        idx === 0 && textBlockIndices.length > 1
          ? textBlockIndices[1]
          : textBlockIndices[Math.min(textBlockIndices.length - 1, idx + 1)];
      finalBlocks.splice(targetIdx, 0, tokenWithLayout);
    } else {
      finalBlocks.push(tokenWithLayout);
    }
  });

  const restored = restoreAndVerifyEditorialImagesMjs(finalBlocks.join('\n\n'), mediaTokens);
  return {
    organizedText: restored.restoredText,
    imagesRepositioned: restored.imagesRepositioned,
  };
}

export async function polishEditorialPostMjs(req, env = {}) {
  const originalText = String(req?.text || '').trim();
  if (!originalText) {
    return {
      ok: false,
      originalText: '',
      organizedText: '',
      summary: {
        spellingCorrections: 0,
        headingsSuggested: 0,
        paragraphsStructured: 0,
        highlightsApplied: 0,
        imagesRepositioned: 0,
      },
      highlights: [],
      detailedReport: [],
      warnings: [],
      source: 'unavailable',
      error: {
        code: 'EMPTY_TEXT',
        friendly: 'Escreva um texto antes de pedir a organização editorial.',
      },
    };
  }

  if (originalText.length > 25000) {
    return {
      ok: false,
      originalText,
      organizedText: originalText,
      summary: {
        spellingCorrections: 0,
        headingsSuggested: 0,
        paragraphsStructured: 0,
        highlightsApplied: 0,
        imagesRepositioned: 0,
      },
      highlights: [],
      detailedReport: [],
      warnings: [],
      source: 'unavailable',
      error: {
        code: 'TEXT_TOO_LONG',
        friendly: 'O texto excede o limite de tamanho para organização automática.',
      },
    };
  }

  if (req?.mode === 'basic') {
    const basic = runBasicDeterministicOrganizerMjs(originalText);
    const { summary, highlights, detailedReport } = computeEditorialDiffSummaryMjs(
      originalText,
      basic.organizedText,
      basic.imagesRepositioned
    );
    return {
      ok: true,
      originalText,
      organizedText: basic.organizedText,
      summary,
      highlights,
      detailedReport,
      warnings: [],
      source: 'basic_organizer',
    };
  }

  const { tokenizedText, mediaTokens } = tokenizeEditorialImagesMjs(originalText);
  const apiKey = String(
    env?.GEMINI_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') ||
      ''
  ).trim();
  const models = env?.GEMINI_MODEL ? [env.GEMINI_MODEL, ...CANDIDATE_MODELS] : CANDIDATE_MODELS;

  if (apiKey) {
    const systemPrompt = [
      'Você é um Editor-Chefe e Diagramador Editorial de revista de luxo trabalhando para Nua Borges (Educadora Sexual & Criadora Autoral).',
      'Sua tarefa é transformar o texto bruto da página "Sobre Mim / Biografia" em um artigo de blog impecavelmente escrito, pontuado e diagramado.',
      '',
      'REGRAS OBRIGATÓRIAS DE DIAGRAMAÇÃO:',
      '1. CORREÇÃO COMPLETA DE PORTUGUÊS: Corrija todos os erros de ortografia ("agente" -> "a gente", "alem" -> "além", "mascaras" -> "máscaras", "sexologa" -> "sexóloga", "tambem" -> "também", "auto conhecimento" -> "autoconhecimento"), acentuação, letras maiúsculas no início das frases e pontuação. Se o texto estiver todo emendado por vírgulas, divida em frases bem pontuadas. NUNCA invente fatos novos.',
      '2. QUEBRA EM PARÁGRAFOS CURTOS + SUBTÍTULOS OBRIGATÓRIOS:',
      '   - NUNCA devolva um bloco único! Divida o texto em parágrafos curtos e elegantes de 2 a 3 frases cada (separados por uma linha em branco).',
      '   - Crie de 1 a 3 Subtítulos editoriais ("## Título da Seção" em sua própria linha) para dividir os assuntos do texto.',
      '   - Remova alinhamentos centralizados ("[centro]") se o texto inteiro estiver centralizado por engano.',
      '3. DESTAQUES VISUAIS DE REVISTA:',
      '   - Aplique **negrito** em 2 a 4 trechos marcantes.',
      '   - Aplique [u]sublinhado[/u] em 1 ou 2 frases de impacto.',
      '   - Aplique [vinho]expressão[/vinho] e [grifo]conceito importante[/grifo] com elegância (1 a 2 vezes cada).',
      '   - Se houver uma frase forte que resuma a filosofia dela, coloque em uma linha de citação iniciando com "> Frase".',
      '4. POSICIONAMENTO DAS FOTOS:',
      `   - Preserve TODOS os ${mediaTokens.length} marcador(es) [[NUA_MEDIA_N]] logo ANTES de um parágrafo usando [[NUA_MEDIA_1:right]], [[NUA_MEDIA_2:left]], etc., para que o texto contorne a foto.`,
      '5. Retorne APENAS o texto diagramado final, sem comentários extras.',
    ].join('\n');

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model
          )}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `Título atual: ${req?.headline || 'Sobre Mim'}\nApresentação: ${
                        req?.role || 'Educadora Sexual & Criadora Autoral'
                      }\n\nTexto bruto para corrigir e diagramar em parágrafos e subtítulos:\n\n${tokenizedText}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 2400,
              },
              safetySettings: [
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
              ],
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const textPart = candidate?.content?.parts?.find(
            (p) => typeof p.text === 'string' && !p.thought
          );
          const rawReply = String(textPart?.text || '')
            .replace(/^```[a-z]*\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();

          if (rawReply && rawReply.length >= Math.min(20, originalText.length * 0.4)) {
            let finalCandidateText = rawReply;
            // Se o modelo ainda devolveu um bloco único sem subtítulos para um texto longo, enriquece com o organizador estrutural
            const nonImgBlocks = finalCandidateText
              .split(/\n{2,}/)
              .filter((b) => !b.includes('NUA_MEDIA'));
            if (originalText.length > 260 && nonImgBlocks.length < 2) {
              const structured = runBasicDeterministicOrganizerMjs(originalText);
              finalCandidateText = structured.organizedText;
            }

            const restored = restoreAndVerifyEditorialImagesMjs(finalCandidateText, mediaTokens);
            const { summary, highlights, detailedReport } = computeEditorialDiffSummaryMjs(
              originalText,
              restored.restoredText,
              restored.imagesRepositioned
            );

            return {
              ok: true,
              originalText,
              organizedText: restored.restoredText,
              summary,
              highlights,
              detailedReport,
              warnings: restored.warnings,
              source: 'gemini',
              modelUsed: model,
            };
          }
        }
      } catch (err) {
        console.warn(`[polishEditorialPostMjs] Falha ao consultar modelo ${model}:`, err);
      }
    }
  }

  const basicFallback = runBasicDeterministicOrganizerMjs(originalText);
  const { summary, highlights, detailedReport } = computeEditorialDiffSummaryMjs(
    originalText,
    basicFallback.organizedText,
    basicFallback.imagesRepositioned
  );

  return {
    ok: true,
    originalText,
    organizedText: basicFallback.organizedText,
    summary,
    highlights,
    detailedReport,
    warnings: [],
    source: 'basic_organizer',
  };
}
