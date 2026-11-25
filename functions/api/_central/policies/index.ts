/**
 * Resolvedor Central de Políticas de Rota (Default-Deny).
 *
 * Qualquer endpoint sob `/api/*` que não corresponda a uma política registrada
 * é bloqueado automaticamente pelo pipeline central antes de chegar ao handler.
 */

import type { RoutePolicy } from '../types';
import { PUBLIC_POLICIES } from './public.policies';
import { CUSTOMER_POLICIES } from './customer.policies';
import { COMMERCE_POLICIES } from './commerce.policies';
import { ADMIN_POLICIES } from './admin.policies';

export const ALL_ROUTE_POLICIES: RoutePolicy[] = [
  ...PUBLIC_POLICIES,
  ...CUSTOMER_POLICIES,
  ...COMMERCE_POLICIES,
  ...ADMIN_POLICIES,
];

function matchPattern(pattern: string, pathname: string): boolean {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1); // mantém a barra final, ex: '/api/media/'
    return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);
  }
  return pathname === pattern;
}

export function resolveRoutePolicy(pathname: string, method: string): RoutePolicy | null {
  const upperMethod = method.toUpperCase();

  // 1. Prioriza match exato com método explícito
  for (const policy of ALL_ROUTE_POLICIES) {
    if (!policy.pattern.endsWith('/*') && policy.pattern === pathname) {
      if (!policy.methods || policy.methods.includes('*') || policy.methods.includes(upperMethod)) {
        return policy;
      }
    }
  }

  // 2. Fallback para políticas com prefixo wildcard ('/api/prefix/*')
  for (const policy of ALL_ROUTE_POLICIES) {
    if (policy.pattern.endsWith('/*') && matchPattern(policy.pattern, pathname)) {
      if (!policy.methods || policy.methods.includes('*') || policy.methods.includes(upperMethod)) {
        return policy;
      }
    }
  }

  return null;
}
