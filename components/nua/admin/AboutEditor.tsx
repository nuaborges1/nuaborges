/* Vinho maduro / Nua Borges */
'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import {
  ImageIcon,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Tag,
  MousePointerClick,
} from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { ImagePickerModal } from './ImagePickerModal';
import { resolveMediaUrl } from '@/lib/media';
import { RichTextPostEditor, RichTextPostEditorHandle } from './ui/RichTextPostEditor';

interface AboutEditorProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
}

const SUGGESTED_TAGS = [
  'Sexologia',
  'Fotografia Autoral',
  'Educação Sexual',
  'Ensaios Exclusivos',
  'Atendimento Sigiloso',
  'Autoconhecimento',
  'Dublin & Brasil',
];

const CTA_PRESETS = [
  { label: 'Acervo VIP', url: '/acervo' },
  { label: 'Packs Avulsos', url: '/avulsos' },
  { label: 'Personalizados', url: '/personalizados' },
  { label: 'Chamadas VIP', url: '/chamadas' },
];

export function AboutEditor({ content, onChange, onUploadNew }: AboutEditorProps) {
  const [pickerMode, setPickerMode] = useState<'cover' | 'inline-insert' | 'inline-replace' | null>(null);
  const [replacingCurrentUrl, setReplacingCurrentUrl] = useState<string | undefined>(undefined);
  const [showFooterOptions, setShowFooterOptions] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const editorHandleRef = useRef<RichTextPostEditorHandle | null>(null);

  const about = content.about;
  const tags = Array.isArray(about.tags) ? about.tags : [];

  // Usa about.body diretamente; se ainda não existir ou for vazio, herda os parágrafos anteriores
  const bodyValue =
    typeof about.body === 'string' && about.body.trim() !== ''
      ? about.body
      : [about.paragraph1, about.paragraph2, about.paragraph3]
          .map((p) => (p || '').trim())
          .filter(Boolean)
          .join('\n\n');

  const updateAbout = (fields: Partial<typeof about>) => {
    onChange((prev) => ({
      ...prev,
      about: { ...prev.about, extraPhotos: [], ...fields },
    }));
  };

  const handleBodyChange = (nextBody: string) => {
    const cleanBody = (nextBody || '').trim();
    const firstParagraph =
      cleanBody
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .find((p) => p && !p.startsWith('[img') && !p.startsWith('#') && p !== '---') || '';

    updateAbout({
      body: nextBody,
      paragraph1: firstParagraph || about.paragraph1,
    });
  };

  const handleAddTag = (tagToAdd?: string) => {
    const clean = (tagToAdd ?? newTagInput).trim();
    if (!clean) return;
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setNewTagInput('');
      return;
    }
    updateAbout({ tags: [...tags, clean] });
    setNewTagInput('');
  };

  const handleRemoveTag = (idx: number) => {
    updateAbout({ tags: tags.filter((_, i) => i !== idx) });
  };

  return (
    <div id="admin-about-section" className="w-full space-y-5">
      <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 sm:p-6 space-y-5">
        {/* 1. Cabeçalho Compacto de Autora (Foto + Como se apresenta) */}
        <div
          data-field="about.photoUrl"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]"
        >
          <div className="flex items-center gap-4">
            <div
              onClick={() => setPickerMode('cover')}
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#0e1015] border border-white/10 shrink-0 cursor-pointer group"
              title="Clique para trocar sua foto principal"
            >
              {about.photoUrl ? (
                <Image
                  src={resolveMediaUrl(about.photoUrl)}
                  alt="Nua Borges"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] text-center px-1">
                  Sem capa
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-serif text-white font-medium">Nua Borges</span>

                {about.showCoverPhoto !== false && about.photoUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        updateAbout({ showCoverPhoto: true });
                        setPickerMode('cover');
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#843C52]/20 hover:bg-[#843C52]/35 border border-[#843C52]/40 text-[#f3d4dc] text-[11px] font-medium transition cursor-pointer"
                      title="Escolher outra imagem para a capa do post"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Trocar Foto de Capa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateAbout({ showCoverPhoto: false })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
                      title="Remover a capa: o artigo começará diretamente no seu texto e fotos"
                    >
                      <X className="w-3 h-3" />
                      <span>Deixar sem Foto de Capa</span>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-[10.5px]">
                      Sem capa no topo
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        updateAbout({ showCoverPhoto: true });
                        setPickerMode('cover');
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#843C52]/25 hover:bg-[#843C52]/40 border border-[#843C52]/50 text-[#f3d4dc] text-[11px] font-medium transition cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3" />
                      <span>Adicionar Foto de Capa</span>
                    </button>
                  </>
                )}
              </div>
              <input
                type="text"
                value={about.role}
                onChange={(e) => updateAbout({ role: e.target.value })}
                placeholder="Como você se apresenta (Ex: Educadora Sexual & Criadora Autoral)"
                className="w-full sm:w-80 h-8 bg-[#0e1015] border border-white/[0.08] rounded-lg px-2.5 text-xs text-zinc-200 outline-none focus:border-[#843C52]"
              />
            </div>
          </div>

          <div className="sm:text-right">
            <label className="block text-[11px] text-zinc-400 mb-1">
              Assinatura no final do post
            </label>
            <input
              type="text"
              value={about.signature}
              onChange={(e) => updateAbout({ signature: e.target.value })}
              placeholder="Ex: Deixa de vergonha ♡"
              className="w-full sm:w-52 h-8 bg-[#0e1015] border border-white/[0.08] rounded-lg px-2.5 text-xs text-[#e388a0] font-serif italic outline-none focus:border-[#843C52]"
            />
          </div>
        </div>

        {/* 2. Título do Post e Frase de Abertura */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div data-field="about.headline">
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-1.5">
              Título da Sua Biografia
            </label>
            <input
              type="text"
              value={about.headline}
              onChange={(e) => updateAbout({ headline: e.target.value })}
              placeholder="Ex: A coragem de despir a vergonha."
              className="w-full bg-[#0e1015] border border-white/[0.08] focus:border-[#843C52] rounded-xl px-4 py-2.5 text-white text-base sm:text-lg font-serif outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-1.5">
              Subtítulo ou Frase de Abertura (Opcional)
            </label>
            <input
              type="text"
              value={about.pullQuote || ''}
              onChange={(e) => updateAbout({ pullQuote: e.target.value })}
              placeholder="Ex: A vergonha é a primeira fronteira que nos impõem. Meu trabalho é ajudar a derrubá-la."
              className="w-full bg-[#0e1015] border border-white/[0.08] focus:border-[#843C52] rounded-xl px-4 py-2.5 text-zinc-200 text-xs sm:text-sm italic font-serif outline-none transition-colors"
            />
          </div>
        </div>

        {/* 3. Corpo do Post / Biografia */}
        <div data-field="about.bio">
          <RichTextPostEditor
            label="Seu Post / Biografia"
            value={bodyValue}
            onChange={handleBodyChange}
            rows={14}
            headlineContext={about.headline}
            roleContext={about.role}
            onRequestInsertImage={() => setPickerMode('inline-insert')}
            onRequestReplaceImage={(currentUrls) => {
              setReplacingCurrentUrl(currentUrls[0]);
              setPickerMode('inline-replace');
            }}
            editorHandleRef={editorHandleRef}
            placeholder="Conte sua história, trajetória, curiosidades e pensamentos livremente. Use a barra de ferramentas para formatar o texto e inserir fotos da sua biblioteca..."
          />
        </div>

        {/* 4. Gaveta Discreta no Rodapé da Folha: Palavras-Chave e Botões de Convite */}
        <div className="pt-2 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowFooterOptions((prev) => !prev)}
            className="w-full flex items-center justify-between py-2 text-left text-xs text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <span>
              Opções do final da página: <strong className="text-zinc-200 font-medium">Palavras-chave e Botão de Convite</strong>
            </span>
            {showFooterOptions ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showFooterOptions && (
            <div className="mt-3 pt-4 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Etiquetas / Tags do Post */}
              <div className="p-4 rounded-2xl bg-[#0e1015] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#c8647d]" />
                  <span className="text-xs font-medium text-white">
                    Etiquetas do Post
                  </span>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, idx) => (
                      <span
                        key={`${tag}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#843C52]/20 border border-[#843C52]/40 text-xs text-[#f3d4dc]"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(idx)}
                          className="text-zinc-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Nova etiqueta..."
                    className="flex-1 h-8 bg-[#14161d] border border-white/[0.08] rounded-lg px-3 text-xs text-white outline-none focus:border-[#843C52]"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="h-8 px-3 rounded-lg bg-[#843C52] hover:bg-[#992b4a] text-white text-xs font-medium inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_TAGS.filter((s) => !tags.includes(s)).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddTag(sug)}
                      className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão Final do Post */}
              <div className="p-4 rounded-2xl bg-[#0e1015] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-[#c8647d]" />
                  <span className="text-xs font-medium text-white">
                    Botão no Final do Post
                  </span>
                </div>

                <input
                  type="text"
                  value={about.primaryCtaText ?? 'Conhecer o Acervo VIP'}
                  onChange={(e) => updateAbout({ primaryCtaText: e.target.value })}
                  placeholder="Conhecer o Acervo VIP"
                  className="w-full h-8 bg-[#14161d] border border-white/[0.08] rounded-lg px-3 text-white text-xs outline-none focus:border-[#843C52]"
                />

                <div className="flex flex-wrap gap-1.5">
                  {CTA_PRESETS.map((preset) => {
                    const active = (about.primaryCtaUrl || '/acervo') === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => updateAbout({ primaryCtaUrl: preset.url })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] border transition cursor-pointer ${
                          active
                            ? 'bg-[#843C52]/25 border-[#843C52] text-white font-medium'
                            : 'bg-[#14161d] border-white/[0.08] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Escolha de Foto (Suporta 1 foto ou 2-3 fotos lado a lado no post) */}
      <ImagePickerModal
        publicOnly
        isOpen={pickerMode !== null}
        library={content.library}
        albums={content.albums}
        selectionMode={pickerMode === 'inline-insert' || pickerMode === 'inline-replace' ? 'multiple' : 'single'}
        title={
          pickerMode === 'inline-insert'
            ? 'Inserir Foto(s) no Post (selecione 1 foto ou até 3 para ficarem lado a lado)'
            : pickerMode === 'inline-replace'
            ? 'Trocar Foto(s) deste Bloco do Post'
            : 'Escolher Foto de Capa do Sobre Mim'
        }
        currentImageUrl={
          pickerMode === 'cover'
            ? about.photoUrl
            : pickerMode === 'inline-replace'
            ? replacingCurrentUrl
            : undefined
        }
        onSelect={(url) => {
          if (pickerMode === 'cover') {
            updateAbout({ photoUrl: url });
          } else if (pickerMode === 'inline-insert') {
            editorHandleRef.current?.insertImages([url]);
          } else if (pickerMode === 'inline-replace') {
            editorHandleRef.current?.replaceActiveImage([url]);
          }
          setPickerMode(null);
          setReplacingCurrentUrl(undefined);
        }}
        onSelectMultiple={
          pickerMode === 'inline-insert' || pickerMode === 'inline-replace'
            ? (urls) => {
                const picked = urls.slice(0, 3);
                if (pickerMode === 'inline-insert') {
                  editorHandleRef.current?.insertImages(picked);
                } else {
                  editorHandleRef.current?.replaceActiveImage(picked);
                }
                setPickerMode(null);
                setReplacingCurrentUrl(undefined);
              }
            : undefined
        }
        onUploadNew={onUploadNew}
        onClose={() => {
          setPickerMode(null);
          setReplacingCurrentUrl(undefined);
        }}
      />
    </div>
  );
}
