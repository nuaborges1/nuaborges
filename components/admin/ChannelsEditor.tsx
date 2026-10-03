'use client';

import React, { useState } from 'react';
import { Plus, X, Share2, ExternalLink } from 'lucide-react';
import { SiteContent } from '@/lib/types';

interface ChannelsEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent) => void;
}

export function ChannelsEditor({ content, onChange }: ChannelsEditorProps) {
  const [newOnlyfansTag, setNewOnlyfansTag] = useState('');
  const [newInstagramTag, setNewInstagramTag] = useState('');

  const channels = content.channels;

  const updateChannels = (fields: Partial<typeof channels>) => {
    onChange({
      ...content,
      channels: { ...channels, ...fields },
    });
  };

  const updateOnlyFans = (fields: Partial<typeof channels.onlyfans>) => {
    updateChannels({
      onlyfans: { ...channels.onlyfans, ...fields },
    });
  };

  const updateInstagram = (fields: Partial<typeof channels.instagram>) => {
    updateChannels({
      instagram: { ...channels.instagram, ...fields },
    });
  };

  const updateContactBanner = (fields: Partial<typeof channels.contactBanner>) => {
    updateChannels({
      contactBanner: { ...channels.contactBanner, ...fields },
    });
  };

  const onlyfansTags = Array.isArray(channels?.onlyfans?.tags) ? channels.onlyfans.tags : [];
  const instagramTags = Array.isArray(channels?.instagram?.tags) ? channels.instagram.tags : [];

  // OnlyFans Tags helpers
  const handleAddOnlyfansTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOnlyfansTag.trim();
    if (!trimmed) return;
    if (!onlyfansTags.includes(trimmed)) {
      updateOnlyFans({ tags: [...onlyfansTags, trimmed] });
    }
    setNewOnlyfansTag('');
  };

  const handleRemoveOnlyfansTag = (tagToRemove: string) => {
    updateOnlyFans({
      tags: onlyfansTags.filter((t) => t !== tagToRemove),
    });
  };

  // Instagram Tags helpers
  const handleAddInstagramTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newInstagramTag.trim();
    if (!trimmed) return;
    if (!instagramTags.includes(trimmed)) {
      updateInstagram({ tags: [...instagramTags, trimmed] });
    }
    setNewInstagramTag('');
  };

  const handleRemoveInstagramTag = (tagToRemove: string) => {
    updateInstagram({
      tags: instagramTags.filter((t) => t !== tagToRemove),
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Section Header */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <div className="mb-6">
          <span className="text-[#f4a7b9] text-[11px] font-semibold tracking-wider uppercase block mb-1">
            CONEXÕES & PLATAFORMAS
          </span>
          <h3 className="font-serif text-xl sm:text-2xl text-white font-medium">Redes & Plataformas Oficiais</h3>
          <p className="text-zinc-400 text-xs sm:text-sm font-light mt-1 leading-relaxed">
            Configure a apresentação dos seus canais oficiais para direcionar seus seguidores e assinantes com total clareza e sofisticação.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto Pequeno no Topo
            </label>
            <input
              type="text"
              value={channels.eyebrow}
              onChange={(e) => updateChannels({ eyebrow: e.target.value })}
              placeholder="Ex: CANAIS OFICIAIS"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              Aparece em letras menores logo acima do título.
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Título da Seção
            </label>
            <input
              type="text"
              value={channels.title}
              onChange={(e) => updateChannels({ title: e.target.value })}
              placeholder="Ex: Presença & Conexão"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              O título principal que dá nome a este espaço.
            </span>
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto de Apresentação
            </label>
            <input
              type="text"
              value={channels.subtitle}
              onChange={(e) => updateChannels({ subtitle: e.target.value })}
              placeholder="Ex: Acompanhe a pesquisa, os diálogos sobre sexologia e os ensaios autorais exclusivos."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              Uma frase convidando o público a acompanhar você nas redes.
            </span>
          </div>
        </div>
      </div>

      {/* OnlyFans & Instagram Side-by-Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* OnlyFans Card Editor */}
        <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-4">
          <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="font-serif text-lg sm:text-xl text-white font-medium">Cartão do OnlyFans</h4>
            <span className="text-[10px] text-[#f4a7b9] font-bold tracking-wider uppercase bg-[#f4a7b9]/15 px-2.5 py-1 rounded-full border border-[#f4a7b9]/25">
              Acervo Exclusivo
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Etiqueta de Destaque
            </label>
            <input
              type="text"
              value={channels.onlyfans.badge}
              onChange={(e) => updateOnlyFans({ badge: e.target.value })}
              placeholder="Ex: ACERVO EXCLUSIVO"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
            <span className="block text-[11px] text-zinc-500 mt-1 font-light">
              Pequeno selo destacado no topo do cartão.
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Descrição do seu OnlyFans
            </label>
            <textarea
              rows={3}
              value={channels.onlyfans.description}
              onChange={(e) => updateOnlyFans({ description: e.target.value })}
              placeholder="Descreva o que o assinante encontra no seu perfil..."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Interactive Tags for OnlyFans */}
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Destaques e Benefícios ({onlyfansTags.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[32px] items-center">
              {onlyfansTags.length === 0 ? (
                <span className="text-zinc-500 text-xs italic font-light">
                  Nenhum benefício adicionado ainda. Digite um destaque abaixo e toque em + Adicionar.
                </span>
              ) : (
                onlyfansTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700/80 text-xs text-white"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOnlyfansTag(tag)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remover destaque"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newOnlyfansTag}
                onChange={(e) => setNewOnlyfansTag(e.target.value)}
                placeholder="Ex: Ensaios Completos"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOnlyfansTag(e);
                  }
                }}
                className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              />
              <button
                type="button"
                onClick={handleAddOnlyfansTag}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium transition-colors cursor-pointer shrink-0"
              >
                + Adicionar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Link do seu OnlyFans
            </label>
            <input
              type="url"
              value={channels.onlyfans.url}
              onChange={(e) => updateOnlyFans({ url: e.target.value })}
              placeholder="https://onlyfans.com/nuaborges"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
        </div>

        {/* Instagram Card Editor */}
        <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-4">
          <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
            <h4 className="font-serif text-lg sm:text-xl text-white font-medium">Cartão do Instagram</h4>
            <span className="text-[11px] text-zinc-300 font-mono bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {channels.instagram.handle || '@nuaborges'}
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Seu @ no Instagram
            </label>
            <input
              type="text"
              value={channels.instagram.handle}
              onChange={(e) => updateInstagram({ handle: e.target.value })}
              placeholder="@nuaborges"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Descrição do que você compartilha
            </label>
            <textarea
              rows={3}
              value={channels.instagram.description}
              onChange={(e) => updateInstagram({ description: e.target.value })}
              placeholder="Ex: Reflexões diárias sobre corpo, relações, liberdade e desmistificação do prazer..."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Interactive Tags for Instagram */}
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Temas do seu Perfil ({instagramTags.length})
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[32px] items-center">
              {instagramTags.length === 0 ? (
                <span className="text-zinc-500 text-xs italic font-light">
                  Nenhum tema adicionado ainda. Digite um tema abaixo e toque em + Adicionar.
                </span>
              ) : (
                instagramTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700/80 text-xs text-white"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInstagramTag(tag)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remover tema"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newInstagramTag}
                onChange={(e) => setNewInstagramTag(e.target.value)}
                placeholder="Ex: Educação Sexual"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddInstagramTag(e);
                  }
                }}
                className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#f4a7b9]"
              />
              <button
                type="button"
                onClick={handleAddInstagramTag}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white font-medium transition-colors cursor-pointer shrink-0"
              >
                + Adicionar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Link do seu Instagram
            </label>
            <input
              type="url"
              value={channels.instagram.url}
              onChange={(e) => updateInstagram({ url: e.target.value })}
              placeholder="https://instagram.com/nuaborges"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Commercial / Contact Strip Banner */}
      <div className="bg-[#09090c] border border-zinc-800 rounded-3xl p-5 sm:p-8">
        <h4 className="font-serif text-lg sm:text-xl text-white font-medium mb-1">
          Faixa de Contato Profissional & Imprensa
        </h4>
        <p className="text-zinc-400 text-xs sm:text-sm font-light mb-6 leading-relaxed">
          Esta chamada fica logo abaixo das suas redes sociais para atrair marcas, entrevistas e parcerias profissionais.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Título da Faixa
            </label>
            <input
              type="text"
              value={channels.contactBanner.title}
              onChange={(e) => updateContactBanner({ title: e.target.value })}
              placeholder="Ex: Parcerias & Imprensa"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto do Botão
            </label>
            <input
              type="text"
              value={channels.contactBanner.buttonText}
              onChange={(e) => updateContactBanner({ buttonText: e.target.value })}
              placeholder="Ex: Entrar em Contato"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-400 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
              Texto Explicativo
            </label>
            <input
              type="text"
              value={channels.contactBanner.description}
              onChange={(e) => updateContactBanner({ description: e.target.value })}
              placeholder="Ex: Para propostas comerciais, palestras ou projetos especiais."
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-base sm:text-sm outline-none focus:border-[#f4a7b9] transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
