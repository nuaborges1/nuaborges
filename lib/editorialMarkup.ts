/* Vinho maduro / Nua Borges */

export type EditorialImageLayout = 'full' | 'portrait' | 'left' | 'right' | 'grid';
export type EditorialImageSize = 'sm' | 'md' | 'lg';

export interface ParsedEditorialImageBlock {
  urls: string[];
  layout: EditorialImageLayout;
  size?: EditorialImageSize;
  caption: string;
  alt?: string;
}

export function parseEditorialImageTag(rawLine: string): ParsedEditorialImageBlock | null {
  const trimmed = rawLine.trim();

  // Formato [img ...attrs]url1|url2[/img]
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
    const [rawLayoutPart, inlineSizePart] = rawLayoutToken.split(':');
    const rawSize = ((sizeMatch?.[1] || inlineSizePart || '').toLowerCase());

    const layout: EditorialImageLayout =
      rawLayoutPart === 'portrait' ||
      rawLayoutPart === 'left' ||
      rawLayoutPart === 'right' ||
      rawLayoutPart === 'grid' ||
      rawLayoutPart === 'full'
        ? (rawLayoutPart as EditorialImageLayout)
        : innerUrls.length > 1
        ? 'grid'
        : 'full';

    const size: EditorialImageSize =
      rawSize === 'sm' || rawSize === 'lg' || rawSize === 'md'
        ? (rawSize as EditorialImageSize)
        : 'md';

    const caption = (captionMatch?.[1] || '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim();

    const alt = (altMatch?.[1] || '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .trim();

    return {
      urls: innerUrls,
      layout,
      size,
      caption,
      alt: alt || undefined,
    };
  }

  // Formato Markdown ![caption](url)
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

export function buildEditorialImageTag(block: ParsedEditorialImageBlock): string {
  const cleanUrls = block.urls.map((u) => u.trim()).filter(Boolean);
  if (cleanUrls.length === 0) return '';
  const effectiveLayout: EditorialImageLayout =
    cleanUrls.length > 1 ? 'grid' : block.layout || 'full';
  const effectiveSize: EditorialImageSize = block.size || 'md';
  const safeCaption = (block.caption || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\]/g, '')
    .trim();
  const safeAlt = (block.alt || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\]/g, '')
    .trim();

  const attrs: string[] = [];
  if (effectiveLayout !== 'full' || cleanUrls.length > 1) {
    attrs.push(`layout="${effectiveLayout}"`);
  }
  if (effectiveSize && effectiveSize !== 'md') {
    attrs.push(`size="${effectiveSize}"`);
  }
  if (safeCaption) {
    attrs.push(`caption="${safeCaption}"`);
  }
  if (safeAlt) {
    attrs.push(`alt="${safeAlt}"`);
  }
  const attrPart = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
  return `[img${attrPart}]${cleanUrls.join('|')}[/img]`;
}

export function extractAllEditorialImages(markdown: string): ParsedEditorialImageBlock[] {
  if (!markdown) return [];
  const results: ParsedEditorialImageBlock[] = [];
  const normalized = String(markdown)
    .replace(/\r\n/g, '\n')
    .replace(/(\[img[^\]]*\][\s\S]+?\[\/img\])/gi, '\n\n$1\n\n');

  for (const line of normalized.split('\n')) {
    const parsed = parseEditorialImageTag(line);
    if (parsed && parsed.urls.length > 0) {
      results.push(parsed);
    }
  }
  return results;
}

export function stripRichTextFormatting(input: string): string {
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

  // Executa em loop para remover tags aninhadas (ex: [centro][grifo]texto[/grifo][/centro])
  const tagRe =
    /\[(?:u|s|b|i|vinho|dourado|grifo|pequeno|grande|gigante|centro|direita)\]([\s\S]*?)\[\/(?:u|s|b|i|vinho|dourado|grifo|pequeno|grande|gigante|centro|direita)\]/gi;
  for (let pass = 0; pass < 4; pass++) {
    const next = out.replace(tagRe, '$1');
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * Converte texto colado de qualquer fonte (ChatGPT, Gemini, Claude, WhatsApp, Word, Google Docs, Sites)
 * limpando símbolos quebrados de IA (como ¨¨, **, __, ###, * item) e estruturando parágrafos,
 * títulos, subtítulos, listas, citações e negritos automaticamente.
 */
export function normalizePastedOrAiTextToCanonical(plainInput: string, htmlInput?: string): string {
  let working = '';

  // Se houver HTML rico na área de transferência (ex: colado do Google Docs, Word ou página web),
  // extrai a semântica (parágrafos, títulos, negritos, listas) descartando cores/fontes externas
  if (htmlInput && /<(?:p|h[1-6]|ul|ol|li|blockquote|strong|b|em|i|br)\b/i.test(htmlInput)) {
    working = htmlInput
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n\n# $1\n\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n\n## $1\n\n')
      .replace(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi, '\n\n### $1\n\n')
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n\n> $1\n\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
      .replace(/<\/(?:ul|ol)>/gi, '\n\n')
      .replace(/<(?:strong|b)(?:\s[^>]*)?>([\s\S]*?)<\/(?:strong|b)>/gi, '**$1**')
      .replace(/<(?:em|i)(?:\s[^>]*)?>([\s\S]*?)<\/(?:em|i)>/gi, '*$1*')
      .replace(/<u(?:\s[^>]*)?>([\s\S]*?)<\/u>/gi, '[u]$1[/u]')
      .replace(/<(?:s|strike|del)(?:\s[^>]*)?>([\s\S]*?)<\/(?:s|strike|del)>/gi, '~~$1~~')
      .replace(/<hr[^>]*\/?>/gi, '\n\n---\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|section|article)>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  } else {
    working = String(plainInput || '');
  }

  // Se o texto plano original tinha marcações markdown explícitas (#, **, ¨¨) que o HTML escapou, prioriza o texto plano quando mais rico em markdown
  if (
    plainInput &&
    (/(\*\*|¨¨|^#{1,4}\s+)/m.test(plainInput)) &&
    !working.includes('**') &&
    !working.includes('# ')
  ) {
    working = String(plainInput);
  }

  working = working.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Limpa artefatos clássicos de cópia/cola de IA e teclado ABNT2:
  // - ¨¨texto¨¨ (trema duplo gerado ao tentar digitar aspas ou negrito) -> **texto**
  working = working.replace(/¨{2,}([^¨\n]+?)¨{2,}/g, '**$1**');
  // - Remove tremas soltos no início/fim de palavras ou linhas ("¨texto¨" -> "“texto”", "¨¨" solto -> removido)
  working = working.replace(/¨([^¨\n]{2,80})¨/g, '“$1”');
  working = working.replace(/¨+/g, '');
  // - ""texto"" (aspas duplicadas) -> “texto”
  working = working.replace(/""([^"\n]+?)""/g, '“$1”');
  // - __texto__ (negrito markdown com underscore) -> **texto**
  working = working.replace(/__([^_\n]+?)__/g, '**$1**');
  // - ***texto*** (negrito + itálico) -> **texto**
  working = working.replace(/\*{3}([^*\n]+?)\*{3}/g, '**$1**');
  // - Remove cercas de código markdown ```
  working = working.replace(/^```[a-z]*\s*$/gim, '');

  // 2. Processa linha por linha para converter cabeçalhos, listas, citações e separar parágrafos
  const rawLines = working.split('\n');
  const structuredBlocks: string[] = [];
  let currentParagraphLines: string[] = [];
  let currentListLines: string[] = [];
  let currentListKind: 'ul' | 'ol' | null = null;

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const joined = currentParagraphLines.join(' ').replace(/\s{2,}/g, ' ').trim();
      if (joined) structuredBlocks.push(joined);
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentListLines.length > 0) {
      structuredBlocks.push(currentListLines.join('\n'));
      currentListLines = [];
      currentListKind = null;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Preserva tags de imagem [img...]...[/img]
    if (parseEditorialImageTag(line)) {
      flushParagraph();
      flushList();
      structuredBlocks.push(line);
      continue;
    }

    // Divisor horizontal (---, ***, ___)
    if (/^(?:-{3,}|\*{3,}|_{3,}|✦)$/.test(line)) {
      flushParagraph();
      flushList();
      structuredBlocks.push('---');
      continue;
    }

    // Títulos Markdown (# Título, ## Subtítulo, ### Tópico, #### Tópico)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const hashes = headingMatch[1].length;
      // Limpa **negrito** redundante dentro de título (ex: "## **Meu Subtítulo**" -> "## Meu Subtítulo")
      const cleanHeadingText = headingMatch[2]
        .replace(/^\*\*([\s\S]+?)\*\*:?$/, '$1')
        .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
        .trim();
      const prefix = hashes === 1 ? '# ' : hashes === 2 ? '## ' : '### ';
      structuredBlocks.push(`${prefix}${cleanHeadingText}`);
      continue;
    }

    // Linha curta inteiramente em negrito (ex: "**Minha História**" ou "**1. Quem sou eu**")
    // que IAs costumam gerar como subtítulo sem colocar "##"
    const standaloneBoldHeading = line.match(/^\*\*([^*]{3,72})\*\*:?$/);
    if (standaloneBoldHeading && !/[.!?;]$/.test(standaloneBoldHeading[1].trim())) {
      flushParagraph();
      flushList();
      structuredBlocks.push(`## ${standaloneBoldHeading[1].trim()}`);
      continue;
    }

    // Citação (> texto)
    if (/^>\s+/.test(line)) {
      flushParagraph();
      flushList();
      const cleanQuote = line.replace(/^>\s+/, '').replace(/^["“]|["”]$/g, '').trim();
      if (cleanQuote) structuredBlocks.push(`> ${cleanQuote}`);
      continue;
    }

    // Lista com marcadores (- item, * item, • item, – item)
    const bulletMatch = line.match(/^(?:[-•*–])\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (currentListKind === 'ol') flushList();
      currentListKind = 'ul';
      currentListLines.push(`- ${bulletMatch[1].trim()}`);
      continue;
    }

    // Lista numerada (1. item, 2) item)
    const numMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numMatch) {
      flushParagraph();
      if (currentListKind === 'ul') flushList();
      currentListKind = 'ol';
      const nextNum = currentListLines.length + 1;
      currentListLines.push(`${nextNum}. ${numMatch[2].trim()}`);
      continue;
    }

    flushList();

    // Limpa asteriscos órfãos ou mal fechados na linha (ex: "**palavra" sem fechar)
    const asteriskPairs = (line.match(/\*\*/g) || []).length;
    if (asteriskPairs % 2 !== 0) {
      // Se há apenas um "**" solto, remove-o para não aparecer cru no texto
      line = line.replace(/\*\*/g, '');
    }

    currentParagraphLines.push(line);

    // Se o texto colado usa apenas 1 quebra de linha (\n) entre parágrafos completos (ex: WhatsApp / PDF / ChatGPT),
    // e a linha termina em ponto final/exclamação/interrogação com tamanho de parágrafo (>110 chars),
    // fecha o parágrafo atual para não grudar tudo num bloco só!
    if (/[.!?…]["”)]?$/.test(line) && currentParagraphLines.join(' ').length >= 120) {
      flushParagraph();
    }
  }

  flushParagraph();
  flushList();

  return structuredBlocks.join('\n\n').trim();
}
