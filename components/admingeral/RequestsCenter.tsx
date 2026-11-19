/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Inbox, CheckCircle2 } from 'lucide-react';
import { Req } from './requests/types';
import { RequestsHud } from './requests/RequestsHud';
import { NewRequestModal } from './requests/NewRequestModal';
import { RequestTriageCard } from './requests/RequestTriageCard';
import { useAdminRequests } from './requests/useAdminRequests';

export { FormattedText } from './requests/FormattedText';
export type { Req } from './requests/types';

export default function RequestsCenter({
  fetchFromApi,
  targetRequestId,
  onResetTarget,
}: {
  fetchFromApi: (path: string, options?: RequestInit) => Promise<Response>;
  targetRequestId?: string | null;
  onResetTarget?: () => void;
}) {
  const {
    items,
    geminiOk,
    busy,
    openId,
    setOpenId,
    replyText,
    setReplyText,
    error,
    copiedId,
    toastMessage,
    newRequestModal,
    setNewRequestModal,
    soundActive,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    showToast,
    handleTestSound,
    load,
    post,
    handleCopyPrompt,
    metrics,
    filteredItems,
  } = useAdminRequests({
    fetchFromApi,
    targetRequestId,
    onResetTarget,
  });

  return (
    <div className="space-y-6">
      {/* Toast de Confirmação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-zinc-950/95 border border-[#843C52]/50 shadow-2xl text-white text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#843C52] shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* MODAL DE ALERTA QUANDO A CLIENTE ENVIA NOVA SOLICITAÇÃO */}
      <NewRequestModal
        modalData={newRequestModal}
        onClose={() => setNewRequestModal(null)}
        onOpenAndCopy={(req, e) => {
          setOpenId(req.id);
          handleCopyPrompt(req, e);
          setNewRequestModal(null);
        }}
        onOpenDetails={(req) => {
          setOpenId(req.id);
          setNewRequestModal(null);
        }}
      />

      {/* 1. EXECUTIVE HUD */}
      <RequestsHud
        metrics={metrics}
        geminiOk={geminiOk}
        busy={busy}
        soundActive={soundActive}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onTestSound={handleTestSound}
        onReload={load}
        error={error}
      />

      {/* 2. LISTA OPERACIONAL DE SOLICITAÇÕES */}
      {filteredItems.length === 0 ? (
        <div className="p-12 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 text-center space-y-3">
          <Inbox className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-300">Nenhuma solicitação encontrada</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto font-light">
            {items.length === 0
              ? 'A cliente ainda não enviou solicitações pelo painel dela.'
              : 'Nenhum resultado corresponde ao filtro atual.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredItems.map((req) => (
            <RequestTriageCard
              key={req.id}
              req={req}
              isOpen={openId === req.id}
              onToggle={() => setOpenId(openId === req.id ? null : req.id)}
              isCopied={copiedId === req.id}
              onCopyPrompt={(e) => handleCopyPrompt(req, e)}
              busy={busy}
              onPostAction={post}
              replyText={replyText[req.id] || ''}
              onReplyTextChange={(val) => setReplyText((prev) => ({ ...prev, [req.id]: val }))}
              onSendReply={async () => {
                await post({
                  action: 'message',
                  id: req.id,
                  text: replyText[req.id],
                  role: 'admin',
                });
                setReplyText((prev) => ({ ...prev, [req.id]: '' }));
                showToast('Mensagem enviada para a cliente com sucesso!');
              }}
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
