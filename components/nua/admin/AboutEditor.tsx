'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { ImagePickerModal } from './ImagePickerModal';
import { resolveMediaUrl } from '@/lib/media';

interface AboutEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

export function AboutEditor({ content, onChange, onUploadNew }: AboutEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const about = content.about;

  const updateAbout = (fields: Partial<typeof about>) => {
    onChange((prev) => ({
      ...prev,
      about: { ...prev.about, ...fields },
    }));
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Block 1: Photo & Role */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
            BIOGRAFIA & IDENTIDADE
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">Sobre Mim</h3>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Aqui você conta sua trajetória e compartilha a essência do seu trabalho. Escolha seu retrato principal e ajuste seus títulos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Portrait Photo Preview & Change */}
          <div className="lg:col-span-4 flex flex-col items-center w-full">
            <div
              key={about.photoUrl}
              className="relative aspect-[3/4] w-full max-w-[260px] rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-xl"
            >
              <Image
                src={resolveMediaUrl(about.photoUrl)}
                alt="Retrato Sobre Mim"
                fill
                className="object-cover"
                sizes="300px"
              />
            </div>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-3.5 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#f4a7b9] hover:bg-[#efa0b3] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] cursor-pointer w-full max-w-[260px] shadow-[0_2px_12px_rgba(244,167,185,0.2)]"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Trocar Foto do Sobre Mim</span>
            </button>
            <span className="text-zinc-500 text-[11px] text-center mt-1.5 font-light">
              Escolha uma foto do seu acervo ou envie uma nova
            </span>
          </div>

          {/* Titles & Role */}
          <div className="lg:col-span-8 space-y-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                  Texto Pequeno no Topo
                </label>
                <input
                  type="text"
                  value={about.eyebrow}
                  onChange={(e) => updateAbout({ eyebrow: e.target.value })}
                  placeholder="Ex: MANIFESTO & BIOGRAFIA"
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                />
                <span className="block text-[11px] text-zinc-500 mt-1 font-light">
                  Aparece em letras menores logo acima do título.
                </span>
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                  Como Você se Apresenta
                </label>
                <input
                  type="text"
                  value={about.role}
                  onChange={(e) => updateAbout({ role: e.target.value })}
                  placeholder="Ex: Educadora Sexual & Sexóloga em Formação"
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                />
                <span className="block text-[11px] text-zinc-500 mt-1 font-light">
                  Sua ocupação ou título profissional exibido junto ao texto.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                Frase Marcante da Seção
              </label>
              <input
                type="text"
                value={about.headline}
                onChange={(e) => updateAbout({ headline: e.target.value })}
                placeholder="Ex: A coragem de despir a vergonha."
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
              />
              <span className="block text-[11px] text-zinc-500 mt-1 font-light">
                A frase principal que abre sua apresentação com impacto.
              </span>
            </div>

            <div>
              <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                Pensamento em Destaque (Citação com Barra Rosa)
              </label>
              <textarea
                rows={2}
                value={about.pullQuote}
                onChange={(e) => updateAbout({ pullQuote: e.target.value })}
                placeholder="Ex: A vergonha é a primeira fronteira que nos impõem..."
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
              />
              <span className="block text-[11px] text-zinc-500 mt-1 font-light">
                Uma reflexão destacada visualmente no meio do texto.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Block 2: Manifesto & Signature */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8 space-y-5">
        <div>
          <h4 className="font-serif text-lg sm:text-xl text-white font-medium">Sua Mensagem & História</h4>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-0.5">
            Estes dois blocos compõem a narrativa do seu trabalho lida pelos visitantes.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Primeira Parte do Texto
            </label>
            <textarea
              rows={3}
              value={about.paragraph1}
              onChange={(e) => updateAbout({ paragraph1: e.target.value })}
              placeholder="Escreva sobre sua visão, motivações e essência..."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Segunda Parte do Texto
            </label>
            <textarea
              rows={3}
              value={about.paragraph2}
              onChange={(e) => updateAbout({ paragraph2: e.target.value })}
              placeholder="Conclua a mensagem com acolhimento e verdade..."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="pt-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Sua Assinatura Manuscrita
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={about.signature}
                onChange={(e) => updateAbout({ signature: e.target.value })}
                placeholder="Ex: Deixa de vergonha"
                className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
              />
              <div className="px-5 py-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-center sm:text-left min-w-[200px]">
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-0.5">
                  Como fica no site:
                </span>
                <span className="font-script text-xl sm:text-2xl text-[#f4a7b9]">
                  {about.signature || 'Sua Assinatura'}
                </span>
              </div>
            </div>
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              Aparece ao final do texto em fonte cursiva estilosa.
            </span>
          </div>
        </div>
      </div>

      {/* Universal Image Picker Modal */}
      <ImagePickerModal
        isOpen={pickerOpen}
        library={content.library}
        albums={content.albums}
        title="Escolher Foto para o Sobre Mim"
        currentImageUrl={about.photoUrl}
        onSelect={(url) => updateAbout({ photoUrl: url })}
        onUploadNew={onUploadNew}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
