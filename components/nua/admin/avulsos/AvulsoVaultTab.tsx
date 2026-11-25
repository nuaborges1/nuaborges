/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import {
  ShieldCheck,
  Film,
  Upload,
  FolderOpen,
  Loader2,
  Play,
  CheckCircle2,
  Trash2,
  Lock,
  Copy,
  Camera,
  X,
} from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface AvulsoVaultTabProps {
  data: AvulsoProductItem;
  uploadingState: { isUploading: boolean; progress: number; statusText: string } | null;
  showManualUrlMap: Record<number, boolean>;
  onToggleManualUrl: (index: number) => void;
  onUpdateVideoField: (index: number, field: string, value: string) => void;
  onRemoveVideo: (index: number) => void;
  onAddEmptyVideo: () => void;
  onTriggerNewVideoUpload: () => void;
  onTriggerReplaceVideoUpload: (index: number) => void;
  onOpenAcervoVideo: () => void;
  onOpenAcervoVideoPoster: (videoIndex: number) => void;
  onPreviewVideo: (video: { url: string; title: string; poster?: string }) => void;
  onTriggerUploadVaultPhotos: () => void;
  onOpenAcervoVaultPhotos: () => void;
  onCopyPreviewsToVault: () => void;
  onPreviewPhoto: (url: string) => void;
  onRemoveExclusivePhoto: (index: number) => void;
}

export function AvulsoVaultTab({
  data,
  uploadingState,
  showManualUrlMap,
  onToggleManualUrl,
  onUpdateVideoField,
  onRemoveVideo,
  onAddEmptyVideo,
  onTriggerNewVideoUpload,
  onTriggerReplaceVideoUpload,
  onOpenAcervoVideo,
  onOpenAcervoVideoPoster,
  onPreviewVideo,
  onTriggerUploadVaultPhotos,
  onOpenAcervoVaultPhotos,
  onCopyPreviewsToVault,
  onPreviewPhoto,
  onRemoveExclusivePhoto,
}: AvulsoVaultTabProps) {
  const isAvulso = data.modality === 'avulso';
  const photos = data.exclusivePhotos || [];
  const videoList = data.videos || [];
  const hasExistingVideo = isAvulso && videoList.length > 0;
  const hasExistingPhoto = isAvulso && photos.length > 0;

  return (
    <div className="space-y-8">
      {/* Banner de Blindagem do Cofre */}
      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-zinc-300 leading-relaxed">
          <strong className="text-white block mb-0.5">Cofre Digital Protegido (Entrega Exclusiva Pós-Compra):</strong>
          {isAvulso
            ? 'Conteúdos avulsos possuem exatamente 1 mídia autoral (1 vídeo UHD OU 1 foto em alta resolução 4K). Os arquivos originais ficam blindados e são entregues com acesso exclusivo após a confirmação do pagamento.'
            : 'Os arquivos adicionados aqui (fotografias em alta resolução 4K e vídeos UHD) ficam estritamente blindados em armazenamento privado. O sistema libera o acesso e entrega o conteúdo ao comprador somente após a confirmação válida do pagamento.'}
        </div>
      </div>

      {/* SEÇÃO 1: Vídeos da Produção Audiovisual UHD */}
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-[#843C52]/25 flex items-start gap-3">
          <Film className="w-5 h-5 text-[#843C52] shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-300 leading-relaxed">
            <strong className="text-white block mb-0.5">
              {isAvulso ? 'Produção Audiovisual (Vídeo Único UHD):' : 'Produção Audiovisual (Vídeos UHD):'}
            </strong>
            {isAvulso && hasExistingPhoto ? (
              <span className="text-amber-300 font-medium">
                Bloqueado: Este conteúdo avulso já possui 1 foto anexada abaixo. Remova a foto se desejar substituí-la por um vídeo.
              </span>
            ) : (
              <>Adicione o vídeo desejado. Você pode colar <strong>qualquer link direto de vídeo</strong> ou selecionar diretamente do seu Acervo.</>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-semibold uppercase tracking-wider block">
                {isAvulso ? 'Vídeo UHD do Conteúdo Avulso' : `Vídeos do Pack (${data.videos?.length || 0})`}
              </span>
              {isAvulso && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                  {hasExistingPhoto ? 'Bloqueado (Foto ativa)' : 'Limite: 1 Vídeo'}
                </span>
              )}
            </div>
            <span className="text-zinc-500 text-[11px] font-light">
              {isAvulso
                ? 'Conteúdo avulso aceita estritamente 1 vídeo único liberado ao comprador.'
                : 'Vídeos em alta definição liberados aos compradores com reprodução protegida.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={hasExistingPhoto}
              onClick={onTriggerNewVideoUpload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0 shadow-[0_2px_12px_rgba(244,167,185,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasExistingPhoto ? 'Remova a foto abaixo para adicionar um vídeo' : undefined}
            >
              <Upload className="w-4 h-4" />
              <span>{isAvulso && videoList.length > 0 ? 'Substituir Vídeo' : isAvulso ? 'Enviar Vídeo Único' : 'Enviar Vídeo do Computador'}</span>
            </button>

            <button
              type="button"
              disabled={hasExistingPhoto}
              onClick={onOpenAcervoVideo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold uppercase tracking-wider cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasExistingPhoto ? 'Remova a foto abaixo para adicionar um vídeo' : undefined}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{isAvulso && videoList.length > 0 ? 'Substituir do Acervo' : 'Escolher do Acervo'}</span>
            </button>

            {!isAvulso && (
              <button
                type="button"
                onClick={onAddEmptyVideo}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer ml-1"
                title="Inserir card para colar link externo manualmente"
              >
                Inserir link manualmente
              </button>
            )}
          </div>
        </div>

        {/* Barra de Progresso de Upload Ativo */}
        {uploadingState?.isUploading && (
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-[#843C52]/40 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[#843C52] animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs text-white font-medium mb-1.5">
                <span className="truncate">{uploadingState.statusText}</span>
                <span className="font-mono text-[#843C52] shrink-0">{uploadingState.progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#843C52] to-pink-500 transition-all duration-200"
                  style={{ width: `${uploadingState.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {data.videos && data.videos.length > 0 ? (
          <div className="space-y-3">
            {data.videos.map((vid, vIdx) => (
              <div
                key={vid.id || `video-${vIdx}`}
                className="p-4 rounded-2xl bg-zinc-900/80 border border-[#843C52]/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 flex-1 w-full">
                  {/* Poster / Capa do Vídeo */}
                  <div className="relative aspect-video w-36 sm:w-40 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10 group">
                    {vid.posterUrl ? (
                      <Image
                        src={resolveMediaUrl(vid.posterUrl, 'thumb')}
                        alt={vid.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-[#843C52]">
                        <Film className="w-6 h-6" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onPreviewVideo({
                          url: vid.url,
                          title: vid.title,
                          poster: vid.posterUrl,
                        })
                      }
                      className="absolute inset-0 bg-black/50 hover:bg-black/30 flex items-center justify-center text-[#843C52] transition-colors cursor-pointer"
                      title="Testar reprodução do vídeo"
                    >
                      <Play className="w-6 h-6 fill-[#843C52]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAcervoVideoPoster(vIdx)}
                      className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-[#843C52] border border-[#843C52]/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Trocar Pôster
                    </button>
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-zinc-300">
                      {vid.duration || 'Vídeo'}
                    </span>
                  </div>

                  {/* Campos */}
                  <div className="space-y-2.5 min-w-0 flex-1 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-zinc-400 text-[9px] font-semibold uppercase tracking-wider mb-0.5">
                          Título do Vídeo
                        </label>
                        <input
                          type="text"
                          value={vid.title}
                          onChange={(e) => onUpdateVideoField(vIdx, 'title', e.target.value)}
                          placeholder="Ex: Making Of — Bastidores sob Luz Natural (4K UHD)"
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#843C52] w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 text-[9px] font-semibold uppercase tracking-wider mb-0.5">
                          Duração
                        </label>
                        <input
                          type="text"
                          value={vid.duration || ''}
                          onChange={(e) => onUpdateVideoField(vIdx, 'duration', e.target.value)}
                          placeholder="Ex: 08 Minutos"
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#843C52] w-full"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onTriggerReplaceVideoUpload(vIdx)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs uppercase tracking-wider cursor-pointer shadow-[0_2px_10px_rgba(244,167,185,0.2)]"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Substituir por Vídeo do Computador</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenAcervoVideo()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Escolher do Acervo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleManualUrl(vIdx)}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer ml-auto"
                      >
                        {showManualUrlMap[vIdx] ? 'Ocultar link' : 'Ver / editar link manualmente'}
                      </button>
                    </div>

                    {/* Status do Vídeo */}
                    {(!vid.url || vid.url.includes('commondatastorage.googleapis.com') || vid.url.includes('ForBiggerBlazes')) ? (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center justify-between gap-2">
                        <span>Vídeo de teste padrão — use o botão acima para enviar seu vídeo autoral.</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Vídeo autoral pronto no cofre ({vid.url.split('/').pop()?.slice(0, 30) || 'Vídeo'})</span>
                      </div>
                    )}

                    {showManualUrlMap[vIdx] && (
                      <div className="pt-2 border-t border-zinc-800/60">
                        <label className="block text-zinc-500 text-[9px] font-mono uppercase mb-0.5">
                          Link direto do vídeo
                        </label>
                        <input
                          type="text"
                          value={vid.url}
                          onChange={(e) => onUpdateVideoField(vIdx, 'url', e.target.value)}
                          placeholder="https://exemplo.com/meu-video.mp4"
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-300 outline-none focus:border-[#843C52] w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onPreviewVideo({
                        url: vid.url,
                        title: vid.title,
                        poster: vid.posterUrl,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-[#843C52] font-medium transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#843C52]" />
                    <span>Assistir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveVideo(vIdx)}
                    className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remover vídeo do pack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center rounded-2xl border border-dashed border-[#843C52]/25 bg-[#843C52]/[0.02] space-y-2">
            <Film className="w-7 h-7 text-[#843C52] mx-auto opacity-60" />
            <p className="text-zinc-300 text-xs font-medium">Nenhum vídeo adicionado a este pack</p>
            <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
              Clique em &quot;Enviar Vídeo do Computador&quot; para enviar seus arquivos de vídeo diretamente para o cofre.
            </p>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: Fotos do Ensaio Completo (4K UHD Protegido) */}
      <div className="space-y-4 pt-4 border-t border-zinc-800/80">
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
          <Lock className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-300 leading-relaxed">
            <strong className="text-white block mb-0.5">
              {isAvulso ? 'Fotografia Única em Alta Resolução (4K UHD Protegido):' : 'Ensaio Fotográfico Completo (4K UHD Protegido):'}
            </strong>
            {isAvulso
              ? 'Foto entregue sem marcas d\'água no cofre do cliente após a compra. A modalidade Conteúdo Avulso contempla exclusivamente 1 foto única entregue com resolução máxima.'
              : <>Fotos entregues sem marcas d&apos;água no cofre do cliente após a compra. Na página pública de vendas, estas fotos são apresentadas com efeito borrado e cadeado, informando ao cliente a quantidade de imagens do cofre.</>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-semibold uppercase tracking-wider block">
                {isAvulso ? 'Foto do Cofre Protegido' : `Fotos do Ensaio Completo (${photos.length})`}
              </span>
              {isAvulso && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                  Limite: 1 Foto
                </span>
              )}
            </div>
            <span className="text-zinc-500 text-[11px] font-light">
              {isAvulso
                ? 'Conteúdo Avulso contém apenas 1 foto única entregue ao cliente pós-pagamento.'
                : 'Fotografias em resolução máxima entregues no cofre digital.'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={hasExistingVideo}
              onClick={onTriggerUploadVaultPhotos}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0 shadow-[0_2px_12px_rgba(244,167,185,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasExistingVideo ? 'Remova o vídeo acima para adicionar uma foto' : undefined}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isAvulso && photos.length > 0 ? 'Substituir Foto Única' : isAvulso ? 'Enviar Foto Única (4K)' : 'Enviar Fotos do Cofre (4K)'}</span>
            </button>

            <button
              type="button"
              disabled={hasExistingVideo}
              onClick={onOpenAcervoVaultPhotos}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold uppercase tracking-wider cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasExistingVideo ? 'Remova o vídeo acima para adicionar uma foto' : undefined}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{isAvulso && photos.length > 0 ? 'Substituir do Acervo' : 'Escolher do Acervo'}</span>
            </button>
          </div>
        </div>

        {photos && photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {photos.map((photoUrl, pIdx) => (
              <div
                key={`vault-photo-${pIdx}`}
                onClick={() => onPreviewPhoto(photoUrl)}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black border border-zinc-800 hover:border-[#843C52]/60 group cursor-pointer transition-all"
                title="Clique para visualizar em alta resolução"
              >
                {photoUrl && photoUrl.startsWith('data:') ? (
                  <img
                    src={photoUrl}
                    alt={`Foto do Ensaio ${pIdx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Image
                    src={resolveMediaUrl(photoUrl, 'thumb')}
                    alt={`Foto do Ensaio ${pIdx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-mono text-zinc-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-zinc-400" />
                  <span>{isAvulso ? 'Foto Única' : `Foto #${pIdx + 1}`}</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveExclusivePhoto(pIdx);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 hover:bg-rose-950/80"
                  title="Remover foto do cofre"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
            <Camera className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-300 text-xs font-medium">
              {isAvulso ? 'Nenhuma foto adicionada à obra avulsa' : 'Nenhuma foto adicionada ao ensaio completo'}
            </p>
            <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
              {isAvulso
                ? 'Clique em "Enviar Foto Única (4K)" ou copie a prévia para liberar ao comprador pós-compra.'
                : 'Clique em "Enviar Fotos do Cofre (4K)" ou copie as fotos das prévias para liberar aos compradores pós-compra.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
