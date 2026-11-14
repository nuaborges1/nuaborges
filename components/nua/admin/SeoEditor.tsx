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
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <div className="mb-4">
          <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase block mb-0.5">
            DIVULGAÇÃO & COMPARTILHAMENTO
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Aparência no Google, WhatsApp & Redes
          </h3>
          <p className="text-zinc-400 text-xs font-light mt-0.5 leading-relaxed">
            Personalize como seu site é apresentado quando alguém busca pelo seu nome no Google ou compartilha o seu link em conversas de WhatsApp e redes sociais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase">
                Título do Site (Google & Aba)
              </label>
              <span
                className={`text-[10px] font-mono font-medium ${
                  (seo.title?.length || 0) <= 60 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {seo.title?.length || 0} / 60 caracteres recomendados
              </span>
            </div>
            <input
              type="text"
              value={seo.title}
              onChange={(e) => updateSeo({ title: e.target.value.replace(/<[^>]*>/g, '') })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[10px] text-zinc-500 mt-1 font-light">
              O nome principal que aparece na aba do navegador e no título clicável azul nas buscas do Google.
            </span>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase">
                Descrição Curta do Site (Snippet)
              </label>
              <span
                className={`text-[10px] font-mono font-medium ${
                  (seo.description?.length || 0) <= 160 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {seo.description?.length || 0} / 160 caracteres recomendados
              </span>
            </div>
            <textarea
              rows={2}
              value={seo.description}
              onChange={(e) => updateSeo({ description: e.target.value.replace(/<[^>]*>/g, '') })}
              placeholder="Breve resumo que aparece abaixo do link..."
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
            <span className="block text-[10px] text-zinc-500 mt-1 font-light">
              Frase explicativa que aparece no Google e logo abaixo da miniatura ao enviar o link no WhatsApp.
            </span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Palavras-Chave de Busca (Meta Keywords)
            </label>
            <input
              type="text"
              value={seo.keywords || ''}
              onChange={(e) => updateSeo({ keywords: e.target.value.replace(/<[^>]*>/g, '') })}
              placeholder="Ex: Nua Borges, ensaios autorais, sexologia, fotografia editorial, modelo brasileira"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[10px] text-zinc-500 mt-1 font-light">
              Separe os termos de pesquisa por vírgula para auxiliar robôs de busca e redes sociais.
            </span>
          </div>

          {/* Social Share Image Picker */}
          <div className="md:col-span-2 pt-2 border-t border-white/[0.06]">
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1.5">
              Foto de Prévia para WhatsApp e Redes Sociais
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 p-3.5 rounded-lg bg-[#101116] border border-white/[0.06]">
              <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
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
                <p className="text-zinc-500 text-xs font-light mt-0.5 mb-2.5 leading-relaxed">
                  Esta foto aparece como miniatura de destaque quando alguém envia o link do seu site para amigos ou clientes.
                </p>
                <button
                  type="button"
                  onClick={() => setOgPickerOpen(true)}
                  className="h-8 px-4 rounded-full bg-[#f4a7b9] hover:bg-[#ffb8c9] text-zinc-950 font-semibold text-xs transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Trocar Foto de Prévia</span>
                </button>
              </div>
            </div>
          </div>

          {/* Prévia Visual Simulada */}
          <div className="md:col-span-2 pt-3 border-t border-white/[0.06]">
            <span className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-2.5">
              Prévia Visual do Link (Como seus fãs verão)
            </span>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* WhatsApp Card Preview */}
              <div className="p-3.5 rounded-xl bg-[#0b141a] border border-[#202c33] text-left">
                <span className="text-[10px] font-mono text-[#00a884] uppercase tracking-wider block mb-2 font-semibold">
                  No WhatsApp
                </span>
                <div className="rounded-lg overflow-hidden bg-[#111b21] border border-[#222e35]">
                  <div className="relative aspect-[16/9] w-full bg-black">
                    <Image
                      src={resolveMediaUrl(seo.ogImage)}
                      alt="Prévia WhatsApp"
                      fill
                      className="object-cover"
                      sizes="320px"
                    />
                  </div>
                  <div className="p-3">
                    <span className="text-[#e9edef] font-medium text-xs sm:text-sm line-clamp-1 block">
                      {seo.title || 'Nua Borges • Plataforma Oficial'}
                    </span>
                    <span className="text-[#8696a0] text-[11px] line-clamp-2 mt-0.5 font-light leading-relaxed block">
                      {seo.description || 'Ensaios autorais, produções exclusivas e contato direto com Nua Borges.'}
                    </span>
                    <span className="text-[#8696a0] text-[10px] font-mono mt-1.5 block">
                      nuaborges.com.br
                    </span>
                  </div>
                </div>
              </div>

              {/* Google Search Preview */}
              <div className="p-3.5 rounded-xl bg-[#202124] border border-zinc-700 text-left">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider block mb-2 font-semibold">
                  No Google
                </span>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#f4a7b9] text-black text-[10px] font-bold flex items-center justify-center font-script">
                      NB
                    </span>
                    <span className="text-zinc-400 text-[11px] font-mono">
                      https://nuaborges.com.br
                    </span>
                  </div>
                  <h5 className="text-[#8ab4f8] text-sm font-normal hover:underline cursor-pointer line-clamp-1">
                    {seo.title || 'Nua Borges • Plataforma Oficial'}
                  </h5>
                  <p className="text-[#bdc1c6] text-xs font-light line-clamp-2 leading-relaxed">
                    {seo.description || 'Ensaios autorais, produções exclusivas e contato direto com Nua Borges.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Texts */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight mb-0.5">
          Mensagem do Rodapé
        </h4>
        <p className="text-zinc-400 text-xs font-light mb-4 leading-relaxed">
          Informações de encerramento exibidas no final de todas as páginas do site.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Texto de Direitos Autorais
            </label>
            <input
              type="text"
              value={footer.copyrightText}
              onChange={(e) => updateFooter({ copyrightText: e.target.value })}
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[10px] font-semibold tracking-wider uppercase mb-1">
              Frase de Assinatura do Rodapé
            </label>
            <input
              type="text"
              value={footer.signOff}
              onChange={(e) => updateFooter({ signOff: e.target.value })}
              placeholder="Ex: Deixa de vergonha"
              className="w-full bg-[#0e0f14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Proteção Ativa das Imagens & Direitos Autorais */}
      <div className="rounded-xl bg-[#171821] border border-white/[0.06] p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-[#f4a7b9]/10 border border-[#f4a7b9]/20 flex items-center justify-center text-[#f4a7b9] shrink-0 mt-0.5">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-[#f4a7b9] text-[10px] font-semibold tracking-wider uppercase block">
              SEGURANÇA & PRIVACIDADE DO SEU ACERVO
            </span>
            <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight">
              Proteção Ativa de Fotos e Conteúdo
            </h4>
            <p className="text-zinc-400 text-xs font-light leading-relaxed">
              O seu site possui defesas integradas contra cópias não autorizadas, bloqueio de robôs rastreadores (scrapers) e otimização segura de mídia. Você não precisa configurar nada: o sistema protege suas imagens automaticamente em segundo plano.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-400">
              <span className="px-2.5 py-1 rounded-full bg-[#101116] border border-white/[0.06] text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Anti-Scraping Ativo
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#101116] border border-white/[0.06] text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Proteção de Download Fácil
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#101116] border border-white/[0.06] text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                CDN Cloudflare com SSL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset to approved default */}
      <div className="rounded-xl bg-rose-950/10 border border-rose-900/30 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-rose-300 font-semibold text-xs sm:text-sm mb-0.5">Restaurar Conteúdo Original</h4>
          <p className="text-zinc-400 text-xs font-light max-w-md leading-relaxed">
            Volta todos os textos e fotos para a versão original de lançamento aprovada.
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetAll}
          className="h-8 px-4 rounded-full border border-rose-800/80 hover:bg-rose-900/30 text-rose-300 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5"
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
