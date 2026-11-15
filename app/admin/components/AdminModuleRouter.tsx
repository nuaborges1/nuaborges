'use client';

import React from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';
import { AdminModuleId } from './types';
import {
  DashboardModule,
  LibraryEditor,
  ConteudosPacksModule,
  PersonalizadosModule,
  ChamadasModule,
  VitrineCapaModule,
  ConexoesContatoModule,
  CommercialFinanceEditor,
  MensalidadeContratoModule,
  AlertasSistemaModule,
  CofreCredenciaisModule,
  ConfiguracoesModule,
  MusicEditor,
  BetaIaModule,
  DivulgacaoSeoModule,
} from '@/components/nua/admin';
import { HistoricoPedidosModule } from '@/components/nua/admin/HistoricoPedidosModule';

interface AdminModuleRouterProps {
  activeModule: AdminModuleId;
  subAction?: string | null;
  content: SiteContent;
  searchQuery: string;
  ordersFeed?: UnifiedOrderFeedItem[];
  unreadCount?: number;
  hasUnpublished?: boolean;
  isPublishing?: boolean;
  subscriptionStatus?: 'paid' | 'pending' | 'overdue' | 'loading';
  onPublish?: () => void;
  onContentChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNewImage: (img: LibraryImageItem) => void;
  onSelectModule: (id: AdminModuleId, subAction?: string) => void;
}

const SITE_DRAFT_MODULES: AdminModuleId[] = ['midias', 'vitrine', 'seo', 'conexoes'];

export function AdminModuleRouter({
  activeModule,
  subAction,
  content,
  searchQuery,
  ordersFeed = [],
  unreadCount = 0,
  hasUnpublished = false,
  isPublishing = false,
  subscriptionStatus = 'paid',
  onPublish = () => {},
  onContentChange,
  onUploadNewImage,
  onSelectModule,
}: AdminModuleRouterProps) {
  const [historySearch, setHistorySearch] = React.useState<string>('');
  const isDraftModule = SITE_DRAFT_MODULES.includes(activeModule);

  return (
    <div className="space-y-4">
      {activeModule === 'dashboard' && (
        <DashboardModule
          content={content}
          ordersFeed={ordersFeed}
          unreadCount={unreadCount}
          hasUnpublished={hasUnpublished}
          isPublishing={isPublishing}
          subscriptionStatus={subscriptionStatus}
          onPublish={onPublish}
          onSelectModule={onSelectModule}
        />
      )}

      {activeModule === 'midias' && (
        <LibraryEditor
          content={content}
          onChange={onContentChange}
          onUploadNew={onUploadNewImage}
        />
      )}

      {activeModule === 'conteudos' && (
        <ConteudosPacksModule
          content={content}
          onChange={onContentChange}
          onUploadNew={onUploadNewImage}
          searchQuery={searchQuery}
          initialPackToEdit={subAction}
          onOpenLibrary={() => onSelectModule('midias')}
        />
      )}

      {activeModule === 'personalizados' && (
        <PersonalizadosModule
          searchQuery={searchQuery}
          content={content}
          onUploadNew={onUploadNewImage}
        />
      )}

      {activeModule === 'chamadas' && (
        <ChamadasModule searchQuery={searchQuery} />
      )}

      {activeModule === 'vitrine' && (
        <VitrineCapaModule
          content={content}
          onChange={onContentChange}
          onUploadNew={onUploadNewImage}
        />
      )}

      {activeModule === 'conexoes' && (
        <ConexoesContatoModule
          content={content}
          onChange={onContentChange}
          searchQuery={searchQuery}
        />
      )}

      {activeModule === 'financeiro' && (
        <CommercialFinanceEditor searchQuery={searchQuery} />
      )}

      {activeModule === 'mensalidade' && (
        <MensalidadeContratoModule
          initialSection={subAction === 'contrato' ? 'contrato' : 'mensalidade'}
        />
      )}

      {activeModule === 'contratos' && (
        <MensalidadeContratoModule initialSection="contrato" />
      )}

      {activeModule === 'cofre' && (
        <CofreCredenciaisModule searchQuery={searchQuery} />
      )}

      {activeModule === 'configuracoes' && (
        <ConfiguracoesModule content={content} onContentChange={onContentChange} />
      )}

      {activeModule === 'beta_player' && (
        <MusicEditor />
      )}

      {activeModule === 'beta_ia' && (
        <BetaIaModule />
      )}

      {activeModule === 'alertas' && (
        <AlertasSistemaModule
          onNavigateToOrder={(orderId, type, status, customerName) => {
            const cleanStatus = (status || '').toLowerCase().trim();
            const isPack =
              type === ('pack' as any) ||
              (orderId && orderId.startsWith('ord_')) ||
              (customerName && customerName.toLowerCase().includes('pack'));
            const isFinalized =
              isPack ||
              [
                'paid',
                'approved',
                'pago',
                'pago_liberado',
                'liberado',
                'entregue',
                'cancelado',
                'cancelada',
                'concluida',
                'nao_compareceu',
                'ausente',
              ].includes(cleanStatus);

            if (isFinalized) {
              setHistorySearch(customerName || orderId || '');
              onSelectModule('historico');
              return;
            }

            if (type === 'personalizado') {
              onSelectModule('personalizados');
            } else if (type === 'appointment') {
              onSelectModule('chamadas');
            } else {
              onSelectModule('conteudos');
            }
          }}
          onNavigateToSettings={() => onSelectModule('configuracoes')}
          onSelectModule={onSelectModule}
        />
      )}

      {activeModule === 'historico' && (
        <HistoricoPedidosModule initialSearch={historySearch} />
      )}

      {activeModule === 'seo' && (
        <DivulgacaoSeoModule
          content={content}
          onChange={onContentChange}
          onUploadNew={onUploadNewImage}
        />
      )}
    </div>
  );
}
