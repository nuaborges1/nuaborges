'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { RotateCcw, ImageIcon, Share2, ShieldCheck } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { resetContentToDefault } from '@/lib/contentStore';
import { ImagePickerModal } from './ImagePickerModal';
import { ConfirmModal } from './ConfirmModal';
import { resolveMediaUrl } from '@/lib/media';

interface SeoEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew?: (img: LibraryImageItem) => void;
}

export function SeoEditor({ content, onChange, onUploadNew = () => {} }: SeoEditorProps) {
  const [ogPickerOpen, setOgPickerOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const seo = content.seo;
  const footer = content.footer;

  const updateSeo = (fields: Partial<typeof seo>) => {
    onChange((prev) => ({
      ...prev,
      seo: { ...prev.seo, ...fields },
    }));
  };

  const updateFooter = (fields: Partial<typeof footer>) => {
    onChange((prev) => ({
      ...prev,
      footer: { ...prev.footer, ...fields },
    }));
  };

  const handleResetAll = () => {
    setShowResetConfirm(true);
  };

  const handleConfirmResetAll = () => {
    setShowResetConfirm(false);
    resetContentToDefault();
    window.location.reload();
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Google, WhatsApp & Sharing */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
            DIVULGAÇÃO & COMPARTILHAMENTO
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">
            Aparência no Google, WhatsApp & Redes
          </h3>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Personalize como seu site é apresentado quando alguém busca pelo seu nome no Google ou compartilha o seu link em conversas de WhatsApp e redes sociais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Título do Site
            </label>
            <input
              type="text"
              value={seo.title}
              onChange={(e) => updateSeo({ title: e.target.value })}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              O nome que aparece na aba do navegador e nas buscas do Google.
            </span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Descrição Curta do Site
            </label>
            <textarea
              rows={2}
              value={seo.description}
              onChange={(e) => updateSeo({ description: e.target.value })}
              placeholder="Breve resumo que aparece abaixo do link..."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              Frase explicativa que aparece no Google e logo abaixo do link no WhatsApp.
            </span>
          </div>

          {/* Social Share Image Picker */}
          <div className="md:col-span-2 pt-2 border-t border-zinc-800/80">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-2">
              Foto de Prévia para WhatsApp e Redes Sociais
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
              <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-zinc-700">
                <Image
                  src={resolveMediaUrl(seo.ogImage)}
                  alt="Foto de compartilhamento"
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </div>

              <div className="flex-1 min-w-0">
                <span className="text-white text-xs sm:text-sm font-medium block">
                  Foto de Prévia Selecionada
                </span>
                <p className="text-zinc-500 text-xs font-light mt-0.5 mb-3 leading-relaxed">
                  Esta foto aparece como miniatura de destaque quando alguém envia o link do seu site para amigos ou clientes.
                </p>
                <button
                  type="button"
                  onClick={() => setOgPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f4a7b9]/15 hover:bg-[#f4a7b9]/25 text-[#f4a7b9] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Trocar Foto de Prévia</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Texts */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <h4 className="font-serif text-lg sm:text-xl text-white font-medium mb-1">
          Mensagem do Rodapé
        </h4>
        <p className="text-zinc-400 text-xs sm:text-sm font-light mb-5 leading-relaxed">
          Informações de encerramento exibidas no final de todas as páginas do site.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto de Direitos Autorais
            </label>
            <input
              type="text"
              value={footer.copyrightText}
              onChange={(e) => updateFooter({ copyrightText: e.target.value })}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Frase de Assinatura do Rodapé
            </label>
            <input
              type="text"
              value={footer.signOff}
              onChange={(e) => updateFooter({ signOff: e.target.value })}
              placeholder="Ex: Deixa de vergonha"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Proteção Ativa das Imagens & Direitos Autorais */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9] shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase block">
              SEGURANÇA & PRIVACIDADE DO SEU ACERVO
            </span>
            <h4 className="font-serif text-lg sm:text-xl text-white font-medium">
              Proteção Ativa de Fotos e Conteúdo
            </h4>
            <p className="text-zinc-400 text-xs sm:text-sm font-light leading-relaxed">
              O seu site possui defesas integradas contra cópias não autorizadas, bloqueio de robôs rastreadores (scrapers) e otimização segura de mídia. Você não precisa configurar nada: o sistema protege suas imagens automaticamente em segundo plano.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-mono text-zinc-400">
              <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Anti-Scraping Ativo
              </span>
              <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Proteção de Download Fácil
              </span>
              <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                CDN Cloudflare com SSL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset to approved default */}
      <div className="bg-rose-950/10 border border-rose-900/30 rounded-3xl p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-rose-300 font-semibold text-base mb-1">Restaurar Conteúdo Original</h4>
          <p className="text-zinc-400 text-xs sm:text-sm font-light max-w-md leading-relaxed">
            Volta todos os textos e fotos para a versão original de lançamento aprovada.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetAll}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-rose-800/80 hover:bg-rose-900/30 text-rose-300 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Tudo</span>
        </button>
      </div>

      {/* Image Picker for OG Share Image */}
      <ImagePickerModal
        isOpen={ogPickerOpen}
        library={content.library}
        albums={content.albums}
        currentImageUrl={seo.ogImage}
        title="Escolher Foto de Compartilhamento"
        onSelect={(url) => updateSeo({ ogImage: url })}
        onUploadNew={onUploadNew}
        onClose={() => setOgPickerOpen(false)}
      />

      {/* Confirmation Modal for Resetting All Settings */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Restaurar Conteúdo Original do Site?"
        description="Deseja voltar todos os textos e fotos para a versão original de lançamento? As alterações feitas recentemente serão substituídas."
        confirmText="Restaurar Original"
        cancelText="Manter Como Está"
        variant="danger"
        onConfirm={handleConfirmResetAll}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
