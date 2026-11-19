import React from 'react';
import { ParsedTicketProposal } from './types';
import { AiMediaThumbnailGrid, AiMediaThumbnailItem, isVideoUrl } from './AiMediaThumbnailGrid';

export function parseTicketProposal(content: string): ParsedTicketProposal | null {
  if (!content.includes('RESUMO DO PEDIDO PARA O PHILIPPE')) return null;

  const typeMatch = content.match(/[•\-*]?\s*Tipo:\s*(.+)/i);
  const whatMatch = content.match(/[•\-*]?\s*(?:O quê|O que|Título):\s*(.+)/i);
  const whereMatch = content.match(/[•\-*]?\s*Onde:\s*(.+)/i);
  const detailsMatch = content.match(/[•\-*]?\s*Detalhes:\s*(.+)/i);

  const type = typeMatch ? typeMatch[1].trim() : 'Melhoria';
  const title = whatMatch ? whatMatch[1].trim() : 'Solicitação da Nua Borges';
  const section = whereMatch ? whereMatch[1].trim() : 'Geral';
  const details = detailsMatch ? detailsMatch[1].trim() : content;

  return {
    type,
    title,
    section,
    details,
  };
}

export function renderInlineFormatting(text: string) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const codeWord = token.slice(1, -1);
      const cleanWord = codeWord === 'hero' ? 'Início & Capa' : codeWord === 'about' ? 'Sobre Mim' : codeWord === 'gallery' ? 'Galeria' : codeWord.replace(/_/g, ' ');
      parts.push(
        <span
          key={match.index}
          className="font-medium text-white"
        >
          {cleanWord}
        </span>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-zinc-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function extractMarkdownImages(text: string): { textWithoutImages: string; images: AiMediaThumbnailItem[] } {
  const images: AiMediaThumbnailItem[] = [];
  // Suporta URLs relativas (/media/..., /images/...) e absolutas (http/https),
  // tolerando quebras de linha entre [] e (), dentro dos parênteses (), e espaços acidentais
  const imgRegex = /!\[([^\]]*)\]\s*\(\s*([\s\S]*?)\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(text)) !== null) {
    const alt = (match[1] || '').trim();
    const rawUrl = (match[2] || '').trim();
    // Limpa quaisquer quebras de linha ou espaços internos da URL que o modelo possa ter inserido
    const url = rawUrl.replace(/\s+/g, '');
    if (url && (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://'))) {
      images.push({
        url,
        alt,
        title: alt.replace(/^Galeria\s*[-—–]\s*/i, '').trim() || alt,
        isVideo: isVideoUrl(url, alt),
      });
    }
  }

  let cleanedText = text;
  // Remove todas as tags markdown de imagens
  cleanedText = cleanedText.replace(/!\[([^\]]*)\]\s*\(\s*([\s\S]*?)\s*\)/g, '');

  // Remove legendas redundantes imediatas (ex: linha isolada contendo o título ou alt da imagem)
  for (const img of images) {
    const candidateNames = [img.alt, img.title].filter(Boolean) as string[];
    for (const name of candidateNames) {
      if (name && name.length >= 2) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        cleanedText = cleanedText.replace(new RegExp(`^\\s*${escaped}\\s*$`, 'gmi'), '');
      }
    }
  }

  return { textWithoutImages: cleanedText.trim(), images };
}

export function FormattedAiMessage({ content }: { content: string }) {
  const rawBlocks = content.split(/\n{2,}/);

  // Agrupa blocos sequenciais de mídia para renderizar em uma única mesa/grade visual contínua
  interface ProcessedBlock {
    textWithoutImages: string;
    images: AiMediaThumbnailItem[];
    effectiveBlock: string;
  }

  const processedBlocks: ProcessedBlock[] = [];
  for (const raw of rawBlocks) {
    const { textWithoutImages, images } = extractMarkdownImages(raw);
    const isPureMedia = images.length > 0 && (!textWithoutImages || /^[•\-*\s]+$/.test(textWithoutImages));

    const last = processedBlocks[processedBlocks.length - 1];
    if (isPureMedia && last && last.images.length > 0 && (!last.textWithoutImages || /^[•\-*\s]+$/.test(last.textWithoutImages))) {
      last.images.push(...images);
    } else {
      processedBlocks.push({
        textWithoutImages,
        images,
        effectiveBlock: images.length > 0 ? textWithoutImages : raw,
      });
    }
  }

  return (
    <div className="space-y-2.5">
      {processedBlocks.map((block, bIdx) => {
        const { textWithoutImages, images, effectiveBlock } = block;

        // Se o bloco continha apenas imagens (ou marcadores de lista vazios), renderiza diretamente a grade
        if (images.length > 0 && (!textWithoutImages || /^[•\-*\s]+$/.test(textWithoutImages))) {
          return <AiMediaThumbnailGrid key={bIdx} items={images} />;
        }

        const lines = effectiveBlock.split('\n');

        let renderedContent: React.ReactNode = null;

        // Check if block is a blockquote
        if (lines.every((l) => l.trim().startsWith('>') || l.trim() === '')) {
          renderedContent = (
            <div className="border-l-2 border-[#e5b894] pl-3 py-1 bg-[#e5b894]/5 rounded-r-xl italic text-zinc-300 text-[11px] leading-relaxed my-1">
              {lines.map((l, lIdx) => (
                <p key={lIdx}>{renderInlineFormatting(l.replace(/^>\s*/, ''))}</p>
              ))}
            </div>
          );
        } else if (lines.some((l) => /^\s*[-*•]\s+/.test(l))) {
          // Check if block is a list of bullets
          renderedContent = (
            <ul className="space-y-1.5 my-1">
              {lines.map((l, lIdx) => {
                if (/^\s*[-*•]\s+/.test(l)) {
                  const cleaned = l.replace(/^\s*[-*•]\s+/, '').trim();
                  if (!cleaned) return null;
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e5b894] shrink-0 mt-1.5" />
                      <span className="flex-1">{renderInlineFormatting(cleaned)}</span>
                    </li>
                  );
                }
                const trimmed = l.trim();
                if (!trimmed) return null;
                return (
                  <li key={lIdx} className="leading-relaxed">
                    {renderInlineFormatting(trimmed)}
                  </li>
                );
              })}
            </ul>
          );
        } else if (lines.some((l) => /^\s*\d+[\.)]\s+/.test(l))) {
          // Check if block is an ordered list (1. , 2. )
          renderedContent = (
            <ol className="space-y-1.5 my-1">
              {lines.map((l, lIdx) => {
                const match = l.match(/^\s*(\d+)[\.)]\s+(.*)$/);
                if (match) {
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-mono text-[#e5b894] border border-[#e5b894]/30 flex items-center justify-center shrink-0 mt-0.5">
                        {match[1]}
                      </span>
                      <span className="flex-1">{renderInlineFormatting(match[2])}</span>
                    </li>
                  );
                }
                return (
                  <li key={lIdx} className="leading-relaxed">
                    {renderInlineFormatting(l)}
                  </li>
                );
              })}
            </ol>
          );
        } else if (effectiveBlock.startsWith('### ') || effectiveBlock.startsWith('## ')) {
          // Check if line is a header ###
          const headerText = effectiveBlock.replace(/^#{2,3}\s+/, '');
          renderedContent = (
            <h4 className="font-semibold text-white text-xs mt-2 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e5b894] shrink-0" />
              <span>{renderInlineFormatting(headerText)}</span>
            </h4>
          );
        } else {
          // Regular paragraph
          renderedContent = (
            <p className="leading-relaxed">
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {renderInlineFormatting(line)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        }

        return (
          <div key={bIdx} className="space-y-2">
            {renderedContent}
            {images.length > 0 && <AiMediaThumbnailGrid items={images} />}
          </div>
        );
      })}
    </div>
  );
}
