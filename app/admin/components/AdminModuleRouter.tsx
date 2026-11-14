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
  const isDraftModule = SITE_DRAFT_MODULES.includes(activeModule);

  return (
    <div className="space-y-4">
      {/* Contextual Draft vs. Publish Guidance Bar (FASE 7) */}
      {isDraftModule && hasUnpublished && (
        <div className="p-3 sm:px-4 rounded-xl bg-[#18131a] border border-[#f4a7b9]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-zinc-200">
            <CheckCircle2 className="w-4 h-4 text-[#f4a7b9] shrink-0" />
            <span>
              <strong className="text-white font-semibold">Salvo no rascunho:</strong> suas alterações nesta página já estão guardadas. Clique em{' '}
              <strong className="text-[#f4a7b9]">Publicar alterações</strong> para atualizar o site público.
            </span>
          </div>
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="h-8 px-3.5 rounded-lg bg-[#f4a7b9] hover:bg-[#f9b8c6] text-zinc-950 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Send className="w-3 h-3" />
            <span>{isPublishing ? 'Publicando...' : 'Publicar agora'}</span>
          </button>
        </div>
      )}

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
          onNavigateToOrder={(_orderId, type) => {
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
