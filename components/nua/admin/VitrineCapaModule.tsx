'use client';

import React, { useState } from 'react';
import { LayoutTemplate, Images, User, PanelTop } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { HeroEditor } from './HeroEditor';
import { GalleryEditor } from './GalleryEditor';
import { AboutEditor } from './AboutEditor';
import { HeroHeaderForm, HeaderData } from './hero/HeroHeaderForm';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

interface VitrineCapaModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew: (img: LibraryImageItem) => void;
  initialTab?: 'hero' | 'gallery' | 'about' | 'header_footer';
}

export function VitrineCapaModule({
  content,
  onChange,
  onUploadNew,
  initialTab = 'hero',
}: VitrineCapaModuleProps) {
  const [activeTab, setActiveTab] = useState<'hero' | 'gallery' | 'about' | 'header_footer'>(initialTab);

  const header: HeaderData = content.header || {
    brandName: 'Nua Borges',
    brandMonogram: 'NB',
    navLogoStyle: 'editorial' as const,
    showInstagram: true,
    showOnlyFans: true,
    onlyFansText: 'ASSINAR CLUB',
    onlyFansUrl: 'https://onlyfans.com/nuaborges',
  };

  const footer = content.footer || {
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

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Editar Meu Site"
        subtitle="Personalize a foto e os textos da capa principal, a galeria pública de fotos, a seção Sobre Mim e o menu/rodapé do site."
      >
        <AdminTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Áreas de edição do site"
          items={[
            {
              id: 'hero',
              label: 'Foto e textos da capa',
              icon: LayoutTemplate,
            },
            {
              id: 'gallery',
              label: 'Galeria de fotos',
              icon: Images,
              badge: content.gallery?.photos?.length || undefined,
            },
            {
              id: 'about',
              label: 'Sobre mim',
              icon: User,
            },
            {
              id: 'header_footer',
              label: 'Topo e Rodapé',
              icon: PanelTop,
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

        {activeTab === 'header_footer' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <HeroHeaderForm
              header={header}
              onUpdateHeader={updateHeader}
            />

            {/* Mensagem do Rodapé */}
            <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-4">
              <div className="pb-3.5 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Mensagem do Rodapé
                </h3>
                <p className="text-zinc-400 text-xs font-light mt-0.5">
                  Informações de direitos autorais e assinatura exibidas no encerramento de todas as páginas.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    Texto de Direitos Autorais
                  </label>
                  <input
                    type="text"
                    value={footer.copyrightText}
                    onChange={(e) => updateFooter({ copyrightText: e.target.value })}
                    className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#f4a7b9] transition"
                  />
                  <span className="text-zinc-500 text-[11px] block mt-1">
                    Exibido na base do rodapé oficial.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                    Frase de Assinatura do Rodapé
                  </label>
                  <input
                    type="text"
                    value={footer.signOff}
                    onChange={(e) => updateFooter({ signOff: e.target.value })}
                    placeholder="Ex: Deixa de vergonha"
                    className="w-full h-9 bg-[#0e1015] border border-white/[0.08] rounded-xl px-3 text-xs text-white outline-none focus:border-[#f4a7b9] transition"
                  />
                  <span className="text-zinc-500 text-[11px] block mt-1">
                    Assinatura autoral no encerramento da página.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
