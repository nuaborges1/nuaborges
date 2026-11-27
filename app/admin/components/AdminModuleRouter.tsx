'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import type { UnifiedOrderFeedItem } from '@/functions/api/admin/orders-feed';
import { ADMIN_MAIL_ENABLED, AdminModuleId } from './types';
import { DashboardModule } from '@/components/nua/admin/DashboardModule';

function ModuleChunkFallback() {
  return (
    <div className="space-y-4 animate-pulse py-4" aria-busy="true" aria-label="Carregando módulo">
      <div className="h-8 w-56 rounded-xl bg-white/[0.06]" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
      </div>
      <div className="h-64 rounded-2xl bg-white/[0.04] border border-white/[0.06]" />
    </div>
  );
}

const LibraryEditor = dynamic(
  () => import('@/components/nua/admin/LibraryEditor').then((m) => m.LibraryEditor),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const ConteudosPacksModule = dynamic(
  () => import('@/components/nua/admin/ConteudosPacksModule').then((m) => m.ConteudosPacksModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const PersonalizadosModule = dynamic(
  () => import('@/components/nua/admin/PersonalizadosModule').then((m) => m.PersonalizadosModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const ChamadasModule = dynamic(
  () => import('@/components/nua/admin/appointments').then((m) => m.ChamadasModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const VitrineCapaModule = dynamic(
  () => import('@/components/nua/admin/VitrineCapaModule').then((m) => m.VitrineCapaModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const ConexoesContatoModule = dynamic(
  () => import('@/components/nua/admin/ConexoesContatoModule').then((m) => m.ConexoesContatoModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const CommercialFinanceEditor = dynamic(
  () => import('@/components/nua/admin/CommercialFinanceEditor').then((m) => m.CommercialFinanceEditor),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const MensalidadeContratoModule = dynamic(
  () => import('@/components/nua/admin/MensalidadeContratoModule').then((m) => m.MensalidadeContratoModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const AlertasSistemaModule = dynamic(
  () => import('@/components/nua/admin/AlertasSistemaModule').then((m) => m.AlertasSistemaModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const ConfiguracoesModule = dynamic(
  () => import('@/components/nua/admin/ConfiguracoesModule').then((m) => m.ConfiguracoesModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const MusicEditor = dynamic(
  () => import('@/components/nua/admin/MusicEditor').then((m) => m.MusicEditor),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const BetaIaModule = dynamic(
  () => import('@/components/nua/admin/BetaIaModule').then((m) => m.BetaIaModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const DivulgacaoSeoModule = dynamic(
  () => import('@/components/nua/admin/DivulgacaoSeoModule').then((m) => m.DivulgacaoSeoModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const HistoricoPedidosModule = dynamic(
  () => import('@/components/nua/admin/HistoricoPedidosModule').then((m) => m.HistoricoPedidosModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const ClientesModule = dynamic(
  () => import('@/components/nua/admin/ClientesModule').then((m) => m.ClientesModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);
const MailModule = dynamic(
  () => import('@/components/nua/admin/MailModule').then((m) => m.MailModule),
  { ssr: false, loading: () => <ModuleChunkFallback /> }
);

interface AdminModuleRouterProps {
  activeModule: AdminModuleId;
  adminProfile?: 'nua' | 'phdev';
  subAction?: string | null;
  mailInitialSearch?: string;
  customerInitialSearch?: string;
  content: SiteContent;
  searchQuery: string;
  ordersFeed?: UnifiedOrderFeedItem[];
  unreadCount?: number;
  hasUnpublished?: boolean;
  isPublishing?: boolean;
  subscriptionStatus?: 'paid' | 'pending' | 'overdue' | 'loading';
  onPublish?: () => void;
  onContentChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onAdministrativeChange?: (
    updater: (prev: SiteContent) => SiteContent,
    options?: { summary?: string; feedbackMessage?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  onUploadNewImage: (img: LibraryImageItem) => void;
  onSelectModule: (id: AdminModuleId, subAction?: string) => void;
}

const SITE_DRAFT_MODULES: AdminModuleId[] = ['vitrine', 'seo', 'conexoes'];

export function AdminModuleRouter({
  activeModule,
  adminProfile = 'nua',
  subAction,
  mailInitialSearch = '',
  customerInitialSearch = '',
  content,
  searchQuery,
  ordersFeed = [],
  unreadCount = 0,
  hasUnpublished = false,
  isPublishing = false,
  subscriptionStatus = 'paid',
  onPublish = () => {},
  onContentChange,
  onAdministrativeChange,
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
          onAdministrativeChange={onAdministrativeChange}
          onUploadNew={onUploadNewImage}
        />
      )}

      {activeModule === 'conteudos' && (
        <ConteudosPacksModule
          content={content}
          onChange={onContentChange}
          onAdministrativeChange={onAdministrativeChange}
          onUploadNew={onUploadNewImage}
          searchQuery={searchQuery}
          initialPackToEdit={subAction}
          onOpenLibrary={() => onSelectModule('midias')}
        />
      )}

      {activeModule === 'personalizados' && (
        <PersonalizadosModule
          initialOrderId={
            subAction && !['pricing', 'orders', 'config', 'settings'].includes(subAction)
              ? subAction
              : null
          }
          searchQuery={searchQuery}
          content={content}
          onUploadNew={onUploadNewImage}
        />
      )}

      {activeModule === 'chamadas' && (
        <ChamadasModule
          selectedBookingId={subAction}
          onSelectBookingId={(id) => onSelectModule('chamadas', id || undefined)}
          searchQuery={searchQuery}
        />
      )}

      {activeModule === 'clientes' && (
        <ClientesModule
          searchQuery={searchQuery}
          initialSearch={customerInitialSearch}
          onSelectModule={onSelectModule}
          content={content}
          onContentChange={onContentChange}
        />
      )}

      {activeModule === 'vitrine' && (
        <VitrineCapaModule
          content={content}
          onChange={onContentChange}
          onAdministrativeChange={onAdministrativeChange}
          onUploadNew={onUploadNewImage}
          initialTab={subAction || undefined}
        />
      )}

      {activeModule === 'conexoes' && (
        <ConexoesContatoModule
          content={content}
          onChange={onContentChange}
          onAdministrativeChange={onAdministrativeChange}
          searchQuery={searchQuery}
          initialTab={subAction || undefined}
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

      {activeModule === 'configuracoes' && (
        <ConfiguracoesModule
          content={content}
          adminProfile={adminProfile}
          onContentChange={onContentChange}
          onAdministrativeChange={onAdministrativeChange}
        />
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
            const isAppointment = type === 'appointment';
            const isFinalized = isAppointment
              ? ['cancelado', 'cancelada', 'concluida', 'nao_compareceu', 'ausente'].includes(cleanStatus)
              : isPack ||
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
              onSelectModule('chamadas', orderId || undefined);
            } else {
              onSelectModule('conteudos');
            }
          }}
          onNavigateToSettings={() => onSelectModule('configuracoes')}
          onSelectModule={onSelectModule}
        />
      )}

      {activeModule === 'historico' && (
        <HistoricoPedidosModule initialSearch={subAction || historySearch} />
      )}

      {activeModule === 'seo' && (
        <DivulgacaoSeoModule
          content={content}
          onChange={onContentChange}
          onUploadNew={onUploadNewImage}
        />
      )}


      {ADMIN_MAIL_ENABLED && activeModule === 'mail' && (
        <MailModule initialSearch={mailInitialSearch} />
      )}
    </div>
  );
}
