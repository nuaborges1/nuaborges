'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  X,
  Send,
  Plus,
  History,
  Info,
  Paperclip,
  FolderHeart,
  Play,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
} from 'lucide-react';
import { ImagePickerModal } from './ImagePickerModal';
import {
  ChatMessage,
  ParsedTicketProposal,
  NuaAiChatDrawerProps,
  QUICK_PROMPTS,
} from './ai/types';
import {
  FormattedAiMessage,
  parseTicketProposal,
} from './ai/FormattedAiMessage';
import { TicketProposalCard } from './ai/TicketProposalCard';
import { ProposalActionCard } from './ai/ProposalActionCard';
import { AiHistoryList } from './ai/AiHistoryList';
import { useNuaAiChat } from './ai/useNuaAiChat';

export type { ParsedTicketProposal, NuaAiChatDrawerProps, ChatMessage };
export { parseTicketProposal };

export function NuaAiChatDrawer({
  activeTab = 'inicio',
  tabs = [],
  content,
  library = [],
  albums = [],
  onUploadNew,
  onSelectTab,
}: NuaAiChatDrawerProps) {
  const {
    isLocal,
    isOpen,
    setIsOpen,
    viewHistoryList,
    setViewHistoryList,
    galleryPickerOpen,
    setGalleryPickerOpen,
    activeConversationId,
    messages,
    inputMessage,
    setInputMessage,
    attachedMedia,
    setAttachedMedia,
    isUploadingMedia,
    isLoading,
    conversations,
    searchFilter,
    setSearchFilter,
    sentTickets,
    sendingTicketId,
    messagesEndRef,
    textareaRef,
    startNewConversation,
    selectPastConversation,
    handleConfirmSendTicket,
    handleSendMessage,
    handleKeyDown,
    handleFileUpload,
  } = useNuaAiChat({ activeTab, tabs, onUploadNew, content });

  // ─── Ergonomia Anti-Clique Acidental (Trava 1: Recuo Dinâmico por Scroll) ───
  const [isSubmerged, setIsSubmerged] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollTarget = document.getElementById('admin-main-scroll');
    let lastScrollY = scrollTarget ? scrollTarget.scrollTop : window.scrollY;

    const onScroll = () => {
      if (isOpen) return; // Não recolhe se a Nua estiver com o console aberto

      const currentY = scrollTarget ? scrollTarget.scrollTop : window.scrollY;
      if (Math.abs(currentY - lastScrollY) > 8) {
        setIsSubmerged(true);
      }
      lastScrollY = currentY;

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsSubmerged(false);
      }, 900);
    };

    const el: EventTarget = scrollTarget || window;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isOpen]);

  // ─── Trava 4: Tecla ESC para Fechar Rapidamente ───
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [isOpen, setIsOpen]);

  // ─── Motor de Frases Ambientais Serena (Anti-Clippy com 12s de Cooldown) ───
  const [ambientPhrase, setAmbientPhrase] = useState('Nay nos bastidores acompanhando o estúdio.');
  const lastPhraseUpdateRef = useRef<number>(0);

  const targetPhrase = useMemo(() => {
    let hasDraft = false;
    if (typeof window !== 'undefined') {
      try {
        hasDraft = Boolean(localStorage.getItem('nua_content_draft_v1'));
      } catch {}
    }
    const photosCount = content?.gallery?.photos?.length || library.length || 0;

    if (hasDraft) {
      return 'Alterações salvas em rascunho. Prontas quando quiser publicar.';
    }

    switch (activeTab) {
      case 'vitrine':
      case 'gallery':
        return photosCount > 0
          ? `Vitrine com ${photosCount} ensaios ativos. Tudo em harmonia.`
          : 'Vitrine organizada e pronta para novos ensaios.';
      case 'conteudos':
      case 'packs':
        return 'Packs com acesso direto ao cofre configurados.';
      case 'midias':
      case 'biblioteca':
        return 'Acervo de mídias organizado e pronto para seleção.';
      case 'historico':
      case 'pedidos':
        return 'Histórico de pedidos atualizado e protegido.';
      case 'configuracoes':
        return 'Ajustes do estúdio e preferências da Nay.';
      case 'dashboard':
      case 'inicio':
        return 'Bastidores organizados e tudo atualizado.';
      default:
        return 'Nay nos bastidores acompanhando o estúdio.';
    }
  }, [activeTab, content, library.length]);

  useEffect(() => {
    const now = Date.now();
    // Se a última alteração foi há menos de 12 segundos, aguarda para não bombardear a Nua
    if (now - lastPhraseUpdateRef.current < 12000 && lastPhraseUpdateRef.current !== 0) {
      const timer = setTimeout(() => {
        setAmbientPhrase(targetPhrase);
        lastPhraseUpdateRef.current = Date.now();
      }, 12000 - (now - lastPhraseUpdateRef.current));
      return () => clearTimeout(timer);
    } else {
      setAmbientPhrase(targetPhrase);
      lastPhraseUpdateRef.current = now;
    }
  }, [targetPhrase]);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────────────────
          ESTADO 0: DOCK SUBMERSO (Aparece quando a Nua está rolando a página)
          Recua para um discreto filete de 4px no chão da tela. Impossível clicar por engano.
         ───────────────────────────────────────────────────────────────────────────── */}
      {!isOpen && isSubmerged && (
        <div
          role="status"
          aria-label="Assistente Nay recolhida durante a navegação"
          onClick={() => setIsSubmerged(false)}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 h-1.5 w-60 rounded-t-full bg-[#e5b894]/25 hover:bg-[#e5b894]/50 hover:h-2 transition-all duration-300 cursor-pointer shadow-sm"
          title="Clique para reexibir a fita da Nay"
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          ESTADO 1: FITA DE REPOUSO CENTRAL (38px x 660px) COM VIDA ORGÂNICA
          Respiração de luz, levitação de 1.5px e corpo não-clicável para evitar misclicks.
         ───────────────────────────────────────────────────────────────────────────── */}
      {!isOpen && !isSubmerged && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[660px] max-w-[92vw] pointer-events-none print:hidden">
          <div className="nay-levitation">
            <div className="nay-breathing relative h-[38px] rounded-full bg-[#111218]/92 backdrop-blur-2xl border border-[#e5b894]/20 shadow-[0_12px_32px_rgba(0,0,0,0.7)] flex items-center justify-between px-3.5 gap-3 pointer-events-auto select-none">
              
              {/* Zona Esquerda: Identidade Sóbria [ NAY ] com Micro-Pulso de Vida */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-[#e5b894]/10 border border-[#e5b894]/25 text-[10px] font-mono font-semibold tracking-widest text-[#e5b894]">
                  NAY
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 nay-living-pulse"
                  title="Nay online e atenta aos bastidores"
                />
              </div>

              {/* Zona Central: Frase Serena (Passiva / Não Abre a Janela / Permite Seleção) */}
              <div
                className="flex-1 min-w-0 text-center select-text cursor-default"
                title="Observação de bastidor"
              >
                <p className="text-xs text-zinc-300 font-light truncate">
                  {ambientPhrase}
                </p>
              </div>

              {/* Zona Direita: Ação Intencional Deliberada [ Conversar ] */}
              <div className="shrink-0 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  aria-label="Conversar com a Nay"
                  className="h-6 px-3 rounded-full bg-[#e5b894]/15 hover:bg-[#e5b894]/30 border border-[#e5b894]/30 hover:border-[#e5b894]/60 text-[#e5b894] hover:text-white text-[11px] font-medium inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
                >
                  <span>Conversar</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          ESTADO 2: CONSOLE DE BASTIDOR WIDESCREEN (Aberto com Clique Intencional)
          Proporção esticada (920px x 56vh), feixe de pensamento e física de mola fluida.
         ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.19, 1, 0.22, 1] }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[920px] max-w-[94vw] h-[58vh] max-h-[640px] min-h-[440px] rounded-2xl bg-[#111218]/95 backdrop-blur-2xl border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.92)] flex flex-col overflow-hidden text-left overscroll-contain select-none"
          >
            {/* Feixe de Luz de Pensamento (Onda Suave Contínua — Sem Spinners) */}
            {isLoading && (
              <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden z-30 pointer-events-none">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#e5b894] to-transparent nay-thought-beam" />
              </div>
            )}

            {/* Cabeçalho de Estúdio Widescreen */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#14151e]/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#e5b894]/15 border border-[#e5b894]/30 text-[11px] font-mono font-semibold tracking-widest text-[#e5b894]">
                    NAY
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 nay-living-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white tracking-wide">
                    O Bastidor da Nay
                  </h3>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    {viewHistoryList ? 'Histórico de conversas anteriores' : 'Sua mesa de estúdio cuidando de tudo'}
                  </p>
                </div>
              </div>

              {/* Controles da Janela */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setViewHistoryList(!viewHistoryList)}
                  title="Histórico de conversas"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewHistoryList
                      ? 'bg-[#e5b894]/20 text-[#e5b894]'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <History className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={startNewConversation}
                  title="Nova conversa"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-white/10 mx-1" />

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Recolher janela (ESC)"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Fechar"
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo Principal do Console */}
            {viewHistoryList ? (
              <AiHistoryList
                conversations={conversations}
                searchFilter={searchFilter}
                onSearchChange={setSearchFilter}
                activeConversationId={activeConversationId}
                onSelectConversation={selectPastConversation}
                onStartNewConversation={startNewConversation}
              />
            ) : (
              <>
                {/* Trilho de Mensagens com Leitura Confortável */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar overscroll-contain select-text">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'p-3.5 rounded-2xl rounded-br-none bg-[#e5b894]/15 border border-[#e5b894]/30 text-zinc-100 shadow-sm whitespace-pre-wrap'
                            : 'p-4 rounded-2xl rounded-bl-none bg-[#161720]/80 border border-white/[0.07] text-zinc-200 shadow-sm'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <div className="space-y-2">
                            {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                              <div className="flex flex-wrap gap-2 pb-1">
                                {msg.mediaUrls.map((url, uIdx) => {
                                  const isVid =
                                    url.toLowerCase().includes('video') ||
                                    url.toLowerCase().endsWith('.mp4') ||
                                    url.toLowerCase().endsWith('.webm') ||
                                    url.toLowerCase().endsWith('.mov');
                                  return (
                                    <div
                                      key={uIdx}
                                      className="relative w-14 h-16 rounded-xl overflow-hidden bg-black/80 border border-[#e5b894]/40 shadow-sm"
                                    >
                                      {isVid ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-[#e5b894]">
                                          <Play className="w-4 h-4 fill-[#e5b894]" />
                                          <span className="text-[8px] font-mono mt-0.5">VÍDEO</span>
                                        </div>
                                      ) : (
                                        <img
                                          src={url}
                                          alt={`Mídia ${uIdx + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div>{msg.content}</div>
                          </div>
                        ) : (
                          <>
                            <FormattedAiMessage content={msg.content} />
                            {(() => {
                              const ticket = parseTicketProposal(msg.content);
                              if (!ticket) return null;
                              return (
                                <TicketProposalCard
                                  msgId={msg.id}
                                  ticket={ticket}
                                  isSent={!!sentTickets[msg.id]}
                                  isSending={sendingTicketId === msg.id}
                                  onConfirmSend={(id, t) => handleConfirmSendTicket(id, t)}
                                  onAdjustDetails={() => {
                                    setInputMessage('Quero ajustar os seguintes detalhes antes de enviar: ');
                                    textareaRef.current?.focus();
                                  }}
                                />
                              );
                            })()}
                          </>
                        )}

                        {msg.proposal && (
                          <ProposalActionCard proposal={msg.proposal} />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Estado de Pensamento Serena com Micro-Aura */}
                  {isLoading && (
                    <div className="flex items-start">
                      <div className="bg-[#161720]/80 border border-white/[0.07] px-4 py-2.5 rounded-2xl rounded-bl-none flex items-center gap-2 text-zinc-300">
                        <span className="w-2 h-2 rounded-full bg-[#e5b894] nay-living-pulse" />
                        <span className="text-xs font-light tracking-wide text-zinc-300">
                          Nay refletindo nos bastidores...
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Sugestões Rápidas de Início (Sem Sparkles) */}
                {messages.length <= 2 && !isLoading && (
                  <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar border-t border-white/[0.06] bg-[#12131a]/60">
                    {QUICK_PROMPTS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip.text)}
                        className="shrink-0 px-3 py-1 rounded-full bg-[#161722] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#e5b894]/40 text-[11px] text-zinc-300 hover:text-[#e5b894] transition cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Rodapé: Área de Entrada de Mensagens e Mídias */}
                <div className="p-3.5 border-t border-white/[0.06] bg-[#14151e]/95 shrink-0">
                  {attachedMedia.length > 0 && (
                    <div className="mb-2 p-2 rounded-xl bg-[#0e0f14] border border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar">
                      {attachedMedia.map((item, idx) => (
                        <div
                          key={idx}
                          className="relative w-12 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-700 group"
                        >
                          <img
                            src={item.url}
                            alt={`Anexo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setAttachedMedia((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center cursor-pointer shadow-md opacity-90 hover:opacity-100 z-10"
                            title="Remover anexo"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                          {item.isVideo && (
                            <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[8px] text-[#e5b894] flex items-center gap-0.5 font-mono">
                              <Play className="w-2 h-2 fill-[#e5b894]" />
                              <span>VÍDEO</span>
                            </span>
                          )}
                        </div>
                      ))}
                      <span className="text-[10px] text-zinc-400 font-medium pl-1 whitespace-nowrap">
                        {attachedMedia.length} {attachedMedia.length === 1 ? 'mídia selecionada' : 'mídias selecionadas'}
                      </span>
                    </div>
                  )}

                  {isUploadingMedia && (
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#e5b894]/10 border border-[#e5b894]/25 flex items-center gap-2 text-[11px] text-[#e5b894]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Organizando suas mídias com carinho...</span>
                    </div>
                  )}

                  <div className="flex items-end gap-2 bg-[#0e0f14] border border-white/10 focus-within:border-[#e5b894]/60 rounded-xl p-2 transition">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        attachedMedia.length > 0
                          ? 'Diga o que fazer com as fotos/vídeos (ex: "crie um pack novo")...'
                          : 'Converse com a Nay ou peça uma ação no painel...'
                      }
                      className="flex-1 bg-transparent resize-none text-xs leading-relaxed text-white placeholder-zinc-500 focus:outline-none px-2 py-1 max-h-[120px] overflow-y-auto custom-scrollbar"
                    />

                    <input
                      type="file"
                      id="nua-chat-file-upload"
                      className="hidden"
                      multiple
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        handleFileUpload(files);
                        if (e.target) e.target.value = '';
                      }}
                    />

                    <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
                      <button
                        type="button"
                        title="Anexar foto ou vídeo do seu celular ou computador"
                        disabled={isUploadingMedia}
                        onClick={() => document.getElementById('nua-chat-file-upload')?.click()}
                        className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer shrink-0 ${
                          attachedMedia.length > 0
                            ? 'text-[#e5b894] bg-[#e5b894]/15 border border-[#e5b894]/30'
                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Puxar fotos ou vídeos do Acervo de Mídias"
                        disabled={isUploadingMedia}
                        onClick={() => setGalleryPickerOpen(true)}
                        className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <FolderHeart className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={(!inputMessage.trim() && attachedMedia.length === 0) || isLoading || isUploadingMedia}
                        className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer shrink-0 ${
                          (inputMessage.trim() || attachedMedia.length > 0) && !isLoading && !isUploadingMedia
                            ? 'bg-[#e5b894] text-zinc-950 hover:bg-[#ebd2bc] font-semibold shadow-sm'
                            : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 px-1 text-[9px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Info className="w-2.5 h-2.5" />
                      <span>Consulte, edite rascunhos e organize seu painel com segurança.</span>
                    </span>
                    <span>Enter para enviar • ESC para recolher</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Seleção de Fotos e Vídeos da Biblioteca */}
      <ImagePickerModal
        isOpen={galleryPickerOpen}
        library={library}
        albums={albums}
        title="Puxar Mídias do seu Acervo para a Nay"
        backText="Voltar para a conversa"
        onSelect={(url) => {
          const item = library.find((m) => m.url === url || m.objectKey === url);
          setAttachedMedia((prev) => [
            ...prev,
            { id: item?.id, url, objectKey: item?.objectKey, isVideo: Boolean(item?.isVideo), name: item?.name },
          ]);
          setGalleryPickerOpen(false);
          textareaRef.current?.focus();
        }}
        onSelectMultiple={(urls) => {
          const newItems = urls.map((url) => {
            const item = library.find((m) => m.url === url || m.objectKey === url);
            return { id: item?.id, url, objectKey: item?.objectKey, isVideo: Boolean(item?.isVideo), name: item?.name };
          });
          setAttachedMedia((prev) => [...prev, ...newItems]);
          setGalleryPickerOpen(false);
          textareaRef.current?.focus();
        }}
        onUploadNew={(newImg) => {
          if (onUploadNew) onUploadNew(newImg);
          setAttachedMedia((prev) => [
            ...prev,
            { id: newImg.id, url: newImg.url, objectKey: newImg.objectKey, isVideo: Boolean(newImg.isVideo), name: newImg.name },
          ]);
        }}
        onClose={() => setGalleryPickerOpen(false)}
      />
    </>
  );
}
