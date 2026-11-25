/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Camera,
  Film,
  Download,
  Lock,
  MessageCircle,
  Send,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Header } from '@/components/nua/site/Header';
import { Footer } from '@/components/nua/site/Footer';
import { ContactModal } from '@/components/nua/site/ContactModal';
import { PublicBackground } from '@/components/nua/site/PublicBackground';
import { getPublicApiUrl, usePublishedContent } from '@/lib/contentStore';
import {
  PersonalizadoOrder,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';
import { fetchPersonalizadoOrderByToken } from '@/lib/services/nua/personalizadosService';

function PedidoContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const content = usePublishedContent();
  const [contactOpen, setContactOpen] = useState(false);

  const [order, setOrder] = useState<PersonalizadoOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Token do pedido não fornecido. Acesse pelo link enviado.');
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const res = await fetchPersonalizadoOrderByToken(token);
        if (!active) return;
        if (res.success && res.order) {
          setOrder(res.order);
          setError(null);
          if (['entregue', 'cancelado'].includes(res.order.status)) {
            stopPolling();
          }
        } else {
          setError(res.error || 'Pedido não localizado.');
          stopPolling();
        }
      } catch {
        if (active) setError('Erro ao carregar dados do pedido.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 5000);
    return () => {
      active = false;
      stopPolling();
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#90364B] mb-4" />
        <p className="text-zinc-400 text-sm font-light">Carregando dados da sua encomenda...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-between">
        <Header
          onOpenContact={() => setContactOpen(true)}
          customHeaderData={content.header}
        />
        <main className="flex-1 flex items-center justify-center p-4 pt-32 pb-20">
          <div className="max-w-md w-full text-center p-8 rounded-3xl bg-[#09090c] border border-white/10">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
            <h1 className="text-xl font-serif text-white mb-2">Pedido Não Encontrado</h1>
            <p className="text-zinc-400 text-xs mb-6 font-light">{error}</p>
            <Link
              href="/personalizados"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] text-[#F5EEE9] text-xs font-bold uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(67,19,34,0.45)] border border-white/10"
            >
              Ir para o Ateliê
            </Link>
          </div>
        </main>
        <Footer customFooterData={content.footer} customInstitutionalData={content.institutional} customChannelsData={content.channels} />
        <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} customContactData={content.contact} />
      </div>
    );
  }

  const shortId = order.id.replace('ped_', '').slice(-6).toUpperCase();
  const isCancelled = order.status === 'cancelado';
  const rawPaymentStatus = order.payment?.status || (order as any).paymentStatus || 'pending';
  const isPaid = !isCancelled && (rawPaymentStatus === 'approved' || ['em_producao', 'pronto', 'entregue'].includes(order.status));
  const isDelivered = order.status === 'entregue' || order.status === 'pronto';

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#661C30] selection:text-white flex flex-col font-sans">
      <Header
        onOpenContact={() => setContactOpen(true)}
        activeSection="personalizados"
        customHeaderData={content.header}
      />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 sm:pb-28 relative">
        {/* Glow de fundo editorial unificado */}
        <PublicBackground />
        <div className="max-w-3xl mx-auto px-4 sm:px-8">
          
          {/* Header do Pedido */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#661C30]/20 border border-[#7A293D]/40 text-[#90364B] text-[10px] font-semibold tracking-widest uppercase mb-3">
              <Camera className="w-3 h-3 text-[#90364B]" />
              Pedido #PED-{shortId}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-white">
              {isCancelled
                ? 'Encomenda Cancelada'
                : isDelivered
                  ? 'Encomenda Entregue'
                  : isPaid
                    ? 'Encomenda em Produção'
                    : 'Aguardando Pagamento Pix'}
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-2">
              {order.clientName ? (
                <>Olá, <strong className="text-white">{order.clientName}</strong>. Acompanhe abaixo o status do seu conteúdo autoral.</>
              ) : (
                <>Acompanhe abaixo o status da sua encomenda autoral.</>
              )}
            </p>
          </motion.div>

          {/* Card Principal de Status */}
          <div className="rounded-[28px] bg-[#0c0c10] border border-white/[0.08] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-6">
            
            {/* Linha do Tempo de Produção */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.05]">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                  <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${
                    isPaid ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {isPaid ? <CheckCircle2 className="w-4 h-4" /> : '1'}
                  </div>
                  <span className="text-[11px] font-medium text-white block">Pix Confirmado</span>
                  <span className="text-[10px] text-zinc-500">{isPaid ? 'Aprovado' : 'Pendente'}</span>
                </div>

                <div className="space-y-1">
                  <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${
                    order.status === 'em_producao' || order.status === 'pronto' || order.status === 'entregue'
                      ? 'bg-[#661C30]/25 text-[#90364B] border border-[#7A293D]/50'
                      : 'bg-white/[0.04] text-zinc-600 border border-white/[0.06]'
                  }`}>
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium text-white block">Em Produção</span>
                  <span className="text-[10px] text-zinc-500">
                    {order.status === 'em_producao' ? 'Nua gravando' : order.status === 'pronto' || order.status === 'entregue' ? 'Concluído' : 'Aguardando'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${
                    order.status === 'pronto' || order.status === 'entregue'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-white/[0.04] text-zinc-600 border border-white/[0.06]'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium text-white block">Entregue</span>
                  <span className="text-[10px] text-zinc-500">
                    {order.status === 'pronto' || order.status === 'entregue' ? 'Disponível' : 'Em breve'}
                  </span>
                </div>
              </div>
            </div>

            {/* Canal de Entrega Escolhido */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3">
              {order.deliveryChannel === 'telegram' && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-[#229ed9]/15 text-[#229ed9] flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-xs font-medium">Entrega via Telegram VIP</h3>
                    <p className="text-zinc-400 text-[11px] font-light">
                      Os arquivos em resolução máxima serão enviados para <strong>{order.clientContact}</strong>.
                    </p>
                  </div>
                </>
              )}

              {order.deliveryChannel === 'vault' && (
                <>
                  <div className="w-10 h-10 rounded-xl bg-[#661C30]/20 text-[#90364B] flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white text-xs font-medium">Cofre Digital Criptografado no Site</h3>
                    <p className="text-zinc-400 text-[11px] font-light">
                      {isDelivered
                        ? 'Sua entrega está liberada! Abra seu Cofre privativo abaixo ou pelo e-mail de confirmação.'
                        : 'Assim que a Nua concluir a gravação, você receberá o link do seu Cofre privativo por e-mail e em Minha Conta.'}
                    </p>
                    {isDelivered && (
                      <Link
                        href={`/cofre?order=${encodeURIComponent(order.id)}`}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] hover:from-[#661C30] hover:to-[#90364B] px-4 py-2 text-xs font-semibold text-[#F5EEE9] border border-white/10 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Abrir meu Cofre</span>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Arquivos do Cofre (Se houver mídias entregues) */}
            {order.vaultFiles && order.vaultFiles.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <h3 className="text-white text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#90364B]" />
                  <span>Seus Arquivos Exclusivos Estão Prontos!</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {order.vaultFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {file.type === 'video' ? (
                          <Film className="w-4 h-4 text-purple-400 shrink-0" />
                        ) : (
                          <Camera className="w-4 h-4 text-[#90364B] shrink-0" />
                        )}
                        <span className="text-xs text-zinc-200 truncate">{file.name}</span>
                      </div>
                      <a
                        href={
                          file.url.startsWith('http') || file.url.startsWith('/images/')
                            ? file.url
                            : `${getPublicApiUrl()}${file.url.startsWith('/') ? file.url : `/${file.url}`}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors shrink-0 ml-2"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumo da Produção */}
            <div className="space-y-2 pt-4 border-t border-white/[0.08] text-xs">
              <h3 className="text-zinc-400 font-medium uppercase tracking-wider text-[11px] mb-2">
                Itens Contratados:
              </h3>
              <div className="flex justify-between py-1 text-zinc-300">
                <span>Fotos Contratadas:</span>
                <span className="text-white font-medium">{order.photoCount} fotos</span>
              </div>
              <div className="flex justify-between py-1 text-zinc-300">
                <span>Vídeo Personalizado:</span>
                <span className="text-white font-medium">
                  {order.videoDurationMinutes > 0 ? `${order.videoDurationMinutes} Minuto(s)` : 'Sem vídeo'}
                </span>
              </div>
              <div className="flex justify-between py-1 text-zinc-300">
                <span>Dizer seu nome no vídeo:</span>
                <span className="text-white font-medium">{order.mentionName ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex justify-between py-1 text-zinc-300">
                <span>Prioridade Express (24h):</span>
                <span className="text-white font-medium">{order.express24h ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-white/[0.06] text-sm">
                <span className="text-zinc-400">Total Pago:</span>
                <span className="font-mono text-[#90364B] font-bold">{formatCurrencyBrl(order.totalPrice)}</span>
              </div>
            </div>

            {/* Briefing */}
            {order.briefing && (
              <div className="pt-3 border-t border-white/[0.08]">
                <span className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1">
                  Seu Briefing:
                </span>
                <p className="text-xs text-zinc-300 italic font-light bg-black/40 p-3 rounded-xl border border-white/[0.04]">
                  "{order.briefing}"
                </p>
              </div>
            )}

          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/conta?tab=personalizados"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#431322] via-[#661C30] to-[#7A293D] border border-white/10 px-5 py-2.5 text-xs font-semibold text-[#F5EEE9] hover:from-[#661C30] hover:to-[#90364B] transition-colors"
            >
              Acompanhar em Minha Conta
            </Link>
            <Link
              href="/"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              &larr; Voltar para a Página Inicial
            </Link>
          </div>

        </div>
      </main>

      <Footer customFooterData={content.footer} customInstitutionalData={content.institutional} customChannelsData={content.channels} />
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} customContactData={content.contact} />
    </div>
  );
}

export default function PedidoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#90364B]" />
        </div>
      }
    >
      <PedidoContent />
    </Suspense>
  );
}
