/* Vinho maduro / Nua Borges */
'use client';

import React from 'react';
import Image from 'next/image';
import {
  ImageIcon,
  Eye,
  Upload,
  FolderOpen,
  X,
} from 'lucide-react';
import { AvulsoProductItem } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

interface AvulsoPreviewsTabProps {
  data: AvulsoProductItem;
  onSelectCover: () => void;
  onTriggerUploadPreviews: () => void;
  onOpenAcervoPreviews: () => void;
  onPreviewPhoto: (url: string) => void;
  onRemovePreviewPhoto: (index: number) => void;
}

export function AvulsoPreviewsTab({
  data,
  onSelectCover,
  onTriggerUploadPreviews,
  onOpenAcervoPreviews,
  onPreviewPhoto,
  onRemovePreviewPhoto,
}: AvulsoPreviewsTabProps) {
  const isAvulso = data.modality === 'avulso';
  const previews = (data.previewImages || []).slice(0, isAvulso ? 1 : undefined);

  return (
    <div className="space-y-6">
      {/* Capa Principal */}
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-white text-xs font-semibold uppercase tracking-wider block">
              {isAvulso ? 'Capa Principal da Obra Avulsa' : 'Capa Principal do Pack (Vitrine)'}
            </span>
            <span className="text-zinc-500 text-[11px] font-light">
              Imagem principal exibida no card do catálogo e na primeira tela do cofre.
            </span>
          </div>

          <button
            type="button"
            onClick={onSelectCover}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#843C52]/15 hover:bg-[#843C52]/25 text-[#843C52] text-xs font-semibold cursor-pointer border border-[#843C52]/30 shrink-0"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Trocar Imagem de Capa</span>
          </button>
        </div>

        <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full rounded-xl overflow-hidden bg-black border border-white/10">
          {data.imageUrl && data.imageUrl.startsWith('data:') ? (
            <img
              src={data.imageUrl}
              alt="Capa do Pack"
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={resolveMediaUrl(data.imageUrl || '/images/nua/gallery/gallery-1.png', 'full')}
              alt="Capa do Pack"
              fill
              className="object-cover"
            />
          )}
        </div>
      </div>

      {/* Galeria de Demonstração (Prévias com Marca d'Água) */}
      <div className="space-y-4 pt-2">
        <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-[#843C52]/20 flex items-start gap-3">
          <Eye className="w-5 h-5 text-[#843C52] shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-300 leading-relaxed">
            <strong className="text-white block mb-0.5">
              {isAvulso ? 'Foto de Demonstração Pública (Foto Única):' : 'Fotos de Demonstração (Prévias Abertas ao Público):'}
            </strong>
            {isAvulso
              ? 'Na modalidade Conteúdo Avulso, é permitida apenas 1 foto de demonstração na vitrine com marca d\'água editorial.'
              : <>Estas fotos formam a <strong>Galeria de Demonstração</strong> e o carrossel no topo da página do produto (<code className="text-[#843C52] font-mono text-[10px]">/avulsos/nome-do-pack</code>). Qualquer visitante pode inspecioná-las livremente antes de comprar. O sistema aplica automaticamente a marca d&apos;água editorial <em>&quot;NUA BORGES PRÉVIA&quot;</em>.</>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-semibold uppercase tracking-wider block">
                {isAvulso ? 'Foto de Amostra Cadastrada' : `Prévias Cadastradas (${previews.length})`}
              </span>
              {isAvulso && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                  Limite: 1 Foto
                </span>
              )}
            </div>
            <span className="text-zinc-500 text-[11px] font-light">
              {isAvulso
                ? 'Conteúdo Avulso permite exclusivamente 1 foto única de amostra.'
                : 'Selecione fotos envolventes para despertar o desejo do admirador.'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTriggerUploadPreviews}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0 shadow-[0_2px_12px_rgba(244,167,185,0.2)]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isAvulso && previews.length > 0 ? 'Substituir Foto Única' : isAvulso ? 'Enviar Foto Única' : 'Enviar Prévias do Computador'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenAcervoPreviews}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold uppercase tracking-wider cursor-pointer shrink-0"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{isAvulso && previews.length > 0 ? 'Substituir do Acervo' : 'Escolher do Acervo'}</span>
            </button>
          </div>
        </div>

        {previews.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {previews.map((photoUrl, pIdx) => (
              <div
                key={`preview-${pIdx}`}
                onClick={() => onPreviewPhoto(photoUrl)}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-black border border-zinc-800 hover:border-[#843C52]/60 group cursor-pointer transition-all"
                title="Clique para visualizar em tela cheia"
              >
                {photoUrl && photoUrl.startsWith('data:') ? (
                  <img
                    src={photoUrl}
                    alt={`Prévia ${pIdx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Image
                    src={resolveMediaUrl(photoUrl, 'thumb')}
                    alt={`Prévia ${pIdx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-mono text-zinc-300">
                  {isAvulso ? 'Foto Única' : `Amostra #${pIdx + 1}`}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePreviewPhoto(pIdx);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10 hover:bg-rose-950/80"
                  title="Remover prévia"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2">
            <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-300 text-xs font-medium">Nenhuma foto de demonstração cadastrada</p>
            <p className="text-zinc-500 text-[11px] max-w-sm mx-auto">
              {isAvulso
                ? 'Adicione 1 foto de amostra para os visitantes conhecerem a obra na vitrine.'
                : 'Adicione de 3 a 7 fotos de amostra para os visitantes conhecerem a produção na vitrine.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
