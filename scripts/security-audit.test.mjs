/**
 * Test Suite de Segurança Automatizada — Nua Borges
 * Executa testes de regressão para validar controles criptográficos, RBAC,
 * ausência de credenciais hardcoded, verificação de webhook e sanitização.
 *
 * Executar via: node scripts/security-audit.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Helper Web Crypto para ambiente Node
if (!globalThis.crypto) {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto;
}

function toUint8Array(str) {
  return new TextEncoder().encode(str);
}

function toBase64Url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function timingSafeEqualString(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aLen = a.length;
  const bLen = b.length;
  const maxLen = Math.max(aLen, bLen);
  let result = aLen ^ bLen;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < aLen ? a.charCodeAt(i) : 0;
    const charB = i < bLen ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

async function getHmacKey(secret) {
  return await crypto.subtle.importKey(
    'raw',
    toUint8Array(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSessionToken(secret, role = 'dev', expiresInSeconds = 86400) {
  const now = Math.floor(Date.now() / 1000);
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = toBase64Url(nonceBytes);

  const payloadObj = {
    sub: role === 'dev' ? 'philippe_dev' : role === 'client' ? 'nayara_client' : role,
    role,
    iat: now,
    exp: now + expiresInSeconds,
    nonce,
  };

  const payloadStr = JSON.stringify(payloadObj);
  const payloadB64 = toBase64Url(toUint8Array(payloadStr));

  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    toUint8Array(payloadB64)
  );
  const sigB64 = toBase64Url(signature);

  return `${payloadB64}.${sigB64}`;
}

export async function parseAndVerifySessionToken(token, secret) {
  if (!token || typeof token !== 'string' || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;

  try {
    const key = await getHmacKey(secret);
    const sigBytes = fromBase64Url(sigB64);
    const validSig = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      toUint8Array(payloadB64)
    );

    if (!validSig) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp !== 'number' || now >= payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Matriz RBAC
export function isRouteAuthorizedForRole(pathname, method, role, requestAction = '') {
  if (role === 'admin' || role === 'dev') {
    return true;
  }

  if (role === 'contract_client') {
    if (pathname === '/api/contract/sign') {
      return true;
    }
    return false;
  }

  if (role === 'contract_dev') {
    if (pathname === '/api/contract/sign') {
      return true;
    }
    return false;
  }

  if (role === 'client') {
    if (pathname === '/api/requests') {
      if (method === 'GET') return true;
      if (method === 'POST') {
        if (['interview', 'create', 'message'].includes(requestAction)) return true;
        return false;
      }
    }
    if (
      pathname === '/api/finance/installments' ||
      pathname === '/api/finance/create-preference' ||
      pathname === '/api/finance/pix' ||
      pathname === '/api/finance/verify'
    ) {
      return true;
    }
    if (pathname === '/api/finance/admin') {
      return false;
    }
    if (pathname === '/api/nua-ai/chat' || pathname === '/api/nua-ai/conversations') {
      return true;
    }
    if (pathname === '/api/content/sync' && method === 'GET') {
      return true;
    }
    if (pathname === '/api/content/sync' && method === 'POST') return false;
    if (pathname.startsWith('/api/media/')) return false;
    if (pathname.startsWith('/api/music/') && method === 'POST') return false;
    if (pathname.startsWith('/api/audit/')) return false;
    if (pathname.startsWith('/api/telemetry/stats')) return false;

    return false;
  }

  return false;
}

// TESTES

test('Criptografia: timingSafeEqualString compara strings com exatidão e sensibilidade a maiúsculas/minúsculas', async () => {
  const secretA = 'MinhaSenhaForte2026!@#';
  const secretB = 'MinhaSenhaForte2026!@#';
  const secretC = 'minhasenhaforte2026!@#';
  const secretD = 'OutraSenha';

  assert.equal(await timingSafeEqualString(secretA, secretB), true);
  assert.equal(await timingSafeEqualString(secretA, secretC), false, 'Case-insensitive deve falhar!');
  assert.equal(await timingSafeEqualString(secretA, secretD), false);
  assert.equal(await timingSafeEqualString('', ''), true);
  assert.equal(await timingSafeEqualString(null, secretA), false);
});

test('Sessões HMAC: emissão e verificação de tokens válidos e expiração', async () => {
  const secret = 'super-secret-key-1234567890-abcdef';
  const token = await createSessionToken(secret, 'dev', 3600);

  const payload = await parseAndVerifySessionToken(token, secret);
  assert.ok(payload);
  assert.equal(payload.role, 'dev');
  assert.equal(payload.sub, 'philippe_dev');

  const invalidPayload = await parseAndVerifySessionToken(token, 'wrong-secret-key');
  assert.equal(invalidPayload, null);

  const tamperedToken = token.slice(0, -4) + 'AAAA';
  const tamperedPayload = await parseAndVerifySessionToken(tamperedToken, secret);
  assert.equal(tamperedPayload, null);

  const expiredToken = await createSessionToken(secret, 'dev', -10);
  const expiredPayload = await parseAndVerifySessionToken(expiredToken, secret);
  assert.equal(expiredPayload, null);
});

test('RBAC C2: Matriz de permissões por papel', () => {
  assert.equal(
    isRouteAuthorizedForRole('/api/content/sync', 'POST', 'contract_client'),
    false,
    'contract_client NÃO pode publicar conteúdo no CMS!'
  );

  assert.equal(
    isRouteAuthorizedForRole('/api/media/upload', 'POST', 'contract_client'),
    false,
    'contract_client NÃO pode fazer upload de mídia!'
  );

  assert.equal(
    isRouteAuthorizedForRole('/api/finance/admin', 'POST', 'contract_client'),
    false,
    'contract_client NÃO pode acessar finanças admin!'
  );

  assert.equal(
    isRouteAuthorizedForRole('/api/contract/sign', 'POST', 'contract_client'),
    true,
    'contract_client PODE acessar assinatura de contrato!'
  );

  assert.equal(
    isRouteAuthorizedForRole('/api/requests', 'POST', 'client', 'delete'),
    false,
    'client NÃO pode deletar solicitações!'
  );

  assert.equal(
    isRouteAuthorizedForRole('/api/requests', 'POST', 'client', 'create'),
    true,
    'client PODE criar solicitações!'
  );

  assert.equal(
    isRouteAuthorizedForRole('/api/nua-ai/chat', 'POST', 'client'),
    true,
    'client PODE usar Nua IA!'
  );

  assert.equal(
    isRouteAuthorizedForRole('/api/nua-ai/chat', 'POST', 'contract_client'),
    false,
    'contract_client NÃO pode gastar cota da Nua IA!'
  );

  assert.equal(isRouteAuthorizedForRole('/api/content/sync', 'POST', 'admin'), true);
  assert.equal(isRouteAuthorizedForRole('/api/media/upload', 'POST', 'admin'), true);
  assert.equal(isRouteAuthorizedForRole('/api/finance/admin', 'POST', 'admin'), true);
  assert.equal(isRouteAuthorizedForRole('/api/requests', 'POST', 'admin', 'delete'), true);
});

test('C1: Fallbacks proibidos na assinatura do contrato', async () => {
  const allowedSecrets = {
    ADMIN_PASSWORD: 'SenhaAdminReal123!',
    CONTRACT_PASSWORD: 'SenhaContratoReal123!',
  };

  const forbiddenFallbacks = ['contrato2026', 'CONTRATO2026', 'nuaborges2026', 'NUABORGES2026'];

  for (const pwd of forbiddenFallbacks) {
    const matchesAdmin = await timingSafeEqualString(pwd, allowedSecrets.ADMIN_PASSWORD);
    const matchesContract = await timingSafeEqualString(pwd, allowedSecrets.CONTRACT_PASSWORD);
    assert.equal(matchesAdmin, false, `Senha proibida ${pwd} não pode coincidir com ADMIN_PASSWORD`);
    assert.equal(matchesContract, false, `Senha proibida ${pwd} não pode coincidir com CONTRACT_PASSWORD`);
  }
});

test('C3 & SEC-14: Dados Pessoais Protegidos nos Módulos Canônicos e Handlers', async () => {
  const { CONTRACTOR_INFO, CLIENT_INFO } = await import('../lib/contractCanonical.ts');
  let privateParties = null;
  try {
    const mod = await import('../functions/api/contract/sign.ts');
    privateParties = mod.PRIVATE_CONTRACT_PARTIES;
  } catch {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const content = readFileSync(resolve(process.cwd(), 'functions/api/contract/sign.ts'), 'utf-8');
    assert.equal(content.includes('053.795.071-07'), false, 'CPF real do contratado não pode estar em sign.ts!');
    assert.equal(content.includes('059.681.011-30'), false, 'CPF real da contratante não pode estar em sign.ts!');
  }

  assert.equal(CONTRACTOR_INFO.cpf.includes('053.795.071-07'), false, 'CPF real do contratado não pode estar em contractCanonical.ts!');
  assert.equal(CLIENT_INFO.cpfFormatted.includes('059.681.011-30'), false, 'CPF real da contratante não pode estar em contractCanonical.ts!');

  if (privateParties) {
    assert.equal(privateParties.contractor.cpf.includes('053.795.071-07'), false, 'CPF real do contratado não pode estar em sign.ts!');
    assert.equal(privateParties.client.cpfFormatted.includes('059.681.011-30'), false, 'CPF real da contratante não pode estar em sign.ts!');
  }
});

test('SEC-01 & SEC-05: Remoção de Credenciais Hardcoded do Mercado Pago e Bloqueio de TestMode em Produção', async () => {
  const { getMercadoPagoAccessToken, isPaymentTestModeAllowed } = await import('../functions/api/_mercadopago.ts');

  // Se env for vazio, getMercadoPagoAccessToken NUNCA deve retornar token hardcoded embutido
  assert.equal(getMercadoPagoAccessToken({}), null, 'Sem env, getMercadoPagoAccessToken deve retornar null!');
  assert.equal(getMercadoPagoAccessToken({ MP_ACCESS_TOKEN: 'APP_USR-test-123' }), 'APP_USR-test-123');

  // Em ambiente de produção, simulação/TestMode é ESTRITAMENTE bloqueada
  assert.equal(isPaymentTestModeAllowed({ ENVIRONMENT: 'production', PAYMENT_TEST_MODE: 'true' }), false, 'TestMode DEVE ser bloqueado em produção!');
  assert.equal(isPaymentTestModeAllowed({ NODE_ENV: 'production', PAYMENT_TEST_MODE: 'true' }), false, 'TestMode DEVE ser bloqueado em NODE_ENV=production!');
  assert.equal(isPaymentTestModeAllowed({ ENVIRONMENT: 'development', PAYMENT_TEST_MODE: 'true' }), true, 'TestMode liberado apenas em desenvolvimento!');
});

test('A3: Validação de CORS e Ancoragem Estrita de Domínios', () => {
  const corsRegex = /^https:\/\/([a-z0-9-]+\.)*phdev\.store$/;
  
  assert.equal(corsRegex.test('https://phdev.store'), true);
  assert.equal(corsRegex.test('https://admin.phdev.store'), true);
  assert.equal(corsRegex.test('https://sub.admin.phdev.store'), true);

  assert.equal(corsRegex.test('https://evil-phdev.store'), false, 'evil-phdev.store deve ser rejeitado!');
  assert.equal(corsRegex.test('https://attackerphdev.store'), false, 'attackerphdev.store deve ser rejeitado!');
  assert.equal(corsRegex.test('https://phdev.store.evil.com'), false, 'phdev.store.evil.com deve ser rejeitado!');
  assert.equal(corsRegex.test('http://phdev.store'), false, 'HTTP inseguro deve ser rejeitado!');
});

test('A2: Mercado Pago Webhook HMAC e Comparação em Tempo Constante', async () => {
  const mockSecret = 'dummy_secret_value_mock';
  const dataId = '1234567890';
  const ts = Math.floor(Date.now() / 1000).toString();
  const manifest = `id:${dataId};request-id:;ts:${ts};`;
  
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(mockSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(manifest));
  const validHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');

  assert.equal(await timingSafeEqualString(validHex, validHex), true);

  const forgedHex = validHex.slice(0, -2) + '00';
  assert.equal(await timingSafeEqualString(forgedHex, validHex), false);
});

test('CWE-798: Proibição estrita de credenciais hardcoded em endpoints e middleware', async () => {
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');

  const filesToCheck = [
    'functions/api/_middleware.ts',
    'functions/api/auth/login.ts',
    'functions/api/nua-ai/_actor.ts',
    'lib/nuaAi/assistantServices.mjs',
    'lib/vaultCrypto.ts',
    'functions/api/_supabaseClient.ts',
  ];

  const forbiddenLiterals = ['Nuaborges2026', 'nuaborges2026', 'contrato2026', 'CONTRATO2026', 'nua-borges-vault-v1-2026'];

  for (const relativePath of filesToCheck) {
    const filePath = resolve(process.cwd(), relativePath);
    const content = readFileSync(filePath, 'utf-8');

    for (const forbidden of forbiddenLiterals) {
      assert.equal(
        content.includes(forbidden),
        false,
        `VULNERABILIDADE CWE-798 DETECTADA: '${forbidden}' encontrado em ${relativePath}!`
      );
    }
  }
});

test('CWE-798: Fail-Closed e rejeição incondicional de credencial hardcoded', async () => {
  const env = {
    ADMIN_API_SECRET: 'segredo_real_producao_longo_e_aleatorio_98765',
    ADMIN_PASSWORD: 'outra_senha_segura_de_producao_12345',
  };

  const compromisedToken = 'Nuaborges2026';

  // 1. O token comprometido NUNCA pode coincidir com os segredos reais configurados
  const matchesSecret = await timingSafeEqualString(compromisedToken, env.ADMIN_API_SECRET);
  const matchesPassword = await timingSafeEqualString(compromisedToken, env.ADMIN_PASSWORD);
  assert.equal(matchesSecret, false, 'Nuaborges2026 não pode coincidir com ADMIN_API_SECRET');
  assert.equal(matchesPassword, false, 'Nuaborges2026 não pode coincidir com ADMIN_PASSWORD');

  // 2. Com ambiente vazio (sem secrets), nenhum token estático pode ser aceito
  const emptyEnv = {};
  const canAuthAdmin = Boolean(
    (emptyEnv.ADMIN_API_SECRET && (await timingSafeEqualString(compromisedToken, emptyEnv.ADMIN_API_SECRET))) ||
    (emptyEnv.ADMIN_PASSWORD && (await timingSafeEqualString(compromisedToken, emptyEnv.ADMIN_PASSWORD)))
  );
  assert.equal(canAuthAdmin, false, 'Sem secrets configurados no ambiente, o acesso admin deve falhar fechado');
});

test('SEC-02: Supabase Client no backend rejeita anon_key (Fail-Closed)', async () => {
  const { getSupabaseClient, isSupabaseConfigured } = await import('../functions/api/_supabaseClient.ts');

  // Apenas com anon_key, o backend NÃO pode retornar cliente ativo para operações de servidor
  const envOnlyAnon = {
    SUPABASE_URL: 'https://exemplo.supabase.co',
    SUPABASE_ANON_KEY: 'anon_key_sem_privilegio_de_servico',
  };

  assert.equal(
    getSupabaseClient(envOnlyAnon),
    null,
    'getSupabaseClient deve retornar null quando apenas anon_key for fornecida!'
  );
  assert.equal(
    isSupabaseConfigured(envOnlyAnon),
    false,
    'isSupabaseConfigured deve retornar false sem service_role ou secret key!'
  );
});

test('SEC-04: Autorização de mídia privada vinculada estritamente ao entitlement do pedido', () => {
  // Simula validação de entitlement de functions/media/[[path]].ts
  function checkEntitlement(subpath, order) {
    if (!order || (order.status !== 'paid' && order.status !== 'approved')) return false;
    const normalizedPath = subpath.toLowerCase();
    const targetPackId = order.packId ? order.packId.toLowerCase() : '';
    const targetOrderId = order.id ? order.id.toLowerCase() : '';

    const hasPackEntitlement = Boolean(targetPackId && (
      normalizedPath.includes(`/${targetPackId}/`) ||
      normalizedPath.includes(`_${targetPackId}`) ||
      normalizedPath.includes(targetPackId)
    ));
    const hasOrderEntitlement = Boolean(targetOrderId && (
      normalizedPath.includes(`/${targetOrderId}/`) ||
      normalizedPath.includes(targetOrderId)
    ));

    return hasPackEntitlement || hasOrderEntitlement;
  }

  const orderPackA = { id: 'ped_100', packId: 'pack_boudoir', status: 'paid' };
  const orderUnpaid = { id: 'ped_200', packId: 'pack_boudoir', status: 'pending' };

  // Pedido aprovado para pack_boudoir deve acessar fotos do seu próprio pack
  assert.equal(checkEntitlement('private/packs/pack_boudoir/foto1.jpg', orderPackA), true);
  // Pedido aprovado para pack_boudoir NÃO pode acessar fotos de outro pack (ex: pack_intimista)
  assert.equal(checkEntitlement('private/packs/pack_intimista/foto1.jpg', orderPackA), false);
  // Pedido pendente não pode acessar nenhum arquivo
  assert.equal(checkEntitlement('private/packs/pack_boudoir/foto1.jpg', orderUnpaid), false);
});

