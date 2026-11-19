/* Vinho maduro / Nua Borges */
'use client';
import Image from 'next/image';
import { Images, Trash2 } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/media';
interface Props {
  previewImages?: string[];
  modality?: 'avulso' | 'pack';
  onAddPhotos?: () => void;
  onAddFromLibraryClick?: () => void;
  onRemovePhoto: (idx: number) => void;
}
export function PackPreviewsTab({
  previewImages,
  modality = 'pack',
  onAddPhotos,
  onAddFromLibraryClick = onAddPhotos || (() => {}),
  onRemovePhoto,
}: Props) {
 const single=modality==='avulso';const images=(previewImages||[]).slice(0,single?1:undefined);
 return <section className="p-4 sm:p-5 rounded-xl bg-[#14151c] border border-white/[0.07] shadow-sm space-y-4">
  <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]"><div><h3 className="text-sm font-semibold text-white">{single?'Foto de amostra pública':'Amostras gratuitas'} <span className="text-zinc-400 font-normal">({images.length})</span></h3><p className="text-xs text-zinc-400 mt-1">Essas fotos aparecem antes da compra. Você pode escolher do acervo ou enviar novas; o envio também salva no acervo.</p>{single&&<p className="mt-1 text-xs text-[var(--color-adm-accent)]">Este conteúdo usa uma foto de amostra.</p>}</div><button type="button" onClick={onAddFromLibraryClick} className="h-10 px-4 rounded-lg bg-[var(--color-adm-accent)] text-sm text-white font-semibold inline-flex items-center justify-center gap-2 hover:brightness-110 shrink-0"><Images className="w-4 h-4"/>{single && images.length > 0 ? 'Trocar foto' : 'Adicionar fotos'}</button></header>
  {images.length? <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">{images.map((url,idx)=><div key={url+'-'+idx} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[#101116] border border-white/10 group"><Image src={resolveMediaUrl(url,'thumb')} alt={'Amostra '+(idx+1)} fill className="object-cover"/><span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-[10px] text-zinc-200">Amostra {idx+1}</span><button type="button" onClick={()=>onRemovePhoto(idx)} className="absolute top-1.5 right-1.5 p-2 rounded-lg bg-black/80 text-white hover:bg-rose-600" title="Remover amostra" aria-label="Remover amostra"><Trash2 className="w-4 h-4"/></button></div>)}</div>:<button type="button" onClick={onAddFromLibraryClick} className="w-full min-h-24 rounded-xl border border-dashed border-white/15 bg-[#101116] px-4 py-5 text-left hover:border-[var(--color-adm-accent)]/50"><span className="block text-sm font-medium text-white">Ainda não há amostras</span><span className="block mt-1 text-xs text-zinc-400">Toque aqui para escolher do acervo ou enviar fotos novas.</span></button>}
 </section>;
}
