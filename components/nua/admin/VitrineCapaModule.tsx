/* Vinho maduro / Nua Borges */
'use client';

import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Images, User, PanelTop, HelpCircle, Globe, ShieldCheck } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { HeroEditor } from './HeroEditor';
import { GalleryEditor } from './GalleryEditor';
import { AboutEditor } from './AboutEditor';
import { FaqVipEditor } from './FaqVipEditor';
import { SeoEditor } from './SeoEditor';
import { InstitutionalEditor } from './InstitutionalEditor';
import { HeroHeaderForm, HeaderData } from './hero/HeroHeaderForm';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

type VitrineTabId = 'hero' | 'gallery' | 'about' | 'faq_vip' | 'header_footer' | 'seo' | 'legal';

function normalizeVitrineTab(raw?: string): VitrineTabId {
  const clean = (raw || '').toLowerCase().trim();
  if (clean === 'sobre' || clean === 'about') return 'about';
  if (clean === 'galeria' || clean === 'gallery') return 'gallery';
  if (clean === 'faq' || clean === 'faq_vip' || clean === 'vip') return 'faq_vip';
  if (clean === 'topo' || clean === 'rodape' || clean === 'header_footer') return 'header_footer';
  if (clean === 'seo' || clean === 'google' || clean === 'divulgacao') return 'seo';
  if (clean === 'legal' || clean === 'termos' || clean === 'privacidade') return 'legal';
  return 'hero';
}

interface VitrineCapaModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onUploadNew: (img: LibraryImageItem) => void;
  initialTab?: string;
}

export function VitrineCapaModule({
  content,
  onChange,
  onAdministrativeChange,
  onUploadNew,
  initialTab = 'hero',
}: VitrineCapaModuleProps) {
  const [activeTab, setActiveTab] = useState<VitrineTabId>(() => normalizeVitrineTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeVitrineTab(initialTab));
    }
  }, [initialTab]);

  const header: HeaderData = content.header || {
    brandName: 'Nua Borges',
    showInstagram: true,
    showOnlyFans: true,
    onlyFansText: 'Acervo VIP',
    onlyFansUrl: '/acervo',
  };

  const footer = content.footer || {
    brandName: 'Nua Borges',
    role: 'Educadora Sexual & Criadora Autoral',
    concept: 'Arte, liberdade e intimidade sem tabus.',
    copyrightText: '© Nua Borges. Todos os direitos reservados.',
    signOff: 'Deixa de vergonha',
  };

  const updateHeader = (fields: Partial<HeaderData>) => {
    onChange((prev) => ({
      ...prev,
      header: {
        ...(prev.header || header),
        ...fields,
      },
    }));
  };

  const updateFooter = (fields: Partial<typeof footer>) => {
    onChange((prev) => ({
      ...prev,
      footer: {
        ...(prev.footer || footer),
        ...fields,
      },
    }));
  };

  const currentHelpId =
    activeTab === 'hero'
      ? 'vitrine_capa'
      : activeTab === 'gallery'
      ? 'vitrine_galeria'
      : activeTab === 'about'
      ? 'vitrine_sobre'
      : 'vitrine_topo_rodape';

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Editar Meu Site"
        subtitle="Escolha abaixo qual parte do seu site você quer atualizar. Tudo é simples e salvo com segurança."
        helpId={currentHelpId}
      >
        <AdminTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Partes do site para editar"
          items={[
            {
              id: 'hero',
              label: 'Capa do Site',
              icon: LayoutTemplate,
            },
            {
              id: 'about',
              label: 'Sobre Mim',
              icon: User,
            },
            {
              id: 'gallery',
              label: 'Vitrine de Fotos',
              icon: Images,
              badge: content.gallery?.photos?.length || undefined,
            },
            {
              id: 'faq_vip',
              label: 'Dúvidas & Lista VIP',
              icon: HelpCircle,
            },
            {
              id: 'header_footer',
              label: 'Topo e Rodapé',
              icon: PanelTop,
            },
            {
              id: 'seo',
              label: 'Google e WhatsApp',
              icon: Globe,
            },
            {
              id: 'legal',
              label: 'Páginas Legais',
              icon: ShieldCheck,
            },
          ]}
        />
      </PageHeader>

      {/* Conteúdo da Aba Selecionada */}
      <div className="w-full">
        {activeTab === 'hero' && (
          <HeroEditor
            content={content}
            onChange={onChange}
            onUploadNew={onUploadNew}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryEditor
            content={content}
            onChange={onChange}
            onAdministrativeChange={onAdministrativeChange}
            onUploadNew={onUploadNew}
          />
        )}

        {activeTab === 'about' && (
          <AboutEditor
            content={content}
            onChange={onChange}
            onUploadNew={onUploadNew}
          />
        )}

        {activeTab === 'faq_vip' && (
          <FaqVipEditor
            content={content}
            onChange={onChange}
          />
        )}

        {activeTab === 'header_footer' && (
          <div id="admin-footer-section" data-field="footer.section" className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <HeroHeaderForm
              header={header}
              onUpdateHeader={updateHeader}
            />

            {/* Rodapé do Site */}
            <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-5">
              <div className="pb-3.5 border-b border-white/[0.06]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c8647d] block mb-0.5">
                  Final do Site
                </span>
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Rodapé (Final de Todas as Páginas)
                </h3>
                <p className="text-zinc-400 text-xs font-light mt-0.5">
                  Frases curtas que aparecem lá embaixo no encerramento do site.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-200 block mb-1.5">
                    Sua Profissão no Rodapé
                  </label>
                  <input
                    type="text"
                    value={footer.role || ''}
                    onChange={(e) => updateFooter({ role: e.target.value })}
                    placeholder="Ex: Educadora Sexual & Criadora Autoral"
                    className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52] transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-200 block mb-1.5">
                    Frase Curta ao Lado da Profissão
                  </label>
                  <input
                    type="text"
                    value={footer.concept || ''}
                    onChange={(e) => updateFooter({ concept: e.target.value })}
                    placeholder="Ex: Arte, liberdade e intimidade sem tabus."
                    className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52] transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-200 block mb-1.5">
                    Sua Frase de Despedida no Canto Direito
                  </label>
                  <input
                    type="text"
                    value={footer.signOff}
                    onChange={(e) => updateFooter({ signOff: e.target.value })}
                    placeholder="Ex: Deixa de vergonha"
                    className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52] transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-200 block mb-1.5">
                    Aviso de Direitos Reservados
                  </label>
                  <input
                    type="text"
                    value={footer.copyrightText}
                    onChange={(e) => updateFooter({ copyrightText: e.target.value })}
                    className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#843C52] transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && <SeoEditor content={content} onChange={onChange} />}

        {activeTab === 'legal' && <InstitutionalEditor content={content} onChange={onChange} />}
      </div>
    </div>
  );
}
