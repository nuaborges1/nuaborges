'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { VipModal } from '@/components/nua/site/VipModal';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';
import { usePublishedContent } from '@/lib/contentStore';

interface AvulsoProductNotFoundProps {
  activeSlug: string;
  otherActivePacks: AvulsoProductItem[];
  content: ReturnType<typeof usePublishedContent>;
}

export function AvulsoProductNotFound({
  activeSlug,
  otherActivePacks,
  content,
}: AvulsoProductNotFoundProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const [vipOpen, setVipOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#f4a7b9] selection:text-black">
      <Header onOpenContact={() => setContactOpen(true)} activeSection="avulsos" />
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-20 text-center relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-[#f4a7b9]/[0.035] rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9]" />
            <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-[0.25em] uppercase">
              CONTEÚDO NÃO ENCONTRADO
            </span>
          </div>

          <div className="font-serif text-5xl sm:text-7xl font-light text-white/20 tracking-tight">
            404
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-white font-normal">
            Pack ou Conteúdo Indisponível
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base font-light max-w-md mx-auto leading-relaxed">
            O conteúdo{' '}
            <span className="text-[#f4a7b9] font-mono text-xs bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
              /avulsos/{activeSlug}
            </span>{' '}
            não foi encontrado, foi alterado ou ainda está sendo sincronizado.
          </p>

          {/* Sugestão de outros packs ativos disponíveis */}
          {otherActivePacks.length > 0 && (
            <div className="pt-6 border-t border-white/[0.06] text-left">
              <span className="text-xs uppercase tracking-wider text-zinc-400 block mb-3 font-semibold">
                Outras Produções Disponíveis no Acervo:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {otherActivePacks.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/avulsos/${p.slug || p.id}`}
                    className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-[#f4a7b9]/40 flex items-center gap-3 transition-colors group"
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black shrink-0">
                      {p.imageUrl ? (
                        <Image
                          src={resolveMediaUrl(p.imageUrl, 'thumb')}
                          alt={p.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-950 flex items-center justify-center text-zinc-600">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs text-white font-medium truncate group-hover:text-[#f4a7b9] transition-colors">
                        {p.title}
                      </h4>
                      <span className="text-[11px] font-mono text-[#f4a7b9]">
                        R${' '}
                        {(typeof p.numericPrice === 'number'
                          ? p.numericPrice
                          : parseFloat(String(p.price || 0).replace(/[^\d,.]/g, '').replace(',', '.')) || 0
                        )
                          .toFixed(2)
                          .replace('.', ',')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/#avulsos"
              className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center shadow-[0_4px_20px_rgba(244,167,185,0.25)]"
            >
              Ver Vitrine Completa
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-full border border-white/10 hover:border-white/25 hover:bg-white/[0.04] text-zinc-300 hover:text-white text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center"
            >
              Página Inicial
            </Link>
          </div>
        </div>
      </main>
      <Footer
        customFooterData={content.footer}
        customInstitutionalData={content.institutional}
      />
      <ContactModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        customContactData={content.contact}
      />
      <VipModal
        isOpen={vipOpen}
        onClose={() => setVipOpen(false)}
        customVipData={content.vipClub}
      />
    </div>
  );
}
