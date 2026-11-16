'use client';

import React from 'react';
import { AdminModuleId } from '@/types/admin';

/* -------------------------------------------------------------------------- */
/* 1. Base Skeleton & Shimmer Primitive                                       */
/* -------------------------------------------------------------------------- */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'pulse' | 'shimmer';
}

export function Skeleton({
  className = '',
  variant = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-xl bg-white/[0.04] border border-white/[0.04] ${
        variant === 'pulse' ? 'animate-pulse' : ''
      } ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Admin Header Skeleton                                                   */
/* -------------------------------------------------------------------------- */
export function AdminHeaderSkeleton() {
  return (
    <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#101116] border-b border-white/[0.06] flex items-center justify-between gap-4 shrink-0 z-20">
      {/* Esquerda: Monograma mobile e Título */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg md:hidden" />
        <Skeleton className="h-4 w-32 sm:w-44 rounded-md" />
      </div>

      {/* Centro: Barra de busca universal (Spotlight ⌘K) */}
      <div className="hidden lg:flex items-center justify-center flex-1 max-w-md mx-auto">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>

      {/* Direita: Status da Mensalidade, Ver Site, Alertas e Perfil */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <Skeleton className="hidden md:block h-7 w-28 rounded-full" />
        <Skeleton className="hidden sm:block h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-8 sm:w-20 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Admin Sidebar Skeleton                                                  */
/* -------------------------------------------------------------------------- */
export function AdminSidebarSkeleton() {
  return (
    <aside className="w-64 h-full bg-[#101116] border-r border-white/[0.06] p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div className="space-y-6">
        {/* Brand Monogram & Title */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded-md" />
          </div>
        </div>

        {/* Categoria 1: VISÃO GERAL */}
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-16 px-2 mb-2 rounded-sm" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>

        {/* Categoria 2: VENDAS E ATENDIMENTO */}
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-28 px-2 mb-2 rounded-sm" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>

        {/* Categoria 3: MEU SITE */}
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20 px-2 mb-2 rounded-sm" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>

      {/* Perfil no Rodapé */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-2 w-14 rounded-md" />
            </div>
          </div>
          <Skeleton className="w-6 h-6 rounded-md" />
        </div>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Page Header Skeleton                                                    */
/* -------------------------------------------------------------------------- */
export function PageHeaderSkeleton({ hasTabs = true }: { hasTabs?: boolean }) {
  return (
    <div className="pb-5 border-b border-white/[0.06] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 sm:h-7 w-48 sm:w-64 rounded-lg" />
          <Skeleton className="h-3.5 w-72 sm:w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {hasTabs && (
        <div className="flex items-center gap-2 pt-2 overflow-x-auto no-scrollbar">
          <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
          <Skeleton className="h-9 w-32 rounded-xl shrink-0" />
          <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Dashboard Module Skeleton                                               */
/* -------------------------------------------------------------------------- */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <PageHeaderSkeleton hasTabs={false} />

      {/* Grid de 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-2.5 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Atalhos Rápidos */}
      <div className="p-4 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-3">
        <Skeleton className="h-3.5 w-32 rounded-md" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Layout 2 Colunas: Fila de Pedidos & Próximas Chamadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Coluna 1: Encomendas em Produção */}
        <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-48 rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Coluna 2: Chamadas VIP Agendadas */}
        <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-40 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Library (Biblioteca de Mídias) Skeleton                                  */
/* -------------------------------------------------------------------------- */
export function LibrarySkeleton() {
  return (
    <div className="space-y-5 w-full">
      {/* Dropzone & Storage Header */}
      <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <Skeleton className="h-3.5 w-80 rounded-md" />
          </div>
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
        {/* Storage Bar Gauge */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Álbuns Bar */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
        <Skeleton className="h-14 w-36 rounded-xl shrink-0" />
        <Skeleton className="h-14 w-40 rounded-xl shrink-0" />
        <Skeleton className="h-14 w-36 rounded-xl shrink-0" />
        <Skeleton className="h-14 w-32 rounded-xl shrink-0" />
      </div>

      {/* Toolbar: Filtros & Busca */}
      <div className="p-3 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
          <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Grid de Mídias (12 cards responsivos) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-[#14161d] border border-white/[0.06] space-y-2 pb-2">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="px-2 space-y-1">
              <Skeleton className="h-3 w-3/4 rounded-sm" />
              <Skeleton className="h-2 w-1/2 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. Vitrine & Galeria de Ensaios Skeleton                                    */
/* -------------------------------------------------------------------------- */
export function GallerySkeleton() {
  return (
    <div className="space-y-5 w-full">
      {/* Painel Unificado da Galeria */}
      <div className="rounded-2xl bg-[#14161d] border border-white/[0.06] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3 w-72 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-36 rounded-xl" />
            <Skeleton className="h-9 w-40 rounded-xl" />
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>

        {/* Linhas de Fotos da Galeria */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-[#0e1015] border border-white/[0.06] flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton className="w-12 h-16 rounded-lg shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-40 rounded-md" />
                  <Skeleton className="h-2.5 w-60 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="w-10 h-6 rounded-full" />
                <Skeleton className="w-7 h-7 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VitrineSkeleton() {
  return (
    <div className="space-y-5 w-full">
      <PageHeaderSkeleton hasTabs={true} />
      <GallerySkeleton />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. Personalizados Module Skeleton                                          */
/* -------------------------------------------------------------------------- */
export function PersonalizadosSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <PageHeaderSkeleton hasTabs={true} />

      {/* Filtros e Busca */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-48 rounded-xl" />
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 sm:p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. Chamadas VIP Module Skeleton                                            */
/* -------------------------------------------------------------------------- */
export function ChamadasSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <PageHeaderSkeleton hasTabs={true} />

      {/* Grade Semanal / Horários Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="w-9 h-5 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-9 w-full rounded-xl" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. Conteúdos & Packs Skeleton                                             */
/* -------------------------------------------------------------------------- */
export function ConteudosSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <PageHeaderSkeleton hasTabs={true} />

      {/* Grid de Packs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-[#14161d] border border-white/[0.06] space-y-3 pb-4">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="px-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 rounded-md" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 11. Financeiro Skeleton                                                    */
/* -------------------------------------------------------------------------- */
export function FinanceiroSkeleton() {
  return (
    <div className="space-y-5 w-full">
      <PageHeaderSkeleton hasTabs={false} />

      {/* Grid de 6 Indicadores Financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-7 w-32 rounded-lg" />
            <Skeleton className="h-2.5 w-20 rounded-md" />
          </div>
        ))}
      </div>

      {/* Modalidades Comerciais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-3">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-2.5 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* Tabela de Transações */}
      <div className="p-5 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 12. Alertas & Histórico Skeleton                                           */
/* -------------------------------------------------------------------------- */
export function AlertasSkeleton() {
  return (
    <div className="space-y-5 w-full">
      <PageHeaderSkeleton hasTabs={false} />

      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-[#14161d] border border-white/[0.06] flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-56 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 13. Generic Module Fallback Skeleton                                       */
/* -------------------------------------------------------------------------- */
export function GenericModuleSkeleton() {
  return (
    <div className="space-y-6 w-full">
      <PageHeaderSkeleton hasTabs={true} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="p-6 rounded-2xl bg-[#14161d] border border-white/[0.06] space-y-4">
          <Skeleton className="h-5 w-36 rounded-md" />
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 14. Module Skeleton Router                                                 */
/* -------------------------------------------------------------------------- */
export function ModuleSkeletonRouter({ activeModule }: { activeModule?: AdminModuleId }) {
  switch (activeModule) {
    case 'dashboard':
      return <DashboardSkeleton />;
    case 'midias':
      return <LibrarySkeleton />;
    case 'vitrine':
      return <VitrineSkeleton />;
    case 'personalizados':
      return <PersonalizadosSkeleton />;
    case 'chamadas':
      return <ChamadasSkeleton />;
    case 'conteudos':
      return <ConteudosSkeleton />;
    case 'financeiro':
      return <FinanceiroSkeleton />;
    case 'alertas':
    case 'historico':
      return <AlertasSkeleton />;
    default:
      return <GenericModuleSkeleton />;
  }
}

/* -------------------------------------------------------------------------- */
/* 15. Master Admin Shell Skeleton (Root Page Loader)                         */
/* -------------------------------------------------------------------------- */
export function AdminShellSkeleton({ activeModule = 'dashboard' }: { activeModule?: AdminModuleId }) {
  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#0c0d12] text-white flex flex-col font-sans select-none">
      {/* Top Header Skeleton */}
      <AdminHeaderSkeleton />

      {/* Body: Sidebar + Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Skeleton */}
        <AdminSidebarSkeleton />

        {/* Main Content Area Skeleton */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#0c0d12]">
          <div className="max-w-7xl mx-auto">
            <ModuleSkeletonRouter activeModule={activeModule} />
          </div>
        </main>
      </div>
    </div>
  );
}
