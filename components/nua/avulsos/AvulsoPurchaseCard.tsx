'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Film,
  Layers,
} from 'lucide-react';
import { PixIcon } from '@/components/nua/site/Icons';
import { AvulsoProductItem } from '@/lib/types';

interface AvulsoPurchaseCardProps {
  product: AvulsoProductItem;
  onOpenCheckout: () => void;
}

export function AvulsoPurchaseCard({ product, onOpenCheckout }: AvulsoPurchaseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="lg:col-span-5 space-y-6"
    >
      <div>
        <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-2">
          {product.badge || 'PRODUÇÃO AUTORAL SOB DEMANDA'}
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-white tracking-tight leading-tight">
          {product.title}
        </h1>
        <p className="text-zinc-400 text-sm font-light mt-3 leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* Caixa de Compra / Preço */}
      <div className="p-6 rounded-[24px] bg-[#09090c] border border-white/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.8)] space-y-5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
              Acesso Vitalício Único
            </span>
            <span className="font-serif text-3xl sm:text-4xl text-[#f4a7b9] font-semibold tracking-tight">
              {product.price}
            </span>
          </div>
          <span className="text-xs text-zinc-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08] font-light">
            Sem recorrência
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenCheckout}
          className="w-full min-h-[52px] px-8 py-3.5 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-black text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_28px_rgba(244,167,185,0.3)] active:scale-[0.98]"
        >
          <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{product.buttonText || 'QUERO VER AGORA'}</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-zinc-400 font-light">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#f4a7b9]" /> Liberação Imediata
          </span>
          <span className="flex items-center gap-1.5">
            <PixIcon className="w-3 h-3 text-[#f4a7b9]" /> Pagamento via PIX
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#f4a7b9]" /> Extrato 100% Discreto
          </span>
          <span className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#f4a7b9]" /> Qualidade 4K UHD
          </span>
        </div>
      </div>

      {/* Ficha Técnica Editorial */}
      {product.technicalDetails && (
        <div className="p-6 rounded-[24px] bg-[#060608] border border-white/[0.06] space-y-3.5">
          <h3 className="font-serif text-sm text-zinc-200 font-medium tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#f4a7b9]" />
            <span>Ficha Técnica da Produção</span>
          </h3>

          <div className="space-y-2 text-xs font-light divide-y divide-white/[0.04]">
            {product.technicalDetails.format && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-500">Formato</span>
                <span className="text-zinc-300 font-mono">{product.technicalDetails.format}</span>
              </div>
            )}
            {product.technicalDetails.mediaCount && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-500">Conteúdo</span>
                <span className="text-zinc-300">{product.technicalDetails.mediaCount}</span>
              </div>
            )}
            {product.technicalDetails.audio && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-500">Áudio</span>
                <span className="text-zinc-300">{product.technicalDetails.audio}</span>
              </div>
            )}
            {product.technicalDetails.ambient && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-500">Conceito</span>
                <span className="text-zinc-300">{product.technicalDetails.ambient}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sinopse Autoral Aprofundada */}
      {product.longDescription && (
        <div className="p-6 rounded-[24px] bg-[#060608] border border-white/[0.06] space-y-2.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#f4a7b9] block">
            NOTAS CURATORIAIS
          </span>
          <p className="text-zinc-300 text-xs sm:text-[13px] font-light leading-relaxed italic">
            "{product.longDescription}"
          </p>
          <span className="text-zinc-500 text-[11px] block text-right font-serif">
            — Nua Borges ♡
          </span>
        </div>
      )}
    </motion.div>
  );
}
