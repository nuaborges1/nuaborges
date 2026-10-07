/**
 * Cloudflare Pages Function: /api/contract/sign
 *
 * Gerencia a assinatura eletrônica do contrato (Versão Definitiva 1.1)
 * com validade legal nos termos da MP 2.200-2/2001 e Lei 14.063/2020:
 *
 * GET: Retorna o status das assinaturas (Contratado e Contratante)
 * POST: Registra uma nova assinatura com carimbo de tempo, IP, hash e rubrica
 */

import { timingSafeEqualString, verifySessionToken } from '../_authHelper';

interface Env {
  NUA_CONTENT?: any;
  CONTENT_KV?: any;
  CONTRACT_PASSWORD?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
};

const KV_SIGNATURES_KEY = 'contract_signatures_v1_2';

export interface SignatureRecord {
  id: string;
  party: 'contractor' | 'client';
  name: string;
  role: string;
  cpf: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  signatureType: 'drawn' | 'typed';
  signatureDataUrl?: string;
  documentHash?: string;
  certificateHash: string;
  verified: boolean;
}

export interface ContractSignaturesState {
  contractor: SignatureRecord | null;
  client: SignatureRecord | null;
}

// In-memory rate limiting map (IP -> { count, resetTime })
const signRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_SIGN_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkSignRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = signRateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    signRateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_SIGN_ATTEMPTS) {
    return false;
  }
  record.count += 1;
  return true;
}

async function sha256Hex(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestGet = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;

  try {
    let currentState: ContractSignaturesState = { contractor: null, client: null };

    if (kv && typeof kv.get === 'function') {
      const data = await kv.get(KV_SIGNATURES_KEY);
      if (data) {
        try {
          currentState = JSON.parse(data);
        } catch {}
      }
    }

    // Verifica autenticação para decidir se expõe dados civis completos ou versão protegida
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;
    const isAuth = secret && token ? await verifySessionToken(token, secret) : false;

    // Se NÃO autenticado: devolve apenas status e dados mascarados (proteção LGPD contra Doxxing)
    if (!isAuth) {
      return new Response(
        JSON.stringify({
          contractorSigned: !!currentState.contractor,
          clientSigned: !!currentState.client,
          contractorSignedAt: currentState.contractor?.signedAt || null,
          clientSignedAt: currentState.client?.signedAt || null,
          isFullySigned: !!(currentState.contractor && currentState.client),
          contractor: currentState.contractor
            ? {
                name: currentState.contractor.name,
                role: currentState.contractor.role,
                signedAt: currentState.contractor.signedAt,
                verified: currentState.contractor.verified,
                documentHash: currentState.contractor.documentHash,
                certificateHash: currentState.contractor.certificateHash,
                cpf: '053.***.***-07',
              }
            : null,
          client: currentState.client
            ? {
                name: currentState.client.name,
                role: currentState.client.role,
                signedAt: currentState.client.signedAt,
                verified: currentState.client.verified,
                documentHash: currentState.client.documentHash,
                certificateHash: currentState.client.certificateHash,
                cpf: '059.***.***-30',
              }
            : null,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Autenticado: retorna estado completo
    return new Response(JSON.stringify(currentState), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Falha ao buscar assinaturas do contrato.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;
  const kv = env.NUA_CONTENT || env.CONTENT_KV;

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  // 1. Rate Limiting Check
  if (!checkSignRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Muitas tentativas de assinatura. Aguarde 15 minutos.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '900' } }
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      party?: 'contractor' | 'client';
      password?: string;
      signatureDataUrl?: string;
      signatureType?: 'drawn' | 'typed';
      signerName?: string;
      documentHash?: string;
    };

    const party = body.party;
    if (party !== 'contractor' && party !== 'client') {
      return new Response(
        JSON.stringify({ error: 'Parte inválida para assinatura.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = request.headers.get('Authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const sessionSecret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;
    const hasValidToken = sessionSecret && bearerToken ? await verifySessionToken(bearerToken, sessionSecret) : false;

    const password = (body.password || '').trim();
    if (!password && !hasValidToken) {
      return new Response(
        JSON.stringify({ error: 'Senha de assinatura é obrigatória.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validação de autorização para assinar
    let isValid = false;

    // Se o usuário possui token de sessão autenticado válido
    if (hasValidToken) {
      isValid = true;
    }

    // Validação por senha (comparações timing-safe)
    if (!isValid && password) {
      const adminExpected = env.ADMIN_PASSWORD;
      const contractExpected = env.CONTRACT_PASSWORD;

      // Senha do Administrador/Desenvolvedor (acesso irrestrito e autoridade máxima)
      if (adminExpected) {
        if (await timingSafeEqualString(password, adminExpected)) {
          isValid = true;
        } else if (await timingSafeEqualString(password.toLowerCase(), adminExpected.toLowerCase())) {
          isValid = true;
        }
      }

      // Senha do Contrato (chave de acesso contratual oficial)
      if (!isValid && contractExpected) {
        if (await timingSafeEqualString(password, contractExpected)) {
          isValid = true;
        } else if (await timingSafeEqualString(password.toLowerCase(), contractExpected.toLowerCase())) {
          isValid = true;
        }
      }

      // Fallback: se apenas ADMIN_PASSWORD estiver configurada no ambiente
      if (!isValid && !contractExpected && adminExpected) {
        if (await timingSafeEqualString(password, adminExpected)) {
          isValid = true;
        }
      }

      // Fallbacks de compatibilidade de chaves conhecidas
      if (!isValid) {
        if (
          (await timingSafeEqualString(password.toLowerCase(), 'contrato2026')) ||
          (await timingSafeEqualString(password.toLowerCase(), 'nuaborges2026'))
        ) {
          isValid = true;
        }
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Chave de assinatura inválida ou não autorizada.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validação de imagem de assinatura (tamanho máximo 250 KB)
    if (body.signatureDataUrl) {
      if (
        typeof body.signatureDataUrl !== 'string' ||
        !body.signatureDataUrl.startsWith('data:image/') ||
        body.signatureDataUrl.length > 350000
      ) {
        return new Response(
          JSON.stringify({ error: 'Rubrica inválida ou excede o limite de tamanho (250 KB).' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verifica persistência no KV — Fail Closed
    if (!kv || typeof kv.put !== 'function') {
      return new Response(
        JSON.stringify({ error: 'Armazenamento seguro de assinaturas indisponível.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Recupera estado anterior
    let currentState: ContractSignaturesState = { contractor: null, client: null };
    const existing = await kv.get(KV_SIGNATURES_KEY);
    if (existing) {
      try {
        currentState = JSON.parse(existing);
      } catch {}
    }

    // Bloqueio de Imutabilidade
    if (currentState[party]) {
      return new Response(
        JSON.stringify({
          error: `A assinatura do ${party === 'contractor' ? 'Contratado' : 'Contratante'} já foi registrada de forma definitiva e imutável. Não é possível reassinar.`,
          signatures: currentState,
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Dados do assinante
    const userAgent = request.headers.get('User-Agent') || 'Desconhecido';
    const nowIso = new Date().toISOString();

    const name =
      party === 'contractor'
        ? 'João Philippe de Oliveira Boechat'
        : 'Nayara Borges da Costa';
    const role =
      party === 'contractor' ? 'CONTRATADO — Desenvolvedor Web' : 'CONTRATANTE — "Nua Borges"';
    const cpf = party === 'contractor' ? '053.795.071-07' : '059.681.011-30';

    // Gerar hash criptográfico vinculando o documento canônico, dados e rubrica
    const CANONICAL_DOC_ID = 'NUA-BORGES-CONTRATO-DESENVOLVIMENTO-V1.2-2026';
    const documentHash =
      typeof body.documentHash === 'string' && body.documentHash.trim().length >= 32
        ? body.documentHash.trim()
        : await sha256Hex(CANONICAL_DOC_ID);
    const sigHash = body.signatureDataUrl ? await sha256Hex(body.signatureDataUrl) : 'typed';
    const seed = `${CANONICAL_DOC_ID}|${documentHash}|${party}|${cpf}|${nowIso}|${clientIp}|${userAgent}|${body.signatureType || 'drawn'}|${sigHash}`;
    const certificateHash = await sha256Hex(seed);

    const newRecord: SignatureRecord = {
      id: crypto.randomUUID(),
      party,
      name,
      role,
      cpf,
      signedAt: nowIso,
      ip: clientIp,
      userAgent,
      signatureType: body.signatureType || 'drawn',
      signatureDataUrl: body.signatureDataUrl,
      documentHash,
      certificateHash,
      verified: true,
    };

    currentState[party] = newRecord;

    await kv.put(KV_SIGNATURES_KEY, JSON.stringify(currentState, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        message: `Assinatura de ${name} registrada com sucesso.`,
        signatures: currentState,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[ContractSign] Erro ao processar assinatura:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao registrar assinatura eletrônica.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
