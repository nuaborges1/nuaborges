'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ImageIcon, ExternalLink, X, CheckCircle2, BookOpen, Quote } from 'lucide-react';
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
  const [previewingPhotoUrl, setPreviewingPhotoUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const about = content.about;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateAbout = (fields: Partial<typeof about>) => {
    onChange((prev) => ({
      ...prev,
      about: { ...prev.about, ...fields },
    }));
    showToast('✓ Rascunho do Sobre Mim salvo.');
  };

  return (
    <div className="space-y-5">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#171821] border border-[#f4a7b9]/40 text-white text-xs flex items-center gap-2 shadow-2xl backdrop-blur-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#f4a7b9]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Block 1: Photo & Role */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase font-mono block mb-1">
            BIOGRAFIA &amp; IDENTIDADE
          </span>
          <h3 className="text-sm sm:text-base font-semibold text-white">Sobre Mim</h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
            Aqui você conta sua trajetória e compartilha a essência do seu trabalho. Escolha seu retrato principal e ajuste seus títulos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Portrait Photo Preview & Change */}
          <div className="lg:col-span-4 flex flex-col items-center w-full">
            <div
              key={about.photoUrl}
              onClick={() => about.photoUrl && setPreviewingPhotoUrl(about.photoUrl)}
              className="relative aspect-[3/4] w-full max-w-[220px] rounded-xl overflow-hidden bg-[#101116] border border-white/[0.06] shadow-md cursor-pointer group/img"
              title="Clique para visualizar em alta resolução"
            >
              <Image
                src={resolveMediaUrl(about.photoUrl)}
                alt="Retrato Sobre Mim"
                fill
                className="object-cover group-hover/img:scale-105 transition-transform duration-300"
                sizes="300px"
              />
            </div>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="mt-3 inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition-all cursor-pointer w-full max-w-[220px] shadow-sm"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Trocar Foto</span>
            </button>
            <span className="text-zinc-500 text-[10px] text-center mt-1.5 font-light">
              Escolha do acervo ou envie nova
            </span>
          </div>

          {/* Titles & Role */}
          <div className="lg:col-span-8 space-y-3.5 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-1.5">
                  Texto Pequeno no Topo
                </label>
                <input
                  type="text"
                  value={about.eyebrow}
                  onChange={(e) => updateAbout({ eyebrow: e.target.value })}
                  placeholder="Ex: MANIFESTO & BIOGRAFIA"
                  className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                />
                <span className="block text-[10px] text-zinc-500 mt-1 font-light">
                  Aparece em letras menores logo acima do título.
                </span>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-1.5">
                  Como Você se Apresenta
                </label>
                <input
                  type="text"
                  value={about.role}
                  onChange={(e) => updateAbout({ role: e.target.value })}
                  placeholder="Ex: Educadora Sexual & Sexóloga em Formação"
                  className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
                />
                <span className="block text-[10px] text-zinc-500 mt-1 font-light">
                  Sua ocupação ou título profissional exibido junto ao texto.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-1.5">
                Frase Marcante da Seção
              </label>
              <input
                type="text"
                value={about.headline}
                onChange={(e) => updateAbout({ headline: e.target.value })}
                placeholder="Ex: A coragem de despir a vergonha."
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
              />
              <span className="block text-[10px] text-zinc-500 mt-1 font-light">
                A frase principal que abre sua apresentação com impacto.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono">
                  Pensamento em Destaque (Citação com Barra Rosa)
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {about.pullQuote?.length || 0} caracteres
                </span>
              </div>
              <textarea
                rows={2}
                value={about.pullQuote}
                onChange={(e) => updateAbout({ pullQuote: e.target.value })}
                placeholder="Ex: A vergonha é a primeira fronteira que nos impõem..."
                className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
              />
              <span className="block text-[10px] text-zinc-500 mt-1 font-light">
                Uma reflexão destacada visualmente no meio do texto.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Block 2: Manifesto & Signature */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <h4 className="text-sm sm:text-base font-semibold text-white">Sua Mensagem &amp; História</h4>
          <p className="text-zinc-400 text-xs font-light mt-0.5">
            Estes dois blocos compõem a narrativa do seu trabalho lida pelos visitantes. Quebras de parágrafo são preservadas exatamente no site.
          </p>
        </div>

        <div className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono">
                Primeira Parte do Texto (Manifesto)
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {about.paragraph1?.length || 0} caracteres
              </span>
            </div>
            <textarea
              rows={3}
              value={about.paragraph1}
              onChange={(e) => updateAbout({ paragraph1: e.target.value })}
              placeholder="Escreva sobre sua visão, motivações e essência..."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono">
                Segunda Parte do Texto (Conclusão &amp; Chamada)
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                {about.paragraph2?.length || 0} caracteres
              </span>
            </div>
            <textarea
              rows={3}
              value={about.paragraph2}
              onChange={(e) => updateAbout({ paragraph2: e.target.value })}
              placeholder="Conclua a mensagem com acolhimento e verdade..."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="pt-2">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase font-mono mb-1.5">
              Sua Assinatura Manuscrita
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={about.signature}
                onChange={(e) => updateAbout({ signature: e.target.value })}
                placeholder="Ex: Deixa de vergonha"
                className="flex-1 bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-2 text-white text-xs sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
              />
              <div className="px-4 py-2 rounded-xl bg-[#101116] border border-white/[0.06] text-center sm:text-left min-w-[180px]">
                <span className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider block mb-0.5">
                  Como fica no site:
                </span>
                <span className="font-script text-xl text-[#f4a7b9]">
                  {about.signature || 'Sua Assinatura'}
                </span>
              </div>
            </div>
            <span className="block text-[10px] text-zinc-500 mt-1 font-light">
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

      {/* Modal de Visualização de Foto em Alta Resolução */}
      {previewingPhotoUrl !== null && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setPreviewingPhotoUrl(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#171821] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl p-4 sm:p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#f4a7b9]" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#f4a7b9] font-semibold">
                  VISUALIZAÇÃO DE RETRATO • ALTA RESOLUÇÃO
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveMediaUrl(previewingPhotoUrl, 'full')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Abrir imagem original em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewingPhotoUrl(null)}
                  className="p-1.5 rounded-lg bg-white/[0.04] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative aspect-[4/5] sm:aspect-video max-h-[70vh] w-full rounded-xl overflow-hidden bg-[#101116] border border-white/[0.06] flex items-center justify-center">
              <img
                src={resolveMediaUrl(previewingPhotoUrl, 'full')}
                alt="Retrato Sobre Mim"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pt-1">
              <span className="truncate max-w-md text-[11px]">URL: {previewingPhotoUrl}</span>
              <span className="text-emerald-400 font-sans text-xs font-medium shrink-0">✓ Qualidade Original</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
