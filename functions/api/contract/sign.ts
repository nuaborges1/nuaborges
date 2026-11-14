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

    // Verifica autenticação para decidir se expõe dados civis completos ou versão estritamente não-identificável
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;
    const payload = secret && token ? await parseAndVerifySessionToken(token, secret) : null;
    const isAuth = !!payload;

    // Se NÃO autenticado: devolve o certificado público de conformidade digital com hashes e nomes civis públicos
    // protegendo integralmente dados sensíveis como CPF completo, endereço e telefones (LGPD)
    if (!isAuth) {
      return new Response(
        JSON.stringify({
          contractor: currentState.contractor
            ? {
                id: currentState.contractor.id,
                party: currentState.contractor.party,
                name: currentState.contractor.name,
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
                name: currentState.client.name,
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

    // Autenticado: retorna estado completo com assinaturas e dados contratuais civis autorizados
    return new Response(
      JSON.stringify({
        ...currentState,
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
    const tokenPayload = sessionSecret && bearerToken
      ? await parseAndVerifySessionToken(bearerToken, sessionSecret)
      : null;

    const password = (body.password || '').trim();
    if (!password && !tokenPayload) {
      return new Response(
        JSON.stringify({ error: 'Chave de assinatura é obrigatória.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validação Estrita de Autorização por Papel e Senha (C1 & C2)
    let isValid = false;

    // Se o usuário possui token autenticado, valida se o papel corresponde à parte
    if (tokenPayload) {
      const role = tokenPayload.role;
      if (party === 'client') {
        if (role === 'contract_client' || role === 'client' || role === 'admin' || role === 'dev') {
          isValid = true;
        }
      } else if (party === 'contractor') {
        if (role === 'contract_dev' || role === 'admin' || role === 'dev') {
          isValid = true;
        }
      }
    }

    // Se não validou por token, valida por senha com comparação em tempo constante
    // NUNCA aceita fallbacks em código, strings fixas ou comparações case-insensitive (C1)
    if (!isValid && password) {
      const adminExpected = env.ADMIN_PASSWORD;
      const contractExpected = env.CONTRACT_PASSWORD || env.CLIENT_PASSWORD;

      if (!adminExpected && !contractExpected) {
        return new Response(
          JSON.stringify({ error: 'Servidor sem credenciais de assinatura configuradas.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (party === 'client') {
        // Contratante: deve coincidir estritamente com CONTRACT_PASSWORD ou ADMIN_PASSWORD
        if (contractExpected && (await timingSafeEqualString(password, contractExpected))) {
          isValid = true;
        } else if (adminExpected && (await timingSafeEqualString(password, adminExpected))) {
          isValid = true;
        }
      } else if (party === 'contractor') {
        // Contratado: deve coincidir estritamente com ADMIN_PASSWORD
        if (adminExpected && (await timingSafeEqualString(password, adminExpected))) {
          isValid = true;
        }
      }
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Chave de assinatura inválida ou não autorizada para esta parte.' }),
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

    // Recupera estado anterior do Supabase — Fail Closed se não configurado
    let currentState: ContractSignaturesState = { contractor: null, client: null };
    try {
      const data = await getSystemKVFromSupabase(env, KV_SIGNATURES_KEY);
      if (data && typeof data === 'object') {
        currentState = data;
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Armazenamento seguro de assinaturas indisponível.' }),
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
    const cpf = party === 'contractor' ? (env.CONTRACTOR_CPF || '[PROTEGIDO]') : (env.CLIENT_CPF || '[PROTEGIDO]');

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
      JSON.stringify({ error: 'Erro interno ao registrar assinatura eletrônica.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
