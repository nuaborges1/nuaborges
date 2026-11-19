/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';

interface InstitutionalGeneralCardProps {
  sectionTitle: string;
  description?: string;
  onUpdate: (fields: { sectionTitle?: string; description?: string }) => void;
}

export function InstitutionalGeneralCard({
  sectionTitle,
  description,
  onUpdate,
}: InstitutionalGeneralCardProps) {
  return (
    <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
      <div className="mb-4">
        <span className="text-[#843C52] text-[10px] font-semibold tracking-wider uppercase block mb-0.5">
          RODAPÉ & INSTITUCIONAL
        </span>
        <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          Links Institucionais & Transparência
        </h2>
        <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
          Personalize a coluna de documentos, manifestos e termos legais que são exibidos no rodapé do site.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
            Título da Seção no Rodapé
          </label>
          <input
            type="text"
            value={sectionTitle}
            onChange={(e) => onUpdate({ sectionTitle: e.target.value })}
            placeholder="Ex: Institucional"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
          />
          <span className="text-zinc-500 text-[11px] block mt-1 font-light">
            Exibido acima dos links no rodapé (ex: &ldquo;Institucional&rdquo;, &ldquo;Legal & Diretrizes&rdquo;).
          </span>
        </div>

        <div>
          <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
            Texto Explicativo (Opcional)
          </label>
          <input
            type="text"
            value={description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Ex: Diretrizes legais, proteção de dados e transparência editorial"
            className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
          />
          <span className="text-zinc-500 text-[11px] block mt-1 font-light">
            Pequena frase sobre os documentos e transparência do site.
          </span>
        </div>
      </div>
    </div>
  );
}
