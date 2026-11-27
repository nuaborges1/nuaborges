/**
 * Tipos compartilhados da Pasta Central Controladora (`functions/api/_central/`).
 */

import type { UserRole } from '../_authHelper';
import type { AdminCapability } from './adminCapabilities';

export type RouteSurface =
  | 'public'
  | 'customer'
  | 'admin'
  | 'superadmin'
  | 'contract'
  | 'webhook'
  | 'cron';

export type AuthMode =
  | 'none'
  | 'admin_rbac'
  | 'superadmin_only'
  | 'cron_or_superadmin'
  | 'customer_handler'
  | 'contract_handler'
  | 'webhook_signed'
  | 'cron_secret';

export type CsrfMode = 'strict_cookie' | 'exempt_signed' | 'none';

export interface RateLimitPolicy {
  bucket: string;
  maxRequests: number;
  windowSeconds: number;
}

type AdminAuthMode = Extract<AuthMode, 'admin_rbac' | 'superadmin_only' | 'cron_or_superadmin'>;

type RouteAuthorization =
  | { auth: AdminAuthMode; adminCapability: AdminCapability }
  | { auth: Exclude<AuthMode, AdminAuthMode>; adminCapability?: never };

export type RoutePolicy = RouteAuthorization & {
  /** Prefixo ou rota exata (ex: '/api/admin/customers' ou '/api/media/*') */
  pattern: string;
  /** Métodos HTTP permitidos ('*' para qualquer método suportado pelo handler) */
  methods?: string[];
  surface: RouteSurface;
  csrf: CsrfMode;
  /** Módulo controlável via kill-switch em /api/control/system */
  moduleKey?: string;
  /** Rate limit aplicado automaticamente no gateway (opcional) */
  rateLimit?: RateLimitPolicy;
  /** Permite acesso mesmo em modo manutenção global */
  bypassMaintenance?: boolean;
};

export interface CentralActor {
  role: UserRole;
  subject: string;
  jti?: string;
  authMethod: 'cookie' | 'bearer' | 'master_key' | 'local_dev' | 'local_session' | 'cron_secret';
}

export interface KillSwitchFlags {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  disabledModules: string[];
  updatedAt: string | null;
}

export interface CentralEnv {
  ENVIRONMENT?: string;
  NODE_ENV?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  ADMIN_API_SECRET?: string;
  NUA_ID_SECRET?: string;
  MEDIA_SIGNING_SECRET?: string;
  IP_HASH_SECRET?: string;
  CRON_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  MP_ACCESS_TOKEN?: string;
  MP_WEBHOOK_SECRET?: string;
  MP_WEBHOOK_URL?: string;
  MP_SANDBOX_MODE?: string;
  MP_TEST_USER_ACCOUNT_ID?: string;
  MP_FORBIDDEN_PROD_ACCOUNT_ID?: string;
  STAGING_WEBHOOK_HOSTS?: string;
  PRODUCTION_WEBHOOK_HOSTS?: string;
  DEV_PIX_KEY?: string;
  DEV_PIX_MERCHANT_NAME?: string;
  DEV_PIX_MERCHANT_CITY?: string;
  TURNSTILE_SECRET_KEY?: string;
  [key: string]: any;
}

export interface PagesMiddlewareContext<T = CentralEnv> {
  request: Request;
  env: T;
  next: () => Promise<Response>;
  data?: Record<string, any>;
  waitUntil?: (promise: Promise<any>) => void;
}
