'use client';

import React, { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { SeoEditor } from './SeoEditor';
import { InstitutionalEditor } from './InstitutionalEditor';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

interface DivulgacaoSeoModuleProps {
  content: SiteContent;
  onChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNew?: (img: LibraryImageItem) => void;
  initialTab?: 'seo' | 'legal';
}

export function DivulgacaoSeoModule({
  content,
  onChange,
  onUploadNew,
  initialTab = 'seo',
}: DivulgacaoSeoModuleProps) {
  const [activeTab, setActiveTab] = useState<'seo' | 'legal'>(initialTab);

  return (
    <div id="admin-seo-section" data-field="seo.section" className="space-y-6">
      <PageHeader
        title="Divulgação & Google"
        subtitle="Configure como seu link aparece no WhatsApp, Instagram e Google, e gerencie os termos legais e políticas de privacidade."
        helpId={activeTab === 'seo' ? 'seo_divulgacao' : 'seo_legal'}
      >
        <AdminTabs
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Abas de Divulgação e Legal"
          items={[
            {
              id: 'seo',
              label: 'Divulgação & Google',
              icon: Search,
            },
            {
              id: 'legal',
              label: 'Páginas Legais & Termos',
              icon: FileText,
              badge: content.institutional?.links?.length || 0,
            },
          ]}
        />
      </PageHeader>

      <div className="w-full">
        {activeTab === 'seo' && (
          <SeoEditor
            content={content}
            onChange={onChange}
            onUploadNew={onUploadNew}
          />
        )}

        {activeTab === 'legal' && (
          <InstitutionalEditor
            content={content}
            onChange={onChange}
          />
        )}
      </div>
    </div>
  );
}
