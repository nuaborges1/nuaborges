import React from 'react';
import { ParsedTicketProposal } from './types';

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

export function FormattedAiMessage({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, bIdx) => {
        const lines = block.split('\n');

        // Check if block is a blockquote
        if (lines.every((l) => l.trim().startsWith('>') || l.trim() === '')) {
          return (
            <div
              key={bIdx}
              className="border-l-2 border-[#f4a7b9] pl-3 py-1 bg-[#f4a7b9]/5 rounded-r-xl italic text-zinc-300 text-[11px] leading-relaxed my-1"
            >
              {lines.map((l, lIdx) => (
                <p key={lIdx}>{renderInlineFormatting(l.replace(/^>\s*/, ''))}</p>
              ))}
            </div>
          );
        }

        // Check if block is a list of bullets
        const isBulletList = lines.some((l) => /^\s*[-*•]\s+/.test(l));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-1.5 my-1">
              {lines.map((l, lIdx) => {
                if (/^\s*[-*•]\s+/.test(l)) {
                  const cleaned = l.replace(/^\s*[-*•]\s+/, '');
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] shrink-0 mt-1.5" />
                      <span className="flex-1">{renderInlineFormatting(cleaned)}</span>
                    </li>
                  );
                }
                return (
                  <li key={lIdx} className="leading-relaxed">
                    {renderInlineFormatting(l)}
                  </li>
                );
              })}
            </ul>
          );
        }

        // Check if block is an ordered list (1. , 2. )
        const isNumberedList = lines.some((l) => /^\s*\d+[\.)]\s+/.test(l));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="space-y-1.5 my-1">
              {lines.map((l, lIdx) => {
                const match = l.match(/^\s*(\d+)[\.)]\s+(.*)$/);
                if (match) {
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-800 text-[9px] font-mono text-[#f4a7b9] border border-[#f4a7b9]/30 flex items-center justify-center shrink-0 mt-0.5">
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
        }

        // Check if line is a header ###
        if (block.startsWith('### ') || block.startsWith('## ')) {
          const headerText = block.replace(/^#{2,3}\s+/, '');
          return (
            <h4 key={bIdx} className="font-semibold text-white text-xs mt-2 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] shrink-0" />
              <span>{renderInlineFormatting(headerText)}</span>
            </h4>
          );
        }

        // Regular paragraph
        return (
          <p key={bIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInlineFormatting(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
