/**
 * types/admin.ts — Tipos de domínio e navegação do Painel Administrativo Nua Borges
 * 
 * Centraliza os identificadores de módulo, abas e metadados de badge.
 * Evita dependências circulares entre páginas de rota (app/admin/page.tsx)
 * e componentes de apresentação (AdminHeader, AdminSidebar, NotificationCenter).
 */

export type AdminModuleId =
  | 'dashboard'
  | 'alertas'
  | 'historico'
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
