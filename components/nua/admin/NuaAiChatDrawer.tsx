'use client';

import React from 'react';
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
  activeTab,
  tabs = [],
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
  } = useNuaAiChat({ activeTab, tabs, onUploadNew });

  return (
    <>
      {/* Botão Flutuante Discreto e Elegante */}
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Abrir assistente Nua IA"
          className={`h-9 px-3.5 rounded-full shadow-lg transition duration-200 cursor-pointer border flex items-center gap-2 ${
            isOpen
              ? 'bg-[#1e202c] text-white border-white/20'
              : 'bg-[#171821] hover:bg-white/[0.08] text-zinc-200 border-white/10 hover:border-[#f4a7b9]/40'
          }`}
        >
          <div className="relative flex items-center justify-center text-[#f4a7b9]">
            <MessageCircle className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>

          <span className="text-xs font-medium text-white tracking-wide">
            Nua IA
          </span>

          {isOpen ? (
            <X className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
          ) : (
            <span className="text-[10px] text-zinc-400 font-mono bg-white/[0.06] px-1.5 py-0.2 rounded-full border border-white/[0.08]">
              Assistente
            </span>
          )}
        </motion.button>
      </div>

      {/* Janela do Chat Flutuante */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-20 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[82vh] bg-[#14151b] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-left overscroll-contain"
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#171821]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/30 flex items-center justify-center text-[#f4a7b9]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-white tracking-wide">
                      Nua IA
                    </h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      Online
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-tight">
                    {viewHistoryList ? 'Conversas Anteriores' : 'Ideias, roteiros e estratégias da Nua'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewHistoryList(!viewHistoryList)}
                  title="Histórico de conversas"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewHistoryList
                      ? 'bg-[#f4a7b9]/20 text-[#f4a7b9]'
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
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar overscroll-contain">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[88%] text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'p-3 rounded-2xl rounded-br-none bg-[#f4a7b9]/15 border border-[#f4a7b9]/30 text-zinc-100 shadow-sm whitespace-pre-wrap'
                            : 'p-3.5 rounded-2xl rounded-bl-none bg-[#101116] border border-white/[0.06] text-zinc-200 shadow-sm'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <div className="space-y-2">
                            {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pb-1">
                                {msg.mediaUrls.map((url, uIdx) => {
                                  const isVid =
                                    url.toLowerCase().includes('video') ||
                                    url.toLowerCase().endsWith('.mp4') ||
                                    url.toLowerCase().endsWith('.webm') ||
                                    url.toLowerCase().endsWith('.mov');
                                  return (
                                    <div
                                      key={uIdx}
                                      className="relative w-12 h-14 rounded-lg overflow-hidden bg-black/80 border border-[#f4a7b9]/40 shadow-sm"
                                    >
                                      {isVid ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-[#f4a7b9]">
                                          <Play className="w-4 h-4 fill-[#f4a7b9]" />
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

                  {isLoading && (
                    <div className="flex items-start">
                      <div className="bg-[#101116] border border-white/[0.06] p-2.5 rounded-xl rounded-bl-none flex items-center gap-1.5 text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f4a7b9] animate-bounce [animation-delay:0.4s]" />
                        <span className="text-[11px] text-zinc-400 ml-1.5 font-light">Pensando com carinho...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {messages.length <= 2 && !isLoading && (
                  <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-white/[0.06] bg-[#101116]/50">
                    {QUICK_PROMPTS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip.text)}
                        className="shrink-0 px-2.5 py-1 rounded-full bg-[#101116] hover:bg-white/[0.06] border border-white/[0.06] hover:border-[#f4a7b9]/30 text-[10px] text-zinc-300 hover:text-[#f4a7b9] transition cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-3 border-t border-white/[0.06] bg-[#171821]">
                  {attachedMedia.length > 0 && (
                    <div className="mb-2 p-2 rounded-lg bg-[#101116] border border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                            title="Remover"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                          {item.isVideo && (
                            <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[8px] text-[#f4a7b9] flex items-center gap-0.5 font-mono">
                              <Play className="w-2 h-2 fill-[#f4a7b9]" />
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
                    <div className="mb-2 px-3 py-1.5 rounded-xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/25 flex items-center gap-2 text-[11px] text-[#f4a7b9]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Otimizando suas fotos/vídeos com carinho...</span>
                    </div>
                  )}

                  <div className="flex items-end gap-1.5 bg-[#0e0f14] border border-white/10 focus-within:border-[#f4a7b9] rounded-xl p-1.5 transition">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        attachedMedia.length > 0
                          ? 'Diga o que fazer com as fotos/vídeos (ex: "crie um pack novo")...'
                          : 'Converse com a Nua IA...'
                      }
                      className="flex-1 bg-transparent resize-none text-xs text-white placeholder-zinc-500 focus:outline-none px-2 py-1 max-h-24 custom-scrollbar"
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

                    <button
                      type="button"
                      title="Anexar foto ou vídeo do seu celular / computador"
                      disabled={isUploadingMedia}
                      onClick={() => document.getElementById('nua-chat-file-upload')?.click()}
                      className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer shrink-0 ${
                        attachedMedia.length > 0
                          ? 'text-[#f4a7b9] bg-[#f4a7b9]/15 border border-[#f4a7b9]/30'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      title="Puxar fotos ou vídeos do seu Cofre de Mídias"
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
                          ? 'bg-[#f4a7b9] text-zinc-950 hover:bg-[#ffb8c9] font-semibold'
                          : 'bg-white/[0.04] text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2 px-1 text-[9px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Info className="w-2.5 h-2.5" />
                      <span>Pode consultar, editar e organizar o painel com sua confirmação.</span>
                    </span>
                    <span>Enter para enviar</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ImagePickerModal
        isOpen={galleryPickerOpen}
        library={library}
        albums={albums}
        title="Puxar Mídias do seu Cofre para a Nua IA"
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
