'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  RefreshCw,
  Lightbulb,
  Bot,
  Search,
  Volume2,
  Bell,
  X,
  MessageSquarePlus,
  Plus,
} from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { RequestItem } from './requests/types';
import { CelebrationModal } from './requests/CelebrationModal';
import { ManualRequestModal } from './requests/ManualRequestModal';
import { RequestCard } from './requests/RequestCard';
import { useClientRequests } from './requests/useClientRequests';

export { FormattedText } from './requests/FormattedText';
export type { RequestItem } from './requests/types';

export function ClientRequestsEditor() {
  const {
    requests,
    loading,
    celebrationModal,
    setCelebrationModal,
    openRequestId,
    setOpenRequestId,
    replyText,
    setReplyText,
    sendingReply,
    toastMessage,
    setToastMessage,
    audioFeedback,
    isLocal,
    showManualModal,
    setShowManualModal,
    manualTitle,
    setManualTitle,
    manualText,
    setManualText,
    manualCategory,
    setManualCategory,
    submittingManual,
    handleTestAudio,
    handleOpenNuaAi,
    handleSendManualRequest,
    handleSendReply,
    fetchRequests,
  } = useClientRequests();

  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'review' | 'done'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useScrollLock(Boolean(celebrationModal || showManualModal));

  // Filtragem dos pedidos
  const filteredRequests = requests.filter((req) => {
    if (statusFilter === 'open') {
      if (!['new', 'analyzing', 'planned'].includes(req.status)) return false;
    } else if (statusFilter === 'in_progress') {
      if (req.status !== 'in_progress') return false;
    } else if (statusFilter === 'review') {
      if (req.status !== 'review') return false;
    } else if (statusFilter === 'done') {
      if (!['done', 'rejected'].includes(req.status)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchSummary = (req.summary || '').toLowerCase().includes(q);
      const matchCategory = (req.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchCategory) return false;
    }

    return true;
  });

  const countOpen = requests.filter((r) => ['new', 'analyzing', 'planned'].includes(r.status)).length;
  const countProgress = requests.filter((r) => r.status === 'in_progress').length;
  const countReview = requests.filter((r) => r.status === 'review').length;
  const countDone = requests.filter((r) => r.status === 'done').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* MODAL DE CELEBRAÇÃO QUANDO O PHILIPPE CONCLUI UMA SOLICITAÇÃO */}
      <CelebrationModal
        modalData={celebrationModal}
        onClose={() => setCelebrationModal(null)}
      />

      {/* TOAST FLUTUANTE DE NOTIFICAÇÃO EM TEMPO REAL */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-zinc-900/95 border border-[#f4a7b9]/40 text-white text-xs shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-md"
          >
            <div className="p-2 rounded-xl bg-[#f4a7b9]/20 text-[#f4a7b9] shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <p className="flex-1 leading-relaxed text-zinc-200">{toastMessage}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CABEÇALHO DO PAINEL DE PEDIDOS ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800/80">
        <div className="space-y-1">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-[0.2em] uppercase flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Acompanhamento & Atendimento
          </span>
          <h2 className="text-xl sm:text-2xl font-serif text-white">
            Meus Pedidos ao Desenvolvedor
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm font-light">
            Consulte o status em tempo real, veja as respostas do Philippe e acompanhe cada melhoria do seu site.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTestAudio}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-medium transition-all cursor-pointer shrink-0 border ${
            audioFeedback
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Clique para testar se os avisos sonoros de atualizações de pedidos estão funcionando no seu aparelho"
        >
          <Volume2 className="w-3.5 h-3.5 text-[#f4a7b9]" />
          <span>{audioFeedback ? 'Som testado ' : 'Avisos sonoros ativos'}</span>
        </button>
      </div>

      {/* ─── BANNER: COMO ENVIAR PEDIDOS AO DESENVOLVEDOR ─────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#f4a7b9]/15 via-zinc-900/80 to-purple-500/10 border border-[#f4a7b9]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg shadow-[#f4a7b9]/5">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="p-2.5 rounded-2xl bg-[#f4a7b9]/20 text-[#f4a7b9] shrink-0 mt-0.5 border border-[#f4a7b9]/30">
            {isLocal ? <Bot className="w-5 h-5" /> : <MessageSquarePlus className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">
              Precisa de uma nova alteração ou tem uma ideia para o site?
            </h4>
            <p className="text-xs text-zinc-300 leading-relaxed font-light">
              {isLocal ? (
                <>
                  Envie sua solicitação conversando com a <strong>Nua IA</strong> pelo chat assistente.
                  Ela organiza os detalhes do que você precisa e, com a sua confirmação, encaminha o pedido para o Philippe iniciar a implementação.
                </>
              ) : (
                <>
                  Envie sua solicitação diretamente para o Philippe acompanhar, responder e implementar no seu site oficial.
                </>
              )}
            </p>
          </div>
        </div>

        {isLocal ? (
          <button
            type="button"
            onClick={handleOpenNuaAi}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer shrink-0"
          >
            <Bot className="w-4 h-4" />
            <span>Abrir Nua IA</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#fabcc9] text-zinc-950 font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Solicitação</span>
          </button>
        )}
      </div>

      {/* ─── MODAL DE NOVA SOLICITAÇÃO ─── */}
      <ManualRequestModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSubmit={handleSendManualRequest}
        title={manualTitle}
        setTitle={setManualTitle}
        category={manualCategory}
        setCategory={setManualCategory}
        text={manualText}
        setText={setManualText}
        submitting={submittingManual}
      />

      {/* ─── FILTROS DE STATUS E BARRA DE BUSCA ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todos ({requests.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('open')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'open'
                ? 'bg-sky-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Em Fila / Análise</span>
            {countOpen > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 text-[10px] flex items-center justify-center font-mono">
                {countOpen}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'in_progress'
                ? 'bg-amber-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Em Desenvolvimento</span>
            {countProgress > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] flex items-center justify-center font-mono">
                {countProgress}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('review')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'review'
                ? 'bg-[#f4a7b9] text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Revisão</span>
            {countReview > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#f4a7b9]/20 text-[#f4a7b9] text-[10px] flex items-center justify-center font-mono">
                {countReview}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('done')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'done'
                ? 'bg-emerald-400 text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            <span>Concluídos</span>
            {countDone > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-center font-mono">
                {countDone}
              </span>
            )}
          </button>
        </div>

        {/* Busca e Atualizar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar nos pedidos..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#f4a7b9]/50"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchRequests()}
            title="Atualizar lista agora"
            className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── LISTA DOS PEDIDOS REGISTRADOS ────────────────────────────────────── */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="p-12 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 text-[#f4a7b9] flex items-center justify-center mx-auto">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-medium text-zinc-200">
              {searchQuery ? 'Nenhum pedido encontrado para esta busca' : 'Nenhum pedido nesta categoria'}
            </h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'Tente buscar com outras palavras ou limpe o campo de busca.'
                : 'Quando você registrar uma solicitação com a Nua IA, o andamento e as respostas do Philippe aparecerão aqui.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              isOpen={openRequestId === item.id}
              onToggle={() => setOpenRequestId(openRequestId === item.id ? null : item.id)}
              replyText={replyText[item.id] || ''}
              onReplyTextChange={(val) => setReplyText((prev) => ({ ...prev, [item.id]: val }))}
              onSendReply={() => handleSendReply(item.id)}
              isSendingReply={sendingReply === item.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default ClientRequestsEditor;
