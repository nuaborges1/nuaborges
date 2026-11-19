/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import { Film, X } from 'lucide-react';
import { ImagePickerModal } from '../ImagePickerModal';
import { ConfirmModal } from '../ConfirmModal';
import { resolveMediaUrl } from '@/lib/media';
import { AvulsoProductItem, LibraryImageItem, MediaAlbum } from '@/lib/types';

interface AvulsoMediaModalsProps {
  pickerTarget: {
    type: 'cover' | 'previewPhoto' | 'exclusivePhoto' | 'packVideo' | 'videoPoster';
    index: number;
    videoIndex?: number;
  } | null;
  onClosePicker: () => void;
  onSelectImage: (url: string, item?: LibraryImageItem) => void;
  onSelectMultipleImages: (urls: string[], items?: LibraryImageItem[]) => void;
  editingItemData: AvulsoProductItem | null;
  library?: LibraryImageItem[];
  albums?: MediaAlbum[];
  onUploadNew?: (img: LibraryImageItem) => void;

  previewingVideo: { url: string; title: string; poster?: string } | null;
  onClosePreviewingVideo: () => void;

  previewingPhotoUrl: string | null;
  onClosePreviewingPhoto: () => void;

  deleteConfirmIndex: number | null;
  onCancelDelete: () => void;
  onConfirmDelete: (index: number) => void;
  items: AvulsoProductItem[];
}

export function AvulsoMediaModals({
  pickerTarget,
  onClosePicker,
  onSelectImage,
  onSelectMultipleImages,
  editingItemData,
  library = [],
  albums = [],
  onUploadNew,
  previewingVideo,
  onClosePreviewingVideo,
  previewingPhotoUrl,
  onClosePreviewingPhoto,
  deleteConfirmIndex,
  onCancelDelete,
  onConfirmDelete,
  items,
}: AvulsoMediaModalsProps) {
  return (
    <>
      {/* Modal de Seleção no Acervo de Mídias */}
      {pickerTarget !== null && (
        <ImagePickerModal
          isOpen={pickerTarget !== null}
          library={library}
          albums={albums}
          onClose={onClosePicker}
          onSelect={onSelectImage}
          onSelectMultiple={onSelectMultipleImages}
          onUploadNew={onUploadNew}
          uploadVisibility={pickerTarget.type === 'exclusivePhoto' || pickerTarget.type === 'packVideo' ? 'private' : 'public'}
          selectionMode={
            pickerTarget.type === 'cover' ||
            pickerTarget.type === 'videoPoster' ||
            ((pickerTarget.type === 'previewPhoto' || pickerTarget.type === 'exclusivePhoto') && editingItemData?.modality === 'avulso')
              ? 'single'
              : 'multiple'
          }
          uploadDestinationLabel={pickerTarget.type === 'cover' ? 'a capa do pack' : pickerTarget.type === 'previewPhoto' ? 'as amostras gratuitas' : pickerTarget.type === 'exclusivePhoto' ? 'as fotos entregues após a compra' : pickerTarget.type === 'packVideo' ? 'os vídeos entregues após a compra' : 'a capa do vídeo'}
          confirmActionLabel={pickerTarget.type === 'cover' ? 'Usar como capa' : pickerTarget.type === 'previewPhoto' ? 'Adicionar às amostras' : pickerTarget.type === 'exclusivePhoto' ? 'Adicionar ao conteúdo do pack' : pickerTarget.type === 'packVideo' ? 'Adicionar vídeos ao pack' : 'Usar como capa do vídeo'}
          currentImageUrl={
            pickerTarget.type === 'cover'
              ? editingItemData?.imageUrl
              : pickerTarget.type === 'videoPoster' && pickerTarget.videoIndex !== undefined
              ? editingItemData?.videos?.[pickerTarget.videoIndex]?.posterUrl
              : undefined
          }
          title={
            pickerTarget.type === 'cover'
              ? 'Selecionar Foto de Capa do Pack'
              : pickerTarget.type === 'previewPhoto'
              ? 'Adicionar Fotos de Prévia (Vitrine Pública)'
              : pickerTarget.type === 'exclusivePhoto'
              ? 'Adicionar Fotos do Ensaio Completo (Cofre 4K Protegido)'
              : pickerTarget.type === 'packVideo'
              ? 'Selecionar Vídeo da Produção Audiovisual'
              : 'Escolher Capa / Pôster do Vídeo'
          }
        />
      )}

      {/* Modal de Teste/Reprodução de Vídeo em Streaming */}
      {previewingVideo !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#171821] border border-white/[0.08] rounded-xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Film className="w-4 h-4 text-[#843C52] shrink-0" />
                <h4 className="text-xs font-semibold text-white truncate">{previewingVideo.title}</h4>
              </div>
              <button
                type="button"
                onClick={onClosePreviewingVideo}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-white/[0.06]">
              <video
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
                src={resolveMediaUrl(previewingVideo.url)}
                poster={previewingVideo.poster ? resolveMediaUrl(previewingVideo.poster) : undefined}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
              <span className="truncate max-w-md font-mono text-[10px] text-zinc-500">
                URL: {previewingVideo.url}
              </span>
              <button
                type="button"
                onClick={onClosePreviewingVideo}
                className="h-8 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] text-xs font-medium transition cursor-pointer self-end sm:self-auto"
              >
                Fechar Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Zoom de Foto em Alta Definição */}
      {previewingPhotoUrl !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          onClick={onClosePreviewingPhoto}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center">
            <img
              src={resolveMediaUrl(previewingPhotoUrl, 'full')}
              alt="Foto em alta resolução"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
            <button
              type="button"
              onClick={onClosePreviewingPhoto}
              className="mt-4 h-8 px-4 rounded-full bg-white/[0.1] hover:bg-white/[0.15] text-white text-xs font-medium border border-white/20 cursor-pointer transition"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmIndex !== null && (
        <ConfirmModal
          isOpen={deleteConfirmIndex !== null}
          onCancel={onCancelDelete}
          onConfirm={() => onConfirmDelete(deleteConfirmIndex)}
          title="Excluir Pack Avulso"
          description={`Tem certeza que deseja excluir o pack "${items[deleteConfirmIndex]?.title || 'este pack'}"? Esta ação removerá o produto do catálogo e da vitrine do site.`}
          confirmText="Sim, Excluir Pack"
          cancelText="Cancelar"
          variant="danger"
        />
      )}
    </>
  );
}
