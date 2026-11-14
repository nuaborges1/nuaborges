'use client';

import React from 'react';
import { SiteContent, LibraryImageItem } from '@/lib/types';
import { AdminModuleId } from './types';
import {
  ConteudosPacksModule,
  PersonalizadosModule,
  ChamadasModule,
  VitrineCapaModule,
  ConexoesContatoModule,
  CommercialFinanceEditor,
  SiteSubscriptionEditor,
  AlertasSistemaModule,
  ContratosModule,
  CofreCredenciaisModule,
  ConfiguracoesModule,
  MusicEditor,
  BetaIaModule,
  DivulgacaoSeoModule,
} from '@/components/nua/admin';

interface AdminModuleRouterProps {
  activeModule: AdminModuleId;
  content: SiteContent;
  searchQuery: string;
  onContentChange: (updated: SiteContent | ((prev: SiteContent) => SiteContent)) => void;
  onUploadNewImage: (img: LibraryImageItem) => void;
  onSelectModule: (id: AdminModuleId, subAction?: string) => void;
}

export function AdminModuleRouter({
  activeModule,
  content,
  searchQuery,
  onContentChange,
  onUploadNewImage,
  onSelectModule,
}: AdminModuleRouterProps) {
  return (
    <>
      {activeModule === 'conteudos' && (
        <ConteudosPacksModule
          content={content}
          onChange={onContentChange}
          onUploadNew={onUploadNewImage}
          searchQuery={searchQuery}
        />
      )}

      {activeModule === 'personalizados' && (
        <PersonalizadosModule searchQuery={searchQuery} />
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

      {activeModule === 'contratos' && (
        <ContratosModule />
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

      {activeModule === 'mensalidade' && (
        <SiteSubscriptionEditor />
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
        />
      )}

      {activeModule === 'seo' && (
        <DivulgacaoSeoModule
          content={content}
          onChange={onContentChange}
          onUploadNew={onUploadNewImage}
        />
      )}
    </>
  );
}
