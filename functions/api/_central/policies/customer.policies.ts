/**
 * Políticas de Rotas do Cliente — NUA ID e Cofre (`customer.policies.ts`).
 */

import type { RoutePolicy } from '../types';

export const CUSTOMER_POLICIES: RoutePolicy[] = [
  {
    pattern: '/api/id/request-code',
    methods: ['POST'],
    surface: 'customer',
    auth: 'customer_handler',
    csrf: 'strict_cookie',
    moduleKey: 'nua_id_login',
  },
  {
    pattern: '/api/id/verify-code',
    methods: ['POST'],
    surface: 'customer',
    auth: 'customer_handler',
    csrf: 'strict_cookie',
    moduleKey: 'nua_id_login',
  },
  {
    pattern: '/api/id/*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    surface: 'customer',
    auth: 'customer_handler',
    csrf: 'strict_cookie',
  },
  {
    pattern: '/api/me/bind-order',
    methods: ['POST'],
    surface: 'customer',
    auth: 'customer_handler',
    csrf: 'strict_cookie',
    rateLimit: { bucket: 'me_bind_order', maxRequests: 15, windowSeconds: 300 },
  },
  {
    pattern: '/api/me/*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    surface: 'customer',
    auth: 'customer_handler',
    csrf: 'strict_cookie',
  },
];
