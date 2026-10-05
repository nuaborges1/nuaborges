'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, ArrowLeft, ArrowRight, ImageIcon } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { ImagePickerModal } from './ImagePickerModal';
import { ConfirmModal } from './ConfirmModal';
import { resolveMediaUrl } from '@/lib/media';

interface HeroEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function HeroEditor({ content, onChange, onUploadNew }: HeroEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const hero = content.hero;

  const updateHero = (
    updater: Partial<typeof hero> | ((prevHero: typeof hero) => Partial<typeof hero>)
  ) => {
    onChange((prev) => {
      const currentHero = prev.hero;
      const fields = typeof updater === 'function' ? updater(currentHero) : updater;
      return {
        ...prev,
        hero: { ...currentHero, ...fields },
      };
    });
  };

  const handleOpenPickerForSlide = (index: number) => {
    setEditingSlideIndex(index);
    setPickerOpen(true);
  };

  const handleAddNewSlide = () => {
    setEditingSlideIndex(hero.photos.length);
    setPickerOpen(true);
  };

  const handleSelectImage = (imageUrl: string) => {
    if (editingSlideIndex === null) return;
    const targetIdx = editingSlideIndex;

    updateHero((currentHero) => {
      const currentPhotos = [...(currentHero.photos || [])];
      if (targetIdx < currentPhotos.length) {
        currentPhotos[targetIdx] = {
          ...currentPhotos[targetIdx],
          id: 'hero-' + Date.now(),
          imageUrl,
        };
      } else {
        currentPhotos.push({
          id: 'hero-' + Date.now(),
          title: 'Nua Borges',
          session: String(currentPhotos.length + 1).padStart(2, '0'),
          imageUrl,
        });
      }
      return { photos: currentPhotos };
    });

    setPickerOpen(false);
    setEditingSlideIndex(null);
  };

  const handleRemoveSlide = (index: number) => {
    if (hero.photos.length <= 1) {
      setNoticeMessage('A Capa precisa de pelo menos uma foto.');
      setTimeout(() => setNoticeMessage(null), 3500);
      return;
    }
    setDeleteConfirmIndex(index);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmIndex === null) return;
    const idxToRemove = deleteConfirmIndex;
    updateHero((currentHero) => ({
      photos: (currentHero.photos || []).filter((_, i) => i !== idxToRemove),
    }));
    setDeleteConfirmIndex(null);
  };

  const handleMoveSlide = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= hero.photos.length) return;
    const updated = [...hero.photos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    updateHero({ photos: updated });
  };

  const currentSlideUrl =
    editingSlideIndex !== null && editingSlideIndex < hero.photos.length
      ? hero.photos[editingSlideIndex].imageUrl
      : undefined;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Information & Texts Card */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
            TELA DE ENTRADA
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">Capa do Site</h3>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Esta é a primeira coisa que as pessoas veem ao entrar no seu site. Ajuste aqui seu nome, frase de destaque, botão principal e fotos da capa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto de Destaque no Topo
            </label>
            <input
              type="text"
              value={hero.eyebrow}
              onChange={(e) => updateHero({ eyebrow: e.target.value })}
              placeholder="Ex: PLATAFORMA OFICIAL"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[11px] block mt-1">Palavra ou frase curta acima do seu nome.</span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Seu Nome ou Título Principal
            </label>
            <input
              type="text"
              value={hero.title}
              onChange={(e) => updateHero({ title: e.target.value })}
              placeholder="Ex: Nua Borges"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[11px] block mt-1">Aparece em destaque no centro da capa.</span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Frase de Boas-Vindas
            </label>
            <input
              type="text"
              value={hero.tagline}
              onChange={(e) => updateHero({ tagline: e.target.value })}
              placeholder="Ex: Onde o corpo é arte e o prazer é livre de culpas."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[11px] block mt-1">Uma frase marcante que define você e seu trabalho.</span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Breve Apresentação
            </label>
            <textarea
              rows={2}
              value={hero.description}
              onChange={(e) => updateHero({ description: e.target.value })}
              placeholder="Descreva seu trabalho e proposta em uma ou duas frases diretas..."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
            <span className="text-zinc-500 text-[11px] block mt-1">Aparece logo abaixo da frase principal da capa.</span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto do Botão Principal
            </label>
            <input
              type="text"
              value={hero.ctaText}
              onChange={(e) => updateHero({ ctaText: e.target.value })}
              placeholder="Ex: Acessar Acervo Exclusivo"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[11px] block mt-1">Texto exibido dentro do botão de ação.</span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Link do Botão Principal
            </label>
            <input
              type="url"
              value={hero.ctaUrl}
              onChange={(e) => updateHero({ ctaUrl: e.target.value })}
              placeholder="https://onlyfans.com/nuaborges"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[11px] block mt-1">Para onde o visitante é levado ao tocar no botão (ex: seu OnlyFans).</span>
          </div>

          {/* Texto de Convite para o Rodapé (Scroll para a Galeria) */}
          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto de Convite do Rodapé da Capa (Scroll)
            </label>
            <input
              type="text"
              value={hero.exploreText ?? 'EXPLORE O MUNDO DA NUA ♥️'}
              onChange={(e) => updateHero({ exploreText: e.target.value })}
              placeholder="Ex: EXPLORE O MUNDO DA NUA ♥️"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="text-zinc-500 text-[11px] block mt-1">
              Frase em destaque acima da seta no final da capa convidando o visitante a descer até a galeria de fotos.
            </span>
          </div>

          {/* Toggle: Capa em Tela Cheia */}
          <div className="md:col-span-2 pt-5 mt-2 border-t border-zinc-800/80 flex items-center justify-between gap-4">
            <div>
              <span className="block text-white text-sm font-medium flex items-center gap-2">
                <span>Foto de Fundo em Tela Cheia</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#f4a7b9]/20 text-[#f4a7b9]">
                  Recomendado
                </span>
              </span>
              <span className="text-zinc-400 text-xs font-light block mt-1 max-w-xl leading-relaxed">
                A foto de fundo cobre toda a tela com o seu nome centralizado. Se desativar, a foto fica na lateral direita com o texto ao lado.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                updateHero({
                  cinematicCoverLayout: hero.cinematicCoverLayout === false ? true : false,
                })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[28px] ${
                hero.cinematicCoverLayout !== false ? 'bg-[#f4a7b9]' : 'bg-zinc-800'
              }`}
              aria-label="Alternar capa tela cheia"
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                  hero.cinematicCoverLayout !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Toggle: Preenchimento Total da Foto */}
          <div className="md:col-span-2 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-4">
            <div>
              <span className="block text-white text-sm font-medium">
                Preencher Toda a Altura da Tela
              </span>
              <span className="text-zinc-400 text-xs font-light block mt-1 max-w-xl leading-relaxed">
                Ajusta a foto lateral para preencher toda a altura da tela quando a capa dividida estiver ativa.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                updateHero({
                  fullVerticalPhoto: hero.fullVerticalPhoto === false ? true : false,
                })
              }
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[28px] ${
                hero.fullVerticalPhoto !== false ? 'bg-[#f4a7b9]' : 'bg-zinc-800'
              }`}
              aria-label="Alternar foto inteira"
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                  hero.fullVerticalPhoto !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ── Logo vs Texto ── */}
          <div className="md:col-span-2 pt-4 border-t border-zinc-800/80">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <span className="block text-white text-sm font-medium flex items-center gap-2">
                  Exibir Imagem de Logo no lugar do Nome em Texto
                </span>
                <span className="text-zinc-400 text-xs font-light block mt-1 max-w-xl leading-relaxed">
                  Quando ativado, exibe uma imagem com a sua logo no lugar do nome digitado.
                  Se desativado, o nome em texto com fonte elegante é exibido normalmente.
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateHero({ useLogo: !hero.useLogo })}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[28px] ${
                  hero.useLogo ? 'bg-[#f4a7b9]' : 'bg-zinc-800'
                }`}
                aria-label="Alternar logo ou texto"
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-zinc-950 shadow ring-0 transition duration-200 ease-in-out ${
                    hero.useLogo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Preview + selecionar logo */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Preview da logo atual */}
              <div className="relative w-full sm:w-56 h-20 rounded-xl overflow-hidden bg-black/50 border border-zinc-700 flex items-center justify-center shrink-0">
                {hero.logoUrl ? (
                  <Image
                    src={resolveMediaUrl(hero.logoUrl, 'thumb')}
                    alt="Prévia da logo"
                    fill
                    className="object-contain p-2"
                    sizes="224px"
                  />
                ) : (
                  <span className="text-zinc-500 text-xs text-center px-3">Nenhuma imagem de logo selecionada</span>
                )}
              </div>

              <div className="flex flex-col gap-2 w-full">
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Recomendado: imagem com fundo transparente (formato PNG). Fica excelente em tons de branco ou rosê.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setLogoPickerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {hero.logoUrl ? 'Trocar Imagem de Logo' : 'Selecionar Imagem de Logo'}
                  </button>
                  {hero.logoUrl && (
                    <button
                      type="button"
                      onClick={() => updateHero({ logoUrl: undefined, useLogo: false })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-red-400 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Photos Carousel Management */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">
                Fotos da Capa ({hero.photos.length})
              </h3>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm font-light mt-0.5">
              Estas fotos alternam suavemente no fundo da capa. Você pode adicionar mais fotos, trocar ou reorganizar a ordem.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddNewSlide}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer min-h-[44px] shadow-[0_2px_14px_rgba(244,167,185,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Foto à Capa</span>
          </button>
        </div>

        {/* Notice toast if cannot delete */}
        {noticeMessage && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
            <span>{noticeMessage}</span>
            <button
              type="button"
              onClick={() => setNoticeMessage(null)}
              className="text-amber-400 hover:text-white text-xs ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Empty state if no photos */}
        {hero.photos.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40">
            <ImageIcon className="w-10 h-10 text-zinc-600 mx-auto mb-3" strokeWidth={1.5} />
            <h4 className="font-serif text-base text-zinc-300 font-medium">Ainda não há fotos na capa</h4>
            <p className="text-zinc-500 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
              Adicione pelo menos uma foto para receber seus visitantes com elegância na página inicial.
            </p>
            <button
              type="button"
              onClick={handleAddNewSlide}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_2px_12px_rgba(244,167,185,0.2)]"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Primeira Foto</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {hero.photos.map((photo, index) => (
              <div
                key={`${photo.id || index}-${photo.imageUrl}`}
                className="relative rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-3.5 flex flex-col justify-between group transition-all"
              >
                <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-black mb-3">
                  <Image
                    src={resolveMediaUrl(photo.imageUrl)}
                    alt={`Foto ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="260px"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-mono text-zinc-300 border border-zinc-800">
                    Foto 0{index + 1} {index === 0 && '• Capa Principal'}
                  </span>
                </div>

                {/* Action Buttons with comfortable touch targets */}
                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/80 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPickerForSlide(index)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-xs text-[#f4a7b9] font-semibold transition-colors min-h-[42px] cursor-pointer flex-1 justify-center"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Trocar Foto</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveSlide(index, 'prev')}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors cursor-pointer border border-zinc-800"
                      title="Mover para a esquerda"
                      aria-label="Mover para a esquerda"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === hero.photos.length - 1}
                      onClick={() => handleMoveSlide(index, 'next')}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-20 transition-colors cursor-pointer border border-zinc-800"
                      title="Mover para a direita"
                      aria-label="Mover para a direita"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlide(index)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer border border-zinc-800"
                      title="Remover foto da capa"
                      aria-label="Remover foto da capa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Universal Image Picker Modal */}
      <ImagePickerModal
        isOpen={pickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={currentSlideUrl}
        title={
          editingSlideIndex !== null && editingSlideIndex < hero.photos.length
            ? `Trocar Foto 0${editingSlideIndex + 1} da Capa`
            : 'Adicionar Nova Foto à Capa'
        }
        onSelect={handleSelectImage}
        onUploadNew={onUploadNew}
        onClose={() => {
          setPickerOpen(false);
          setEditingSlideIndex(null);
        }}
      />

      {/* Logo Picker Modal */}
      <ImagePickerModal
        isOpen={logoPickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={hero.logoUrl}
        title="Selecionar Imagem de Logo da Capa"
        onSelect={(url) => {
          updateHero({ logoUrl: url, useLogo: true });
          setLogoPickerOpen(false);
        }}
        onUploadNew={onUploadNew}
        onClose={() => setLogoPickerOpen(false)}
      />

      {/* Custom Confirmation Modal for Deleting Photos */}
      <ConfirmModal
        isOpen={deleteConfirmIndex !== null}
        title="Remover esta foto da capa?"
        description="A foto será retirada do carrossel da capa, mas continuará guardada no seu acervo para você reutilizar quando quiser."
        confirmText="Remover Foto"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmIndex(null)}
      />
    </div>
  );
}
