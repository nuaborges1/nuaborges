/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Camera,
  Film,
  Quote,
  Zap,
  CheckCircle2,
  ExternalLink,
  Copy,
  Upload,
  Trash2,
  Plus,
  Save,
  Lock,
  Images,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { ManualRefundModal } from './ManualRefundModal';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import {
  PersonalizadoOrder,
  formatCurrencyBrl,
  VaultMediaFile,
} from '@/lib/personalizadosCanonical';
import { optimizeAndStoreImage } from '@/lib/contentStore';
import { isMediaVideo, resolveMediaUrl } from '@/lib/media';
import { ImagePickerModal } from './ImagePickerModal';
import { PageHeader } from './ui/AdminPrimitives';

interface PersonalizadoOrderPageProps {
  order: PersonalizadoOrder;
  content?: SiteContent;
  onUploadNew?: (img: LibraryImageItem) => void;
  onUpdateOrder: (
    updatedOrder: PersonalizadoOrder
  ) => Promise<boolean | { success: boolean; order?: PersonalizadoOrder; error?: string }>;
  onBack: () => void;
}

export function PersonalizadoOrderPage({
  order: initialOrder,
  content,
  onUploadNew,
  onUpdateOrder,
  onBack,
}: PersonalizadoOrderPageProps) {
  const [order, setOrder] = useState<PersonalizadoOrder>(initialOrder);
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form de anexo no cofre de entrega
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadingDirect, setUploadingDirect] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [vaultFileName, setVaultFileName] = useState('');
  const [vaultFileUrl, setVaultFileUrl] = useState('');
  const [vaultFileType, setVaultFileType] = useState<'photo' | 'video'>('photo');
  const directFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const normalizeUpdateResult = (
    res: boolean | { success: boolean; order?: PersonalizadoOrder; error?: string }
  ) => {
    if (typeof res === 'boolean') return { success: res, order: undefined, error: undefined };
    return res;
  };

  const STATUS_LABELS: Record<PersonalizadoOrder['status'], string> = {
    aguardando_pagamento: 'Aguardando pagamento',
    em_producao: 'Em gravação / produção',
    pronto: 'Pronto para entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  };

  const handleStatusChange = async (newStatus: PersonalizadoOrder['status']) => {
    setIsUpdatingStatus(true);
    const updated = {
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    const res = normalizeUpdateResult(await onUpdateOrder(updated));
    setIsUpdatingStatus(false);
    if (res.success) {
      setOrder(res.order || updated);
      showToast(`Situação atualizada para "${STATUS_LABELS[newStatus] || 'Atualizada'}".`);
    } else {
      showToast(res.error || 'Não foi possível atualizar a situação. Tente novamente em instantes.', 'error');
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const updated = {
      ...order,
      adminNotes,
      updatedAt: new Date().toISOString(),
    };
    const res = normalizeUpdateResult(await onUpdateOrder(updated));
    setIsSavingNotes(false);
    if (res.success) {
      setOrder(res.order || updated);
      showToast('Anotações salvas com sucesso.');
    } else {
      showToast(res.error || 'Falha ao salvar anotações.', 'error');
    }
  };

  const appendVaultFilesBatch = async (
    files: { name: string; url: string; type: 'photo' | 'video' }[]
  ): Promise<boolean> => {
    if (!files || files.length === 0) return false;
    const now = Date.now();
    const newEntries: VaultMediaFile[] = files.map((f, idx) => ({
      id: `vfile_${now}_${idx}`,
      name: f.name || (f.type === 'photo' ? 'Foto Exclusiva 4K' : 'Vídeo Personalizado 4K'),
      url: f.url,
      type: f.type,
      uploadedAt: new Date().toISOString(),
    }));

    const currentFiles = Array.isArray(order.vaultFiles) ? order.vaultFiles : [];
    const updated: PersonalizadoOrder = {
      ...order,
      status:
        order.status === 'entregue'
          ? 'entregue'
          : order.status === 'aguardando_pagamento'
          ? 'aguardando_pagamento'
          : 'pronto',
      vaultFiles: [...currentFiles, ...newEntries],
      updatedAt: new Date().toISOString(),
    };

    const res = normalizeUpdateResult(await onUpdateOrder(updated));
    if (res.success) {
      setOrder(res.order || updated);
      showToast(`${newEntries.length} arquivo(s) adicionado(s) ao cofre do cliente!`);
      return true;
    } else {
      showToast(res.error || 'Erro ao salvar arquivo no cofre.', 'error');
      return false;
    }
  };

  const handleDirectUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    setUploadingDirect(true);
    try {
      const batch: { name: string; url: string; type: 'photo' | 'video' }[] = [];
      for (let i = 0; i < filesList.length; i++) {
        // Upload privado exclusivo do pedido (não adiciona à biblioteca pública do site)
        const stored = await optimizeAndStoreImage(filesList[i], undefined, 'private');
        batch.push({
          name: stored.customName || stored.name,
          url: stored.url,
          type: isMediaVideo(stored) ? 'video' : 'photo',
        });
      }
      await appendVaultFilesBatch(batch);
    } catch (err: any) {
      showToast(err?.message || 'Erro ao enviar arquivo.');
    } finally {
      setUploadingDirect(false);
      if (directFileInputRef.current) directFileInputRef.current.value = '';
    }
  };

  const handleAddVaultFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultFileUrl.trim()) {
      showToast('Informe o caminho privado do arquivo (/media/private/...).', 'error');
      return;
    }

    const saved = await appendVaultFilesBatch([
      {
        name:
          vaultFileName.trim() ||
          (vaultFileType === 'photo' ? 'Foto Exclusiva 4K' : 'Vídeo Personalizado 4K'),
        url: vaultFileUrl.trim(),
        type: vaultFileType,
      },
    ]);
    if (saved) {
      setVaultFileName('');
      setVaultFileUrl('');
    }
  };

  const handleRemoveVaultFile = async (fileId: string) => {
    const currentFiles = Array.isArray(order.vaultFiles) ? order.vaultFiles : [];
    const updated = {
      ...order,
      vaultFiles: currentFiles.filter((f) => f.id !== fileId),
      updatedAt: new Date().toISOString(),
    };

    const res = normalizeUpdateResult(await onUpdateOrder(updated));
    if (res.success) {
      setOrder(res.order || updated);
      showToast('Arquivo removido do cofre.');
    } else {
      showToast(res.error || 'Não foi possível remover o arquivo do cofre.', 'error');
    }
  };

  const shortId = order.id.replace('ped_', '').slice(-6).toUpperCase();
  const publicSiteBase = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' && !window.location.hostname.startsWith('admin.')
      ? window.location.origin
      : 'https://nuaborges.com.br')
  ).replace(/\/$/, '');
  const clientPublicUrl = `${publicSiteBase}/personalizados/pedido?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.publicToken || order.id)}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clientPublicUrl);
      showToast('Link do cofre copiado para a área de transferência!');
    }
  };

  return (
    <div className="space-y-5 select-none text-white w-full">
      <ManualRefundModal
        isOpen={refundModalOpen}
        orderId={order.id}
        modality="personalizado"
        onClose={() => setRefundModalOpen(false)}
        onRefundCompleted={() => {
          setOrder((prev) => ({
            ...prev,
            status: prev.status === 'entregue' ? 'entregue' : 'cancelado',
            payment: { ...(prev.payment || { method: 'pix', amount: prev.totalPrice }), status: 'refunded' },
          }));
          showToast('Estorno confirmado no Mercado Pago.');
        }}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#14151c] border text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl ${
            toast.type === 'error'
              ? 'border-rose-500/40 text-rose-300'
              : 'border-emerald-500/40 text-emerald-400'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 shrink-0 ${toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}
          />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Padronizado do Pedido */}
      <PageHeader
        backAction={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Fila de Personalizados</span>
          </button>
        }
        title={order.clientName}
        subtitle={`#PED-${shortId} · Contato: ${order.clientContact} (${order.deliveryChannel}) · Criado em ${new Date(
          order.createdAt
        ).toLocaleString('pt-BR')}`}
        helpId="personalizados_entrega"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {order.payment?.status === 'approved' && (
              <button
                type="button"
                onClick={() => setRefundModalOpen(true)}
                className="h-9 px-3.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/35 text-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Estornar pagamento</span>
              </button>
            )}
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold font-mono">
              Situação:
            </span>
            <select
              value={order.status}
              disabled={isUpdatingStatus}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider border outline-none cursor-pointer ${
                order.status === 'em_producao'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : order.status === 'pronto'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : order.status === 'entregue'
                  ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              <option value="aguardando_pagamento">Aguardando Pagamento</option>
              <option value="em_producao">Em Gravação / Produção</option>
              <option value="pronto">Pronto para Entrega</option>
              <option value="entregue">Entregue</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        }
      />

      {/* Grid de 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coluna 1: O Que Foi Contratado & Briefing */}
        <div className="space-y-5">
          <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-3.5">
            <h3 className="text-xs font-semibold text-white tracking-wide pb-2 border-b border-white/[0.06]">
              Especificações da Produção Sob Medida
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
                <span className="text-xs text-zinc-300 flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-[#843C52]" />
                  <span>Ensaio Fotográfico</span>
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  {order.photoCount} Fotos Exclusivas
                </span>
              </div>

              {order.videoDurationMinutes > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#101116] border border-white/[0.06]">
                  <span className="text-xs text-zinc-300 flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-purple-400" />
                    <span>Gravação em Vídeo</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-purple-300">
                    {order.videoDurationMinutes} Minuto(s) 4K
                  </span>
                </div>
              )}

              {order.mentionName && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[#843C52]/10 border border-[#843C52]/20">
                  <span className="text-xs text-[#843C52] flex items-center gap-2">
                    <Quote className="w-3.5 h-3.5" />
                    <span>Dedicatória / Dizer Nome</span>
                  </span>
                  <span className="text-xs font-bold text-[#843C52]">Incluso</span>
                </div>
              )}

              {order.express24h && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs text-amber-300 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Entrega Prioritária 24h</span>
                  </span>
                  <span className="text-xs font-bold text-amber-300">Urgência Ativa</span>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-2 border-t border-white/[0.06]">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider font-mono">
                  Valor Total Contratado:
                </span>
                <span className="text-xl font-bold text-[#843C52] font-mono">
                  {formatCurrencyBrl(order.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-white tracking-wide pb-2 border-b border-white/[0.06]">
              Briefing &amp; Roteiro Solicitado pelo Cliente
            </h3>

            <div className="p-3.5 rounded-lg bg-[#101116] border border-white/[0.06] text-xs text-zinc-200 leading-relaxed font-light whitespace-pre-wrap">
              {order.briefing
                ? order.briefing
                : 'Nenhuma instrução especial registrada pelo cliente.'}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold text-white tracking-wide">
                Anotações Internas Privadas
              </h3>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="text-[11px] text-[#843C52] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>Salvar Nota</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full p-3 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52] resize-none"
              placeholder="Escreva anotações que só você verá (ex: 'gravado em 19/10, falta renderizar')..."
            />
          </div>
        </div>

        {/* Coluna 2: Cofre de Entrega ao Cliente & Link Público */}
        <div className="space-y-5">
          <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-[#843C52]" />
                <h3 className="text-xs font-semibold text-white tracking-wide">
                  Página do Cofre do Cliente
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="h-7 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs text-[#843C52] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copiar Link</span>
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-light leading-relaxed">
              O cliente acessa este link exclusivo para acompanhar o pedido e baixar os arquivos:
            </p>

            <div className="p-2.5 rounded-lg bg-[#0e0f14] border border-white/10 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-zinc-300 truncate">{clientPublicUrl}</span>
              <a
                href={clientPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white shrink-0 p-1"
                title="Abrir página do cliente"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Cofre de Mídias Entregues (Integrado ao Acervo & Upload Direto) */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-xs font-semibold text-white tracking-wide">
                  Arquivos Entregues no Cofre ({order.vaultFiles?.length || 0})
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Escolha fotos/vídeos da sua Biblioteca ou envie do dispositivo.
                </p>
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
                  <span>{uploadingDirect ? 'Enviando...' : 'Enviar Arquivo'}</span>
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

            {/* Lista de Arquivos no Cofre */}
            {order.vaultFiles && order.vaultFiles.length > 0 ? (
              <div className="space-y-2">
                {order.vaultFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-lg bg-[#101116] border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.type === 'photo' ? (
                        <Camera className="w-3.5 h-3.5 text-[#843C52] shrink-0" />
                      ) : (
                        <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-white block truncate">
                          {file.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={resolveMediaUrl(file.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title="Ver arquivo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveVaultFile(file.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remover do cofre"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl bg-[#101116] border border-dashed border-white/10 text-zinc-400 text-xs">
                Nenhum arquivo entregue ainda. Use os botões acima para selecionar da Biblioteca ou enviar do dispositivo.
              </div>
            )}

            {/* Opção Avançada para Link Externo Manual */}
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowManualForm(!showManualForm)}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <span>Adicionar por link externo manualmente (avançado)</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showManualForm ? 'rotate-180' : ''}`}
                />
              </button>

              {showManualForm && (
                <form
                  onSubmit={handleAddVaultFile}
                  className="mt-2.5 p-3.5 rounded-xl bg-[#101116] border border-white/10 space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={vaultFileName}
                      onChange={(e) => setVaultFileName(e.target.value)}
                      placeholder="Nome do Arquivo (Ex: Foto 1 Ensaio)"
                      className="px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52]"
                    />

                    <select
                      value={vaultFileType}
                      onChange={(e) => setVaultFileType(e.target.value as any)}
                      className="px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white outline-none focus:border-[#843C52] cursor-pointer"
                    >
                      <option value="photo">Foto em Alta Resolução (4K)</option>
                      <option value="video">Vídeo Exclusivo (4K UHD)</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    required
                    value={vaultFileUrl}
                    onChange={(e) => setVaultFileUrl(e.target.value)}
                    placeholder="Link completo do arquivo..."
                    className="w-full px-3 py-2 rounded-lg bg-[#0e0f14] border border-white/10 text-xs text-white font-mono outline-none focus:border-[#843C52]"
                  />

                  <button
                    type="submit"
                    className="h-8 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar Link Manual no Cofre</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
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
        uploadDestinationLabel="Cofre Privado do Pedido"
        onSelect={(url, item) => {
          appendVaultFilesBatch([
            {
              name: item?.customName || item?.name || 'Arquivo Exclusivo',
              url,
              type: item && isMediaVideo(item) ? 'video' : 'photo',
            },
          ]);
        }}
        onSelectMultiple={(urls, items) => {
          const batch = urls.map((url, idx) => {
            const matched =
              items?.[idx] || (content?.library || []).find((m) => m.url === url);
            return {
              name: matched?.customName || matched?.name || `Arquivo #${idx + 1}`,
              url,
              type: (matched && isMediaVideo(matched) ? 'video' : 'photo') as 'photo' | 'video',
            };
          });
          appendVaultFilesBatch(batch);
        }}
        onUploadNew={onUploadNew}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
