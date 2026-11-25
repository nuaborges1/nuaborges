/**
 * Cloudflare Pages Function: /api/contract/sign
 *
 * Gerencia a assinatura eletrônica do contrato (Versão Definitiva 1.1)
 * com validade legal nos termos da MP 2.200-2/2001 e Lei 14.063/2020:
 *
 * GET: Retorna o status das assinaturas (Contratado e Contratante)
 * POST: Registra uma nova assinatura com carimbo de tempo, IP, hash e rubrica
 */

import { timingSafeEqualString, verifySessionToken, parseAndVerifySessionToken } from '../_authHelper.ts';
import { getSystemKVFromSupabase, setSystemKVInSupabase } from '../_supabaseStore.ts';
import { checkAndConsumeRateLimit } from '../id/_rateLimiter.ts';

interface Env {
  CONTRACT_PASSWORD?: string;
  ADMIN_PASSWORD?: string;
  CLIENT_PASSWORD?: string;
  ADMIN_API_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  [key: string]: any;
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

export const PRIVATE_CONTRACT_PARTIES = {
  contractor: {
    name: 'João Philippe de Oliveira Boechat',
    role: 'CONTRATADO — Desenvolvedor Web',
    nationality: 'brasileiro',
    maritalStatus: 'solteiro',
    profession: 'desenvolvedor web',
    rg: '[PROTEGIDO SOB AUTENTICAÇÃO]',
    cpf: '[PROTEGIDO SOB AUTENTICAÇÃO]',
    cpfClean: '[PROTEGIDO]',
    address: 'Ceilândia, Brasília/DF',
    email: 'contato@nuaborges.com',
    phone: '[PROTEGIDO SOB AUTENTICAÇÃO]',
    pixKey: '[PROTEGIDO SOB AUTENTICAÇÃO]',
  },
  client: {
    name: 'Nayara Borges da Costa',
    artisticName: 'Nua Borges',
    role: 'CONTRATANTE — "Nua Borges"',
    nationality: 'brasileira',
    maritalStatus: 'casada',
    cpfFormatted: '[PROTEGIDO SOB AUTENTICAÇÃO]',
    cpfClean: '[PROTEGIDO]',
    address: 'República da Irlanda',
    email: 'nua@nuaborges.com',
    phone: '[PROTEGIDO SOB AUTENTICAÇÃO]',
  },
};

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
  try {
    let currentState: ContractSignaturesState = { contractor: null, client: null };

    const data = await getSystemKVFromSupabase(env, KV_SIGNATURES_KEY);
    if (data && typeof data === 'object') {
      currentState = data;
    }

    // Verifica autenticação via Cookie HttpOnly ou Bearer (NUA-AUD-011)
    const { getSessionCookie } = await import('../_authHelper');
    const { getAdminSessionSecret } = await import('../_central/secrets');
    const { parseAndVerifyActiveAdminSession } = await import('../_central/adminSessions');
    const authHeader = request.headers.get('Authorization');
    const token =
      (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null) ||
      getSessionCookie(request);
    const secret = getAdminSessionSecret(env);
    const payload = await parseAndVerifyActiveAdminSession(env as any, token, secret);
    const isAuth = !!payload;

    // Se NÃO autenticado: devolve apenas o status verificado e hashes públicos (sem nomes civis nem PII)
    if (!isAuth) {
      return new Response(
        JSON.stringify({
          contractor: currentState.contractor
            ? {
                id: currentState.contractor.id,
                party: currentState.contractor.party,
                role: currentState.contractor.role,
                signedAt: currentState.contractor.signedAt,
                certificateHash: currentState.contractor.certificateHash,
                signatureType: currentState.contractor.signatureType,
                verified: true,
              }
            : null,
          client: currentState.client
            ? {
                id: currentState.client.id,
                party: currentState.client.party,
                role: currentState.client.role,
                signedAt: currentState.client.signedAt,
                certificateHash: currentState.client.certificateHash,
                signatureType: currentState.client.signatureType,
                verified: true,
              }
            : null,
          contractorSigned: !!currentState.contractor,
          clientSigned: !!currentState.client,
          contractorSignedAt: currentState.contractor?.signedAt || null,
          clientSignedAt: currentState.client?.signedAt || null,
          isFullySigned: !!(currentState.contractor && currentState.client),
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

    // Mascaramento defensivo de CPF antes de retornar JSON (NUA-AUD-011)
    const maskCpf = (v?: string | null) => {
      const digits = String(v || '').replace(/\D/g, '');
      if (digits.length === 11) return `***.***.***-${digits.slice(-2)}`;
      return '[PROTEGIDO]';
    };
    const sanitizedState: ContractSignaturesState = {
      contractor: currentState.contractor
        ? { ...currentState.contractor, cpf: maskCpf(currentState.contractor.cpf) }
        : null,
      client: currentState.client
        ? { ...currentState.client, cpf: maskCpf(currentState.client.cpf) }
        : null,
    };

    // Autenticado: retorna estado com assinaturas e CPFs mascarados
    return new Response(
      JSON.stringify({
        ...sanitizedState,
        parties: PRIVATE_CONTRACT_PARTIES,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Falha ao buscar assinaturas do contrato.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestPost = async (context: PagesContext<Env>) => {
  const { request, env } = context;

  const clientIp =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '127.0.0.1';

  // 1. Rate Limiting Check (persistente no Supabase + fallback em memória — AUD-PRE-012)
  let signAllowed = checkSignRateLimit(clientIp);
  if (signAllowed) {
    try {
      const ipHash = await sha256Hex(`contract_sign:${clientIp}`);
      const persisted = await checkAndConsumeRateLimit(env as any, `contract_sign_ip:${ipHash}`, MAX_SIGN_ATTEMPTS, 900);
      if (!persisted.allowed) signAllowed = false;
    } catch {
      // Fallback já verificado acima em memória
    }
  }
  if (!signAllowed) {
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

    const { getSessionCookie } = await import('../_authHelper');
    const { getAdminSessionSecret } = await import('../_central/secrets');
    const { parseAndVerifyActiveAdminSession } = await import('../_central/adminSessions');
    const authHeader = request.headers.get('Authorization');
    const bearerToken =
      (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null) ||
      getSessionCookie(request);
    const sessionSecret = getAdminSessionSecret(env);
    const tokenPayload = await parseAndVerifyActiveAdminSession(env as any, bearerToken, sessionSecret);

    // NUA-AUD-011: exige sessão autenticada prévia via /api/auth/contract ou /api/auth/login
    if (!tokenPayload) {
      return new Response(
        JSON.stringify({ error: 'Autenticação prévia obrigatória para assinar o contrato.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let isValid = false;
    const callerRole = tokenPayload.role;
    if (party === 'client') {
      if (callerRole === 'contract_client' || callerRole === 'client' || callerRole === 'admin' || callerRole === 'dev') {
        isValid = true;
      }
    } else if (party === 'contractor') {
      if (callerRole === 'contract_dev' || callerRole === 'admin' || callerRole === 'dev') {
        isValid = true;
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Sessão não autorizada para assinar por esta parte.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }


    // Validação estrita de imagem raster de assinatura (bloqueia SVG/XSS, máximo 250 KB)
    if (body.signatureDataUrl) {
      if (
        typeof body.signatureDataUrl !== 'string' ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(body.signatureDataUrl) ||
        body.signatureDataUrl.length > 350000
      ) {
        return new Response(
          JSON.stringify({ error: 'Imagem da rubrica inválida. Envie uma imagem de até 250 KB.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Recupera estado anterior do Supabase — Fail Closed se não configurado
    let currentState: ContractSignaturesState = { contractor: null, client: null };
    try {
      const data = await getSystemKVFromSupabase(env, KV_SIGNATURES_KEY);
      if (data && typeof data === 'object') {
        currentState = data;
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Não foi possível acessar as assinaturas agora. Tente novamente em instantes.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
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
    const rawCpf = party === 'contractor' ? (env.CONTRACTOR_CPF || '') : (env.CLIENT_CPF || '');
    const cpfDigits = String(rawCpf).replace(/\D/g, '');
    const maskedCpf = cpfDigits.length === 11 ? `***.***.***-${cpfDigits.slice(-2)}` : '[PROTEGIDO]';

    // NUA-AUD-011: hash canônico do documento calculado exclusivamente no servidor (ignora body.documentHash)
    const CANONICAL_DOC_ID = 'NUA-BORGES-CONTRATO-DESENVOLVIMENTO-V1.2-2026';
    const documentHash = await sha256Hex(`${CANONICAL_DOC_ID}:V1.2:CANONICAL`);
    const sigHash = body.signatureDataUrl ? await sha256Hex(body.signatureDataUrl) : 'typed';
    const seed = `${CANONICAL_DOC_ID}|${documentHash}|${party}|${rawCpf || maskedCpf}|${nowIso}|${clientIp}|${userAgent}|${body.signatureType || 'drawn'}|${sigHash}`;
    const certificateHash = await sha256Hex(seed);

    const newRecord: SignatureRecord = {
      id: crypto.randomUUID(),
      party,
      name,
      role,
      cpf: maskedCpf,
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

    await setSystemKVInSupabase(env, KV_SIGNATURES_KEY, currentState, 'ContractSign');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Assinatura de ${name} registrada com sucesso.`,
        signatures: currentState,
        parties: PRIVATE_CONTRACT_PARTIES,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[ContractSign] Erro ao processar assinatura:', err);
    return new Response(
      JSON.stringify({ error: 'Não foi possível registrar a assinatura. Tente novamente em instantes.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
