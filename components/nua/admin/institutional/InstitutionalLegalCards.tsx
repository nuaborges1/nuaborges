/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';

interface InstitutionalLegalCardsProps {
  ageNoticeTitle?: string;
  ageNoticeDescription?: string;
  termsSummary?: string;
  privacySummary?: string;
  onUpdate: (fields: {
    ageNoticeTitle?: string;
    ageNoticeDescription?: string;
    termsSummary?: string;
    privacySummary?: string;
  }) => void;
}

export function InstitutionalLegalCards({
  ageNoticeTitle,
  ageNoticeDescription,
  termsSummary,
  privacySummary,
  onUpdate,
}: InstitutionalLegalCardsProps) {
  return (
    <>
      {/* Card 3: Aviso de Maioridade 18+ e Proteção */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <span className="text-[#843C52] text-[10px] font-semibold tracking-wider uppercase block mb-0.5">
            CONFORMIDADE & MAIORIDADE
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Aviso de Maioridade (18+)
          </h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
            Mensagem legal apresentada para confirmar maioridade e consentimento do visitante antes de visualizar conteúdos sensíveis.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Título do Aviso de Maioridade
            </label>
            <input
              type="text"
              value={ageNoticeTitle || 'Conteúdo Adulto & Artístico (18+)'}
              onChange={(e) => onUpdate({ ageNoticeTitle: e.target.value })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#843C52] transition-colors"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Texto Legal do Consentimento
            </label>
            <textarea
              rows={2}
              value={
                ageNoticeDescription ||
                'Este site contém obras fotográficas e produções audiovisuais destinadas exclusivamente a pessoas maiores de 18 anos ou com idade legal em sua jurisdição.'
              }
              onChange={(e) => onUpdate({ ageNoticeDescription: e.target.value })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#843C52] transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Card 4: Resumos dos Termos de Uso e Privacidade */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <span className="text-[#843C52] text-[10px] font-semibold tracking-wider uppercase block mb-0.5">
            SEGURANÇA JURÍDICA
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Diretrizes dos Termos de Uso &amp; Política de Privacidade
          </h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
            Resumos formais exibidos no rodapé e nas telas de pagamento para proteger seus direitos autorais e garantir transparência com assinantes e clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Resumo dos Termos de Uso &amp; Direitos Autorais
            </label>
            <textarea
              rows={4}
              value={
                termsSummary ||
                'Todas as imagens, vídeos e textos são de propriedade intelectual exclusiva de Nua Borges. É expressamente proibida a reprodução, redistribuição ou compartilhamento sem autorização.'
              }
              onChange={(e) => onUpdate({ termsSummary: e.target.value })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#843C52] transition-colors resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Resumo da Política de Privacidade &amp; LGPD
            </label>
            <textarea
              rows={4}
              value={
                privacySummary ||
                'Os dados coletados (e-mail, nome e dados de pagamento) são utilizados unicamente para entrega e liberação dos conteúdos contratados, com sigilo e confidencialidade absolutos.'
              }
              onChange={(e) => onUpdate({ privacySummary: e.target.value })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#843C52] transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </>
  );
}
