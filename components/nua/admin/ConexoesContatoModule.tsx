'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Mail } from 'lucide-react';
import { SiteContent } from '@/lib/types';
import { ChannelsEditor } from './ChannelsEditor';
import { ContactEditor } from './ContactEditor';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

interface ConexoesContatoModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  initialTab?: string;
  searchQuery?: string;
}

function normalizeConexoesTab(raw?: string): 'channels' | 'contact' {
  const clean = (raw || '').toLowerCase().trim();
  if (clean === 'contact' || clean === 'contato' || clean === 'email') return 'contact';
  return 'channels';
}

export function ConexoesContatoModule({
  content,
  onChange,
  onAdministrativeChange,
  initialTab = 'channels',
}: ConexoesContatoModuleProps) {
  const [activeTab, setActiveTab] = useState<'channels' | 'contact'>(() =>
    normalizeConexoesTab(initialTab)
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeConexoesTab(initialTab));
    }
  }, [initialTab]);

  const activeChannelsCount = [
    content.channels?.onlyfans,
    content.channels?.instagram,
    content.channels?.privacy,
    content.channels?.closefans,
  ].filter(Boolean).length;

  const currentHelpId = activeTab === 'channels' ? 'conexoes_redes' : 'conexoes_contato';

  return (
    <div id="admin-conexoes-section" data-field="conexoes.section" className="space-y-5">
      <PageHeader
        title="Redes e Contato"
        subtitle="Gerencie os links das suas plataformas de assinatura, redes sociais e o formulário de contato comercial."
        helpId={currentHelpId}
      >
        <AdminTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Áreas de conexões e contato"
          items={[
            {
              id: 'channels',
              label: 'Redes sociais e plataformas',
              icon: Share2,
              badge: activeChannelsCount,
            },
            {
              id: 'contact',
              label: 'Contato comercial',
              icon: Mail,
            },
          ]}
        />
      </PageHeader>

      <div className="w-full">
        {activeTab === 'channels' && (
          <ChannelsEditor
            content={content}
            onChange={(updated) => onChange(updated)}
            onAdministrativeChange={onAdministrativeChange}
          />
        )}

        {activeTab === 'contact' && (
          <ContactEditor
            content={content}
            onChange={(updated) => onChange(updated)}
          />
        )}
      </div>
    </div>
  );
}
