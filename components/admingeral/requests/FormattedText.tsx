/* Vinho maduro / Nua Borges */
import React from 'react';

export function FormattedText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
        const cleanLine = isBullet ? trimmed.replace(/^[-•*]\s*/, '') : trimmed;
        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#843C52] mt-1 text-[10px] shrink-0 leading-none">●</span>
              <span className="flex-1">{renderedParts}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-zinc-200">
            {renderedParts}
          </p>
        );
      })}
    </div>
  );
}
