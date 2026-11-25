/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { resolveMediaUrl } from '@/lib/media';
import {
  EditorialImageLayout,
  EditorialImageSize,
  ParsedEditorialImageBlock,
  buildEditorialImageTag,
  extractAllEditorialImages,
  normalizePastedOrAiTextToCanonical,
  parseEditorialImageTag,
  stripRichTextFormatting,
} from './editorialMarkup';

export type { EditorialImageLayout, EditorialImageSize, ParsedEditorialImageBlock };
export {
  buildEditorialImageTag,
  extractAllEditorialImages,
  normalizePastedOrAiTextToCanonical,
  parseEditorialImageTag,
  stripRichTextFormatting,
};

const INLINE_TOKEN_RE =
  /(\*\*[\s\S]+?\*\*|~~[\s\S]+?~~|\[u\][\s\S]+?\[\/u\]|<u>[\s\S]+?<\/u>|\[s\][\s\S]+?\[\/s\]|<s>[\s\S]+?<\/s>|\[b\][\s\S]+?\[\/b\]|<b>[\s\S]+?<\/b>|<strong>[\s\S]+?<\/strong>|\[i\][\s\S]+?\[\/i\]|<i>[\s\S]+?<\/i>|<em>[\s\S]+?<\/em>|\[vinho\][\s\S]+?\[\/vinho\]|\[dourado\][\s\S]+?\[\/dourado\]|\[grifo\][\s\S]+?\[\/grifo\]|\[pequeno\][\s\S]+?\[\/pequeno\]|\[grande\][\s\S]+?\[\/grande\]|\[gigante\][\s\S]+?\[\/gigante\]|\*[^*\n]+\*)/gi;

export function renderInlineRichText(text: string, keyPrefix = 'rt'): React.ReactNode[] {
  if (!text) return [];
  const cleanedInput = String(text)
    .replace(/¨{2,}([^¨\n]+?)¨{2,}/g, '**$1**')
    .replace(/__([^_\n]+?)__/g, '**$1**')
    .replace(/¨+/g, '');
  const parts = cleanedInput.split(INLINE_TOKEN_RE);
  return parts.filter(Boolean).map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;

    if (
      (part.startsWith('**') && part.endsWith('**') && part.length > 4) ||
      (/^\[b\][\s\S]+\[\/b\]$/i.test(part)) ||
      (/^<b>[\s\S]+<\/b>$/i.test(part)) ||
      (/^<strong>[\s\S]+<\/strong>$/i.test(part))
    ) {
      const inner = part
        .replace(/^\*\*|\*\*$/g, '')
        .replace(/^\[b\]|\[\/b\]$/gi, '')
        .replace(/^<(?:b|strong)>|<\/(?:b|strong)>$/gi, '');
      return (
        <strong key={key} className="font-semibold text-white">
          {renderInlineRichText(inner, key)}
        </strong>
      );
    }

    if (
      (/^\[u\][\s\S]+\[\/u\]$/i.test(part)) ||
      (/^<u>[\s\S]+<\/u>$/i.test(part))
    ) {
      const inner = part.replace(/^\[u\]|\[\/u\]$/gi, '').replace(/^<u>|<\/u>$/gi, '');
      return (
        <span
          key={key}
          className="underline decoration-[#90364B] decoration-2 underline-offset-4 text-zinc-100"
        >
          {renderInlineRichText(inner, key)}
        </span>
      );
    }

    if (
      (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) ||
      (/^\[s\][\s\S]+\[\/s\]$/i.test(part)) ||
      (/^<s>[\s\S]+<\/s>$/i.test(part))
    ) {
      const inner = part
        .replace(/^~~|~~$/g, '')
        .replace(/^\[s\]|\[\/s\]$/gi, '')
        .replace(/^<s>|<\/s>$/gi, '');
      return (
        <s key={key} className="line-through text-zinc-400 decoration-zinc-500">
          {renderInlineRichText(inner, key)}
        </s>
      );
    }

    if (/^\[vinho\][\s\S]+\[\/vinho\]$/i.test(part)) {
      const inner = part.replace(/^\[vinho\]|\[\/vinho\]$/gi, '');
      return (
        <span key={key} className="text-[#c8647d] font-medium">
          {renderInlineRichText(inner, key)}
        </span>
      );
    }

    if (/^\[dourado\][\s\S]+\[\/dourado\]$/i.test(part)) {
      const inner = part.replace(/^\[dourado\]|\[\/dourado\]$/gi, '');
      return (
        <span key={key} className="text-[#e5b894] font-medium">
          {renderInlineRichText(inner, key)}
        </span>
      );
    }

    if (/^\[grifo\][\s\S]+\[\/grifo\]$/i.test(part)) {
      const inner = part.replace(/^\[grifo\]|\[\/grifo\]$/gi, '');
      return (
        <mark
          key={key}
          className="bg-[#661C30]/45 text-[#F5EEE9] px-1.5 py-0.5 rounded-md border-b border-[#90364B]/60"
        >
          {renderInlineRichText(inner, key)}
        </mark>
      );
    }

    if (/^\[pequeno\][\s\S]+\[\/pequeno\]$/i.test(part)) {
      const inner = part.replace(/^\[pequeno\]|\[\/pequeno\]$/gi, '');
      return (
        <span key={key} className="text-xs sm:text-[13px] text-zinc-400">
          {renderInlineRichText(inner, key)}
        </span>
      );
    }

    if (/^\[grande\][\s\S]+\[\/grande\]$/i.test(part)) {
      const inner = part.replace(/^\[grande\]|\[\/grande\]$/gi, '');
      return (
        <span key={key} className="text-lg sm:text-xl text-zinc-100 leading-relaxed">
          {renderInlineRichText(inner, key)}
        </span>
      );
    }

    if (/^\[gigante\][\s\S]+\[\/gigante\]$/i.test(part)) {
      const inner = part.replace(/^\[gigante\]|\[\/gigante\]$/gi, '');
      return (
        <span key={key} className="font-serif text-xl sm:text-2xl text-white leading-snug">
          {renderInlineRichText(inner, key)}
        </span>
      );
    }

    if (
      (part.startsWith('*') && part.endsWith('*') && part.length > 2) ||
      (/^\[i\][\s\S]+\[\/i\]$/i.test(part)) ||
      (/^<i>[\s\S]+<\/i>$/i.test(part)) ||
      (/^<em>[\s\S]+<\/em>$/i.test(part))
    ) {
      const inner = part
        .replace(/^\*|\*$/g, '')
        .replace(/^\[i\]|\[\/i\]$/gi, '')
        .replace(/^<(?:i|em)>|<\/(?:i|em)>$/gi, '');
      return (
        <em key={key} className="italic text-zinc-100 font-serif">
          {renderInlineRichText(inner, key)}
        </em>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

function unwrapBlockAlignment(rawBlock: string, defaultAlign: 'left' | 'center' | 'right'): {
  inner: string;
  blockAlign: 'left' | 'center' | 'right';
} {
  const trimmed = rawBlock.trim();
  const centerMatch = trimmed.match(/^\[centro\]([\s\S]*)\[\/centro\]$/i);
  if (centerMatch) {
    return { inner: centerMatch[1].trim(), blockAlign: 'center' };
  }
  const rightMatch = trimmed.match(/^\[direita\]([\s\S]*)\[\/direita\]$/i);
  if (rightMatch) {
    return { inner: rightMatch[1].trim(), blockAlign: 'right' };
  }
  return { inner: trimmed, blockAlign: defaultAlign };
}

interface EditorialRichTextProps {
  text?: string | null;
  className?: string;
  align?: 'left' | 'center';
  inline?: boolean;
}

export function EditorialRichText({
  text,
  className = '',
  align = 'left',
  inline = false,
}: EditorialRichTextProps) {
  if (!text || !text.trim()) return null;

  if (inline) {
    return <span className={className}>{renderInlineRichText(text)}</span>;
  }

  const defaultAlignClass = align === 'center' ? 'text-center' : 'text-left';

  // Normaliza tags [img...]...[/img] para ficarem sempre em seu próprio bloco
  const normalizedText = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/(\[img[^\]]*\][\s\S]+?\[\/img\])/gi, '\n\n$1\n\n');

  const rawBlocks = normalizedText
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={`space-y-6 after:content-[''] after:table after:clear-both ${defaultAlignClass} ${className}`}>
      {rawBlocks.map((rawBlock, bIdx) => {
        const { inner: block, blockAlign } = unwrapBlockAlignment(rawBlock, align);
        const blockAlignClass =
          blockAlign === 'center'
            ? 'text-center'
            : blockAlign === 'right'
            ? 'text-right'
            : 'text-left';

        const lines = block.split('\n');

        // 1. Bloco de Foto ou Galeria no meio do Post
        if (lines.length === 1) {
          const parsedImg = parseEditorialImageTag(lines[0]);
          if (parsedImg && parsedImg.urls.length > 0) {
            const { urls, layout, caption, alt } = parsedImg;

            // Mosaico de 2 ou 3 fotos lado a lado
            if (urls.length > 1) {
              const gridCols =
                urls.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3';
              return (
                <figure key={bIdx} className="my-8 clear-both space-y-2.5">
                  <div className={`grid ${gridCols} gap-4`}>
                    {urls.map((u, uIdx) => (
                      <div
                        key={`${u}-${uIdx}`}
                        className="relative aspect-[3/4] rounded-[22px] overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.85)]"
                      >
                        <img
                          src={resolveMediaUrl(u, 'full')}
                          alt={alt || caption || `Nua Borges ${uIdx + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover object-center block"
                        />
                      </div>
                    ))}
                  </div>
                  {caption && (
                    <figcaption className="text-center text-xs text-zinc-400 font-serif italic">
                      {caption}
                    </figcaption>
                  )}
                </figure>
              );
            }

            // Foto única com 4 opções de layout (full, portrait, left, right) e 3 opções de tamanho (sm, md, lg)
            // No mobile (telas pequenas), empilha em largura legível; no desktop (sm:+), aplica float e escala
            const singleUrl = urls[0];
            const imgSize = parsedImg.size || 'md';
            const sideWidthClass =
              imgSize === 'sm'
                ? 'sm:w-[30%] sm:max-w-[230px]'
                : imgSize === 'lg'
                ? 'sm:w-[56%] sm:max-w-[430px]'
                : 'sm:w-[44%] sm:max-w-[330px]';
            const portraitWidthClass =
              imgSize === 'sm'
                ? 'max-w-[270px]'
                : imgSize === 'lg'
                ? 'max-w-[540px]'
                : 'max-w-[390px]';
            const fullWidthClass =
              imgSize === 'sm'
                ? 'max-w-[460px] mx-auto'
                : imgSize === 'md'
                ? 'w-full'
                : 'w-full';

            const figureLayoutClass =
              layout === 'left'
                ? `w-full sm:float-left ${sideWidthClass} sm:mr-7 sm:mb-4 my-5`
                : layout === 'right'
                ? `w-full sm:float-right ${sideWidthClass} sm:ml-7 sm:mb-4 my-5`
                : layout === 'portrait'
                ? `${portraitWidthClass} mx-auto my-8 clear-both`
                : `${fullWidthClass} my-8 clear-both`;

            return (
              <figure key={bIdx} className={`${figureLayoutClass} space-y-2.5`}>
                <div className="rounded-[24px] overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_18px_50px_rgba(0,0,0,0.85)]">
                  <img
                    src={resolveMediaUrl(singleUrl, 'full')}
                    alt={alt || caption || 'Nua Borges'}
                    loading="lazy"
                    className={`w-full object-cover object-center block ${
                      layout === 'portrait' || layout === 'left' || layout === 'right'
                        ? 'aspect-[3/4]'
                        : 'max-h-[620px]'
                    }`}
                  />
                </div>
                {caption && (
                  <figcaption className="text-center text-xs text-zinc-400 font-serif italic px-2">
                    {caption}
                  </figcaption>
                )}
              </figure>
            );
          }
        }

        // 2. Separador editorial (--- ou ✦)
        if (lines.length === 1 && /^(-{3,}|✦|\*{3,})$/.test(lines[0].trim())) {
          return (
            <div key={bIdx} className="py-3 clear-both flex items-center justify-center gap-3 select-none">
              <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#90364B]/45" />
              <span className="text-[#90364B] text-xs">✦</span>
              <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#90364B]/45" />
            </div>
          );
        }

        // 3. Bloco de lista com marcadores (- item ou • item)
        const isBulletList = lines.every((l) => /^[-•*]\s+/.test(l.trim()));
        if (isBulletList) {
          return (
            <ul
              key={bIdx}
              className={`space-y-2.5 ${
                blockAlign === 'center' ? 'inline-block text-left' : ''
              }`}
            >
              {lines.map((line, lIdx) => {
                const content = line.trim().replace(/^[-•*]\s+/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#90364B] mt-2.5 shrink-0" />
                    <span>{renderInlineRichText(content, `b${bIdx}-l${lIdx}`)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // 3b. Bloco de lista numerada (1. item, 2. item)
        const isNumberedList = lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol
              key={bIdx}
              className={`space-y-2.5 ${
                blockAlign === 'center' ? 'inline-block text-left' : ''
              }`}
            >
              {lines.map((line, lIdx) => {
                const content = line.trim().replace(/^\d+[.)]\s+/, '');
                return (
                  <li key={lIdx} className="flex items-start gap-3">
                    <span className="text-xs font-serif font-semibold text-[#c8647d] mt-1 shrink-0 min-w-[1.25rem]">
                      {lIdx + 1}.
                    </span>
                    <span>{renderInlineRichText(content, `ol${bIdx}-l${lIdx}`)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // 4. Títulos hierárquicos (# Título Grande, ## Subtítulo, ### Tópico)
        // Respeita o H1 já presente no cabeçalho da página /sobre usando h2, h3 e h4 semânticos
        if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0].trim())) {
          const rawLine = lines[0].trim();
          const hashMatch = rawLine.match(/^(#{1,3})\s+/);
          const level = hashMatch ? hashMatch[1].length : 2;
          const headingText = rawLine.replace(/^#{1,3}\s+/, '');

          if (level === 1) {
            return (
              <h2
                key={bIdx}
                className={`font-serif text-2xl sm:text-[2rem] text-white font-medium tracking-tight pt-5 clear-both leading-tight ${blockAlignClass}`}
              >
                {renderInlineRichText(headingText, `h1-${bIdx}`)}
              </h2>
            );
          }

          if (level === 3) {
            return (
              <h4
                key={bIdx}
                className={`font-serif text-lg sm:text-xl text-[#F5EEE9] font-medium tracking-wide pt-3 clear-both ${blockAlignClass}`}
              >
                {renderInlineRichText(headingText, `h3-${bIdx}`)}
              </h4>
            );
          }

          return (
            <h3
              key={bIdx}
              className={`font-serif text-xl sm:text-2xl text-white font-medium tracking-tight pt-4 clear-both ${blockAlignClass}`}
            >
              {renderInlineRichText(headingText, `h2-${bIdx}`)}
            </h3>
          );
        }

        // 5. Bloco de citação (> Frase)
        const isQuote = lines.every((l) => /^>\s*/.test(l.trim()));
        if (isQuote) {
          const quoteContent = lines.map((l) => l.trim().replace(/^>\s*/, '')).join(' ');
          return (
            <blockquote
              key={bIdx}
              className={`my-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#12090d] via-[#09080c] to-[#060609] border-l-2 border-[#90364B] italic font-serif text-lg sm:text-xl text-zinc-100 leading-relaxed ${blockAlignClass}`}
            >
              {renderInlineRichText(quoteContent, `q-${bIdx}`)}
            </blockquote>
          );
        }

        // 6. Parágrafo comum
        return (
          <p key={bIdx} className={`leading-[1.85] ${blockAlignClass}`}>
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInlineRichText(line, `p${bIdx}-${lIdx}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
