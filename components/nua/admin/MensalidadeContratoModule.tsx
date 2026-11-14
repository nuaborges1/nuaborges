'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, FileText } from 'lucide-react';
import { SiteSubscriptionEditor } from './SiteSubscriptionEditor';
import { ContratosModule } from './ContratosModule';
import { PageHeader, AdminTabs } from './ui/AdminPrimitives';

interface MensalidadeContratoModuleProps {
  initialSection?: 'mensalidade' | 'contrato';
}

export function MensalidadeContratoModule({
  initialSection = 'mensalidade',
}: MensalidadeContratoModuleProps) {
  const [section, setSection] = useState<'mensalidade' | 'contrato'>(initialSection);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  return (
    <div className="space-y-5 select-none">
      <PageHeader
        title="Mensalidade e Contrato"
        subtitle="Acompanhe as parcelas de manutenção da plataforma, baixe recibos em PDF e consulte o contrato digital assinado."
        helpId={section === 'mensalidade' ? 'mensalidade_parcelas' : 'mensalidade_contrato'}
      >
        <AdminTabs
          activeId={section}
          onChange={setSection}
          ariaLabel="Mensalidade e Contrato"
          items={[
            {
              id: 'mensalidade',
              label: 'Mensalidade & Parcelas',
              icon: CreditCard,
            },
            {
              id: 'contrato',
              label: 'Contrato & Assinaturas',
              icon: FileText,
            },
          ]}
        />
      </PageHeader>

      {section === 'mensalidade' ? <SiteSubscriptionEditor /> : <ContratosModule />}
    </div>
  );
}
