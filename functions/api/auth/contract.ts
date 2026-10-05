/**
 * Cloudflare Pages Function: POST /api/auth/contract
 *
 * Edge authentication endpoint for contract review access:
 * - Constant-time password validation (anti-timing attacks)
 * - In-memory IP rate limiting
 * - Uses CONTRACT_PASSWORD secret with fallback to ADMIN_PASSWORD
 * - Zero hardcoded credentials exposed in client JavaScript bundles
 */

import { timingSafeEqualString, createSessionToken } from '../_authHelper';

interface Env {
  CONTRACT_PASSWORD?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

// In-memory rate limiting map (IP -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_ATTEMPTS) {
    return false;
  }

  record.count += 1;
  return true;
}

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  // Extract client IP (provided by Cloudflare)
  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  // 1. Rate Limiting Check
  if (!checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: 'Muitas tentativas de acesso. Aguarde 15 minutos antes de tentar novamente.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900',
        },
      }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
    };
    const password = body.password?.trim();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Chave de acesso é obrigatória.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Expected passwords configured on Cloudflare
    const expectedContractPassword = env.CONTRACT_PASSWORD || env.ADMIN_PASSWORD;
    const expectedAdminPassword = env.ADMIN_PASSWORD;

    if (!expectedContractPassword && !expectedAdminPassword) {
      return new Response(
        JSON.stringify({ error: 'Servidor sem chave de contrato configurada.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Constant-Time Password Verification (Case-Sensitive)
    let isValid = false;
    if (expectedContractPassword) {
      isValid = await timingSafeEqualString(password, expectedContractPassword);
    }

    // Also allow master admin password for contractor review
    if (!isValid && expectedAdminPassword) {
      isValid = await timingSafeEqualString(password, expectedAdminPassword);
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({
          error: 'Chave de acesso inválida. Verifique e tente novamente.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const secret = (env as any).ADMIN_API_SECRET || env.ADMIN_PASSWORD;
    let role: 'contract_dev' | 'contract_client' = 'contract_client';
    if (expectedAdminPassword && (await timingSafeEqualString(password, expectedAdminPassword))) {
      role = 'contract_dev';
    }

    const token = secret ? await createSessionToken(secret, role, 86400) : null;

    return new Response(
      JSON.stringify({
        success: true,
        token,
        role,
        message: 'Acesso autorizado ao documento contratual.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erro interno ao validar chave de acesso.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
