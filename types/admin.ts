/**
 * types/admin.ts — Tipos de domínio e navegação do Painel Administrativo Nua Borges
 * 
 * Centraliza os identificadores de módulo, abas e metadados de badge.
 * Evita dependências circulares entre páginas de rota (app/admin/page.tsx)
 * e componentes de apresentação (AdminHeader, AdminSidebar, NotificationCenter).
 */

export type AdminModuleId =
  | 'dashboard'
  | 'midias'
  | 'conteudos'
  | 'personalizados'
  | 'chamadas'
  | 'vitrine'
  | 'conexoes'
  | 'financeiro'
  | 'contratos'
  | 'cofre'
  | 'configuracoes'
  | 'alertas'
  | 'seo'
  | 'beta_player'
  | 'beta_ia'
  | 'mensalidade';

export type AdminTab = AdminModuleId | string;

export interface ModuleBadgeInfo {
  count?: number;
  label?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}
