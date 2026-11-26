/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useRef } from 'react';
import {
  Camera,
  Film,
  Quote,
  Zap,
  Send,
  Lock,
  Copy,
  CheckCircle2,
  Eye,
  Images,
  Upload,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import {
  PersonalizadoOrder,
  formatCurrencyBrl,
} from '@/lib/personalizadosCanonical';
import { optimizeAndStoreImage } from '@/lib/contentStore';
import { isMediaVideo } from '@/lib/media';
import { updatePersonalizadoOrderAdmin } from '@/lib/services/nua/personalizadosService';
import { ImagePickerModal } from '../ImagePickerModal';

interface PersonalizadosOrderCardProps {
  order: PersonalizadoOrder;
  activeVaultOrderId: string | null;
  setActiveVaultOrderId: (id: string | null) => void;
  vaultFileName: string;
  setVaultFileName: (v: string) => void;
  vaultFileUrl: string;
  setVaultFileUrl: (v: string) => void;
  vaultFileType: 'photo' | 'video';
  setVaultFileType: (v: 'photo' | 'video') => void;
  onUpdateStatus: (orderId: string, status: PersonalizadoOrder['status']) => void;
  onAddVaultFile: (orderId: string) => void;
  onAddVaultFilesBatch?: (
    orderId: string,
    files: { name: string; url: string; type: 'photo' | 'video' }[]
  ) => Promise<void>;
  onRemoveVaultFile?: (orderId: string, fileId: string) => Promise<void>;
  onOpenOrderDetails?: (orderId: string) => void;
  showToast: (msg: string) => void;
  content?: SiteContent;
  onUploadNew?: (img: LibraryImageItem) => void;
}

export function PersonalizadosOrderCard({
  order,
  activeVaultOrderId,
  setActiveVaultOrderId,
  vaultFileName,
  setVaultFileName,
  vaultFileUrl,
  setVaultFileUrl,
  vaultFileType,
  setVaultFileType,
  onUpdateStatus,
  onAddVaultFile,
  onAddVaultFilesBatch,
  onRemoveVaultFile,
  onOpenOrderDetails,
  showToast,
  content,
  onUploadNew,
}: PersonalizadosOrderCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  const shortId = order.id.replace('ped_', '').slice(-6).toUpperCase();
  const telegramUrl = order.clientContact.startsWith('@')
    ? `https://t.me/${order.clientContact.replace('@', '')}`
    : null;

  const vaultFiles = order.vaultFiles || [];

  const handleDirectUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    setUploadingDirect(true);
    try {
      const batch: { name: string; url: string; type: 'photo' | 'video' }[] = [];
      for (let i = 0; i < filesList.length; i++) {
        const stored = await optimizeAndStoreImage(filesList[i], undefined, 'private');
        onUploadNew?.(stored);
        batch.push({
          name: stored.customName || stored.name,
          url: stored.url,
          type: isMediaVideo(stored) ? 'video' : 'photo',
        });
      }
      if (onAddVaultFilesBatch) {
        await onAddVaultFilesBatch(order.id, batch);
      }
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar arquivo para o cofre.');
    } finally {
      setUploadingDirect(false);
      if (directFileInputRef.current) directFileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] hover:border-white/15 transition-all shadow-sm space-y-4">
      {/* Linha Superior do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-zinc-200 font-bold">
            #PED-{shortId}
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-white">{order.clientName}</h3>
            <span className="text-[11px] text-zinc-400 font-light">
              {new Date(order.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Status Badge & Total */}
        <div className="flex items-center gap-3">
          <span
            className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${
              order.status === 'em_producao'
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : order.status === 'pronto'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : order.status === 'entregue'
                ? 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}
          >
            {order.status === 'em_producao'
              ? 'Em Gravação'
              : order.status === 'pronto'
              ? 'Pronto para Entrega'
              : order.status === 'entregue'
              ? 'Entregue'
              : order.status === 'cancelado'
              ? 'Cancelado'
              : 'Aguardando Pagamento'}
          </span>
          <span className="font-serif text-base sm:text-lg font-bold text-[#843C52]">
            {formatCurrencyBrl(order.totalPrice)}
          </span>
        </div>
      </div>

      {/* Detalhes do Pedido & Contato */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] space-y-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-semibold">
            Conteúdo Contratado:
          </span>
          <div className="flex items-center gap-2 text-zinc-200 font-medium">
            <Camera className="w-3.5 h-3.5 text-[#843C52]" />
            <span>{order.photoCount} Fotos Exclusivas 4K</span>
          </div>
          {order.videoDurationMinutes > 0 && (
            <div className="flex items-center gap-2 text-zinc-200 font-medium">
              <Film className="w-3.5 h-3.5 text-purple-400" />
              <span>Vídeo Personalizado: {order.videoDurationMinutes} Minuto(s)</span>
            </div>
          )}
          {order.mentionName && (
            <div className="text-[#843C52] font-medium flex items-center gap-1.5">
              <Quote className="w-3 h-3 text-[#843C52]" />
              <span>Dizer nome do cliente no vídeo (Dedicatória falada)</span>
            </div>
          )}
          {order.express24h && (
            <div className="text-amber-400 font-medium flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Prioridade Express (Prazo 24h)</span>
            </div>
          )}
        </div>

        <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] space-y-2">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-semibold">
            Canal de Entrega do Cliente:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-xs font-medium">
              {order.clientContact}
            </span>
            <span className="text-[10px] uppercase font-bold text-[#843C52] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
              {order.deliveryChannel}
            </span>
          </div>

          {telegramUrl && (
            <div className="pt-0.5">
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#229ed9]/15 hover:bg-[#229ed9]/25 text-[#229ed9] text-xs font-medium transition-colors border border-[#229ed9]/30"
              >
                <Send className="w-3 h-3" />
                <span>Abrir no Telegram</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Briefing do Cliente */}
      {order.briefing && (
        <div className="p-3.5 sm:p-4 rounded-lg bg-[#101116] border-l-2 border-[#843C52] text-xs text-zinc-200 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#843C52] uppercase tracking-widest font-semibold flex items-center gap-1.5">
              <Quote className="w-3 h-3 text-[#843C52]" />
              Briefing &amp; Desejos do Admirador
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(order.briefing || '');
                showToast('Briefing copiado para a área de transferência');
              }}
              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              title="Copiar texto do briefing"
            >
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </button>
          </div>
          <p className="font-serif italic font-normal text-xs sm:text-sm text-zinc-100 leading-relaxed pt-0.5">
            &ldquo;{order.briefing}&rdquo;
          </p>
        </div>
      )}

      {/* Notas Internas de Produção */}
      <div className="p-3 rounded-lg bg-[#101116] border border-white/[0.06] text-xs space-y-1.5">
        <span className="text-[10px] text-zinc-400 uppercase tracking-widest block font-semibold">
          Notas Internas da Produção:
        </span>
        <input
          type="text"
          defaultValue={(order as any).adminNotes || ''}
          placeholder="Adicionar anotação interna (ex: gravar ângulo fechado na sexta)..."
          onBlur={async (e) => {
            const val = e.target.value.trim();
            const prev = String((order as any).adminNotes || '').trim();
            if (val === prev) return;
            const res = await updatePersonalizadoOrderAdmin(order.id, { adminNotes: val } as any);
            if (res?.success) {
              showToast('Anotação interna salva');
            } else {
              showToast(res?.error || 'Não foi possível salvar a anotação.');
            }
          }}
          className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs outline-none focus:border-[#843C52]"
        />
      </div>

      {/* Ciclo de Vida da Encomenda & Cofre */}
      <div className="p-2.5 rounded-lg bg-[#101116] border border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mr-1 shrink-0">Etapa:</span>
          {[
            { id: 'aguardando_pagamento', label: 'Pagamento' },
            { id: 'em_producao', label: 'Em Gravação' },
            { id: 'pronto', label: 'Pronto' },
            { id: 'entregue', label: 'Entregue' },
          ].map((step) => {
            const isActive = order.status === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (
                    (step.id === 'pronto' || step.id === 'entregue') &&
                    order.deliveryChannel === 'vault' &&
                    vaultFiles.length === 0
                  ) {
                    setActiveVaultOrderId(order.id);
                    showToast('Anexe pelo menos 1 arquivo privado no Cofre abaixo antes de finalizar.');
                    return;
                  }
                  onUpdateStatus(order.id, step.id as any);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? step.id === 'pronto'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : step.id === 'em_producao'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : step.id === 'entregue'
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-black/40 text-zinc-500 hover:text-zinc-300 border-white/[0.04]'
                }`}
              >
                {isActive && <CheckCircle2 className="w-3 h-3 text-[#843C52]" />}
                <span>{step.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenOrderDetails && (
            <button
              type="button"
              onClick={() => onOpenOrderDetails(order.id)}
              className="h-8 px-3 rounded-lg bg-[#843C52]/15 hover:bg-[#843C52]/25 text-[#843C52] border border-[#843C52]/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Abrir página dedicada com detalhes completos, briefing, notas e cofre de entrega"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Detalhes</span>
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              setActiveVaultOrderId(activeVaultOrderId === order.id ? null : order.id)
            }
            className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
          >
            <Lock className="w-3.5 h-3.5 text-[#843C52]" />
            <span>
              {activeVaultOrderId === order.id
                ? 'Fechar Cofre'
                : `Anexar Entrega (${vaultFiles.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Painel de Entrega Integrado ao Acervo Central & Upload Seguro */}
      {activeVaultOrderId === order.id && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-[#101116] border border-[#843C52]/30 space-y-3.5 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-white block">
                Cofre de Entrega do Pedido ({vaultFiles.length} arquivo(s))
              </span>
              <span className="text-[11px] text-zinc-400">
                Selecione mídias do seu acervo central ou envie diretamente do computador/celular.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={directFileInputRef}
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm"
                className="hidden"
                onChange={handleDirectUploadFiles}
              />
              <button
                type="button"
                disabled={uploadingDirect}
                onClick={() => directFileInputRef.current?.click()}
                className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5 text-[#843C52]" />
                <span>{uploadingDirect ? 'Enviando...' : 'Enviar do Dispositivo'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="h-8 px-3.5 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Images className="w-3.5 h-3.5" />
                <span>Escolher da Biblioteca</span>
              </button>
            </div>
          </div>

          {/* Lista de arquivos já anexados */}
          {vaultFiles.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
              {vaultFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-2.5 rounded-lg bg-[#0c0d12] border border-white/[0.06] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {file.type === 'video' ? (
                      <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    ) : (
                      <Camera className="w-3.5 h-3.5 text-[#843C52] shrink-0" />
                    )}
                    <span className="text-zinc-200 font-medium truncate">{file.name}</span>
                  </div>
                  {onRemoveVaultFile && (
                    <button
                      type="button"
                      onClick={() => onRemoveVaultFile(order.id, file.id)}
                      className="p-1 rounded-md text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                      title="Remover arquivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Opção avançada colapsada para link manual */}
          <div className="pt-1 border-t border-white/[0.05]">
            <button
              type="button"
              onClick={() => setShowManualLink(!showManualLink)}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <span>Adicionar por link externo manualmente (avançado)</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showManualLink ? 'rotate-180' : ''}`}
              />
            </button>

            {showManualLink && (
              <div className="mt-2.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nome (Ex: Foto_1_Nua.jpg)"
                    value={vaultFileName}
                    onChange={(e) => setVaultFileName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52]"
                  />
                  <input
                    type="text"
                    placeholder="Link do arquivo"
                    value={vaultFileUrl}
                    onChange={(e) => setVaultFileUrl(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52]"
                  />
                  <select
                    value={vaultFileType}
                    onChange={(e) => setVaultFileType(e.target.value as any)}
                    className="px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52]"
                  >
                    <option value="photo">Foto</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onAddVaultFile(order.id)}
                    className="h-8 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium cursor-pointer"
                  >
                    Salvar Link Manual
                  </button>
                </div>
              </div>
            )}
          </div>

          <ImagePickerModal
            isOpen={pickerOpen}
            library={content?.library || []}
            albums={content?.albums || []}
            title={`Anexar Entrega ao Pedido #PED-${shortId}`}
            subtitle="Escolha as fotos e vídeos exclusivos para liberar no cofre deste cliente."
            backText="Voltar ao Pedido"
            allowedMediaType="all"
            selectionMode="multiple"
            uploadVisibility="private"
            uploadDestinationLabel={`a entrega privada do pedido #PED-${shortId}`}
            confirmActionLabel="Adicionar à entrega privada"
            onSelect={(url, item) => {
              if (onAddVaultFilesBatch) {
                onAddVaultFilesBatch(order.id, [
                  {
                    name: item?.customName || item?.name || 'Arquivo Exclusivo',
                    url,
                    type: item && isMediaVideo(item) ? 'video' : 'photo',
                  },
                ]);
              }
            }}
            onSelectMultiple={(urls, items) => {
              if (onAddVaultFilesBatch) {
                const batch = urls.map((url, idx) => {
                  const matched =
                    items?.[idx] || (content?.library || []).find((m) => m.url === url);
                  return {
                    name: matched?.customName || matched?.name || `Arquivo #${idx + 1}`,
                    url,
                    type: (matched && isMediaVideo(matched) ? 'video' : 'photo') as
                      | 'photo'
                      | 'video',
                  };
                });
                onAddVaultFilesBatch(order.id, batch);
              }
            }}
            onUploadNew={onUploadNew}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
