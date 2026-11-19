/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Film,
  Layers,
  KeyRound,
  Play,
  User,
} from 'lucide-react';
import { PixIcon } from '@/components/nua/site/Icons';
import { AvulsoProductItem } from '@/lib/types';
import { formatBrlPrice } from '@/lib/formatters';
import { fetchCustomerSession, fetchLibrary, NUA_ID_SESSION_EVENT } from '@/lib/nuaIdClient';

interface AvulsoPurchaseCardProps {
  product: AvulsoProductItem;
  onOpenCheckout: () => void;
}

export function AvulsoPurchaseCard({ product, onOpenCheckout }: AvulsoPurchaseCardProps) {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenBox, setShowTokenBox] = useState(false);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkOwnership = async () => {
      try {
        const sess = await fetchCustomerSession();
        if (!mounted || !sess.ok || !sess.data?.authenticated) {
          if (mounted) setAlreadyOwned(false);
          return;
        }
        const lib = await fetchLibrary();
        if (!mounted || !lib.ok || !Array.isArray(lib.data?.items)) return;
        const targetSlug = (product.slug || product.id?.replace(/^avulso-/, '') || '').toLowerCase();
        const owned = lib.data.items.some(
          (i) => i.status === 'active' && String(i.resourceId || '').toLowerCase() === targetSlug
        );
        setAlreadyOwned(owned);
      } catch {}
    };
    checkOwnership();
    window.addEventListener(NUA_ID_SESSION_EVENT, checkOwnership);
    return () => {
      mounted = false;
      window.removeEventListener(NUA_ID_SESSION_EVENT, checkOwnership);
    };
  }, [product.slug, product.id]);

  const handleAccessWithToken = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;
    router.push(`/assistir/${product.slug}?token=${encodeURIComponent(clean)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="lg:col-span-5 space-y-6"
    >
      <div>
        <span className="text-[#90364B] text-[11px] font-semibold tracking-[0.28em] uppercase block mb-2">
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
        {alreadyOwned ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Esta obra já está liberada na sua Biblioteca.</span>
            </div>
            <Link
              href={`/assistir/${encodeURIComponent(product.slug || product.id.replace(/^avulso-/, ''))}`}
              className="w-full min-h-[52px] px-8 py-3.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10"
            >
              <Play className="w-4 h-4" />
              <span>Assistir Obra Agora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/conta?tab=biblioteca"
              className="w-full min-h-[44px] px-5 py-2.5 rounded-full border border-white/12 bg-white/[0.03] hover:bg-white/[0.07] text-zinc-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-[#90364B]" />
              <span>Abrir Minha Biblioteca</span>
            </Link>
          </div>
        ) : (
        <>
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
              Pagamento Único · Minha Conta
            </span>
            <span className="font-serif text-3xl sm:text-4xl text-[#90364B] font-semibold tracking-tight">
              R$ {formatBrlPrice(product.price)}
            </span>
          </div>
          <span className="text-xs text-zinc-400 bg-white/[0.04] px-3 py-1 rounded-full border border-white/[0.08] font-light">
            Sem recorrência
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenCheckout}
          className="w-full min-h-[52px] px-8 py-3.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_4px_24px_rgba(67,19,34,0.45)] border border-white/10 active:scale-[0.98]"
        >
          <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{product.buttonText || 'QUERO VER AGORA'}</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-zinc-400 font-light">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#90364B]" /> Liberação Imediata
          </span>
          <span className="flex items-center gap-1.5">
            <PixIcon className="w-3 h-3 text-[#90364B]" /> Pagamento via PIX
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#90364B]" /> Extrato 100% Discreto
          </span>
          <span className="flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-[#90364B]" /> Qualidade 4K UHD
          </span>
        </div>

        {/* Acesso para quem já comprou */}
        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          <Link
            href="/conta?tab=biblioteca"
            className="w-full text-center text-xs text-zinc-300 hover:text-[#F5EEE9] transition-colors py-1.5 flex items-center justify-center gap-1.5 font-light"
          >
            <User className="w-3.5 h-3.5 text-[#90364B]" />
            <span>Já comprou? Entrar em Minha Conta</span>
          </Link>
          {!showTokenBox ? (
            <button
              type="button"
              onClick={() => setShowTokenBox(true)}
              className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors py-0.5 flex items-center justify-center gap-1.5 cursor-pointer font-light"
            >
              <KeyRound className="w-3 h-3 text-zinc-500" />
              <span>Ou acessar com token de compra anterior</span>
            </button>
          ) : (
            <form onSubmit={handleAccessWithToken} className="space-y-2 pt-1">
              <label className="text-[11px] text-zinc-300 font-medium flex items-center justify-between">
                <span>Insira seu Token de Acesso:</span>
                <button
                  type="button"
                  onClick={() => setShowTokenBox(false)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  Fechar
                </button>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Cole seu token (ex: ptok_...)"
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-white text-base sm:text-xs font-mono outline-none focus:border-[#90364B]"
                />
                <button
                  type="submit"
                  disabled={!tokenInput.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer disabled:opacity-40 border border-white/10"
                >
                  Acessar
                </button>
              </div>
            </form>
          )}
        </div>
        </>
        )}
      </div>

      {/* Ficha Técnica Editorial */}
      {product.technicalDetails && (
        <div className="p-6 rounded-[24px] bg-[#060608] border border-white/[0.06] space-y-3.5">
          <h3 className="font-serif text-sm text-zinc-200 font-medium tracking-wide flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#90364B]" />
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
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#90364B] block">
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
