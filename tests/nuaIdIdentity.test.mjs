/**
 * Suíte Automatizada — Fase 2: Núcleo de Identidade NUA ID
 *
 * Valida todas as invariantes de identidade, segurança, anti-enumeração,
 * isolamento Admin vs Cliente, IDOR, troca de e-mail dupla e anonimização LGPD.
 */

import assert from 'node:assert/strict';
import { createMemoryNuaIdStore, saveOtpChallenge, getOtpChallenge } from '../functions/api/id/_nuaIdStore.ts';
import { onRequestPost as requestCode } from '../functions/api/id/request-code.ts';
import { onRequestPost as verifyCode } from '../functions/api/id/verify-code.ts';
import { onRequestGet as getSession } from '../functions/api/id/session.ts';
import { onRequestPost as logout } from '../functions/api/id/logout.ts';
import { onRequestGet as listSessions, onRequestPost as manageSessions } from '../functions/api/id/sessions.ts';
import { onRequestPost as updateProfile } from '../functions/api/id/profile.ts';
import { onRequestPost as emailChange } from '../functions/api/id/email-change.ts';
import { onRequestPost as accountAction } from '../functions/api/id/account.ts';
import { onRequest as apiMiddleware } from '../functions/api/_middleware.ts';

const SECRET = 'test-nua-id-secret-256-bits-strong-key-0123456789';

function makeEnv(store, sentEmails = []) {
  return {
    ADMIN_API_SECRET: SECRET,
    NUA_ID_SECRET: SECRET,
    ENVIRONMENT: 'production',
    __NUA_ID_TEST_STORE__: store,
    __CUSTOMER_DATA_FIXTURES__: {},
    __EMAIL_SENDER__: async (msg) => {
      sentEmails.push(msg);
      return true;
    },
  };
}

function makeReq(path, method = 'POST', body = null, cookie = null, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1',
    'cf-connecting-ip': '203.0.113.10',
    ...extraHeaders,
  });
  if (cookie) headers.set('Cookie', cookie);
  return new Request(`https://nuaborges.com.br${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function extractCookiePair(response) {
  const raw = response.headers.get('Set-Cookie') || '';
  return raw.split(';')[0];
}

async function runTests() {
  const store = createMemoryNuaIdStore();
  const sentEmails = [];
  const env = makeEnv(store, sentEmails);

  // 1. Solicitar código para conta nova -> resposta uniforme
  const resReqNew = await requestCode({
    request: makeReq('/api/id/request-code', 'POST', { email: 'alice@example.com' }),
    env,
  });
  assert.equal(resReqNew.status, 200);
  const bodyNew = await resReqNew.json();
  assert.equal(bodyNew.success, true);
  assert.equal(sentEmails.length, 1);
  const aliceCode = sentEmails[0].code;
  assert.match(aliceCode, /^\d{6}$/);
  // Discrição no assunto e sem link mágico
  assert.ok(!sentEmails[0].html.includes('magic_link'));
  assert.ok(sentEmails[0].html.includes(aliceCode.split('').join(' ')));

  // 2. Código inválido incrementa tentativas e retorna 401
  const resWrong = await verifyCode({
    request: makeReq('/api/id/verify-code', 'POST', { email: 'alice@example.com', code: '000000' }),
    env,
  });
  assert.equal(resWrong.status, 401);

  // 3. Login com código válido -> cria conta e emite cookie __Host- Secure HttpOnly SameSite=Lax
  const resVerify = await verifyCode({
    request: makeReq('/api/id/verify-code', 'POST', {
      email: 'alice@example.com',
      code: aliceCode,
      displayName: 'Alice',
    }),
    env,
  });
  assert.equal(resVerify.status, 200);
  const setCookieHeader = resVerify.headers.get('Set-Cookie') || '';
  assert.ok(setCookieHeader.startsWith('__Host-nua_id_session='));
  assert.ok(setCookieHeader.includes('HttpOnly'));
  assert.ok(setCookieHeader.includes('Secure'));
  assert.ok(setCookieHeader.includes('SameSite=Lax'));
  const aliceCookie = extractCookiePair(resVerify);

  // 4. Uso único: reutilizar o mesmo código falha com 401
  const resReuse = await verifyCode({
    request: makeReq('/api/id/verify-code', 'POST', { email: 'alice@example.com', code: aliceCode }),
    env,
  });
  assert.equal(resReuse.status, 401);

  // 5. Anti-enumeração: resposta para conta existente == resposta para conta inexistente
  const resExisting = await requestCode({
    request: makeReq('/api/id/request-code', 'POST', { email: 'alice@example.com' }),
    env,
  });
  const resNonExisting = await requestCode({
    request: makeReq('/api/id/request-code', 'POST', { email: 'naoexiste@example.com' }),
    env,
  });
  assert.equal(resExisting.status, resNonExisting.status);
  assert.deepEqual(await resExisting.json(), await resNonExisting.json());

  // 6. Excesso de tentativas (5 erros invalidam o OTP)
  for (let i = 0; i < 4; i++) {
    const r = await verifyCode({
      request: makeReq('/api/id/verify-code', 'POST', { email: 'naoexiste@example.com', code: '111111' }),
      env,
    });
    assert.equal(r.status, 401);
  }
  const r5 = await verifyCode({
    request: makeReq('/api/id/verify-code', 'POST', { email: 'naoexiste@example.com', code: '111111' }),
    env,
  });
  assert.equal(r5.status, 429);
  assert.equal(await getOtpChallenge(env, 'naoexiste@example.com', 'login'), null);

  // 7. Código expirado é rejeitado
  const existingChallenge = await getOtpChallenge(env, 'alice@example.com', 'login');
  assert.ok(existingChallenge);
  existingChallenge.expiresAt = new Date(Date.now() - 1000).toISOString();
  await saveOtpChallenge(env, existingChallenge);
  const aliceCode2 = sentEmails[1].code;
  const resExpired = await verifyCode({
    request: makeReq('/api/id/verify-code', 'POST', { email: 'alice@example.com', code: aliceCode2 }),
    env,
  });
  assert.equal(resExpired.status, 401);

  // 8. Sessão válida retorna perfil
  const resSess = await getSession({
    request: makeReq('/api/id/session', 'GET', null, aliceCookie),
    env,
  });
  const sessData = await resSess.json();
  assert.equal(sessData.authenticated, true);
  assert.equal(sessData.profile.email, 'alice@example.com');
  const aliceSessionId = sessData.sessionId;

  // 9. ISOLAMENTO ADMIN vs CLIENTE: sessão de cliente tentando acessar /api/admin/orders-feed -> 401!
  const resAdminAttempt = await apiMiddleware({
    request: makeReq('/api/admin/orders-feed', 'GET', null, aliceCookie),
    env,
    next: async () => new Response('SHOULD NOT REACH', { status: 200 }),
  });
  assert.equal(resAdminAttempt.status, 401);

  // 10. IDOR: Criar Cliente B (Bob) e tentar revogar sessão de Alice
  await requestCode({
    request: makeReq('/api/id/request-code', 'POST', { email: 'bob@example.com' }, null, {
      'cf-connecting-ip': '203.0.113.20',
    }),
    env,
  });
  const bobCode = sentEmails[sentEmails.length - 1].code;
  const resBobVerify = await verifyCode({
    request: makeReq('/api/id/verify-code', 'POST', { email: 'bob@example.com', code: bobCode }),
    env,
  });
  const bobCookie = extractCookiePair(resBobVerify);

  const resIdorRevoke = await manageSessions({
    request: makeReq('/api/id/sessions', 'POST', { sessionId: aliceSessionId }, bobCookie),
    env,
  });
  assert.equal(resIdorRevoke.status, 404, 'Bob não pode revogar sessão de Alice');

  // Alice continua autenticada
  const resAliceStillOk = await getSession({
    request: makeReq('/api/id/session', 'GET', null, aliceCookie),
    env,
  });
  assert.equal((await resAliceStillOk.json()).authenticated, true);

  // 11. Atualização de perfil (somente campos permitidos)
  const resProf = await updateProfile({
    request: makeReq('/api/id/profile', 'POST', { displayName: 'Alice B.', marketingOptIn: true }, aliceCookie),
    env,
  });
  assert.equal(resProf.status, 200);
  assert.equal((await resProf.json()).profile.displayName, 'Alice B.');

  // 12. Troca de e-mail com confirmação nos DOIS endereços
  const beforeCount = sentEmails.length;
  const resEcReq = await emailChange({
    request: makeReq('/api/id/email-change', 'POST', { step: 'request', newEmail: 'alice.novo@example.com' }, aliceCookie),
    env,
  });
  assert.equal(resEcReq.status, 200);
  assert.equal(sentEmails.length, beforeCount + 2);
  const currentCode = sentEmails.find((e, idx) => idx >= beforeCount && e.stage === 'current').code;
  const newCode = sentEmails.find((e, idx) => idx >= beforeCount && e.stage === 'new').code;

  // Falha com apenas 1 código correto
  const resEcBad = await emailChange({
    request: makeReq('/api/id/email-change', 'POST', {
      step: 'confirm',
      newEmail: 'alice.novo@example.com',
      currentEmailCode: currentCode,
      newEmailCode: '999999',
    }, aliceCookie),
    env,
  });
  assert.equal(resEcBad.status, 401);

  // Sucesso com ambos os códigos
  const resEcOk = await emailChange({
    request: makeReq('/api/id/email-change', 'POST', {
      step: 'confirm',
      newEmail: 'alice.novo@example.com',
      currentEmailCode: currentCode,
      newEmailCode: newCode,
    }, aliceCookie),
    env,
  });
  assert.equal(resEcOk.status, 200);
  assert.equal((await resEcOk.json()).email, 'alice.novo@example.com');

  // 13. Rate limit por e-mail (4 permitidos em 15min, 5º bloqueado com 429)
  const rlEmail = 'ratelimit@example.com';
  for (let i = 0; i < 4; i++) {
    const r = await requestCode({
      request: makeReq('/api/id/request-code', 'POST', { email: rlEmail }, null, {
        'cf-connecting-ip': `198.51.100.${i + 1}`,
      }),
      env,
    });
    assert.equal(r.status, 200);
  }
  const rBlocked = await requestCode({
    request: makeReq('/api/id/request-code', 'POST', { email: rlEmail }, null, {
      'cf-connecting-ip': '198.51.100.99',
    }),
    env,
  });
  assert.equal(rBlocked.status, 429);

  // 14. Logout revoga sessão no servidor
  const resLogout = await logout({
    request: makeReq('/api/id/logout', 'POST', {}, bobCookie),
    env,
  });
  assert.equal(resLogout.status, 200);
  const resBobAfterLogout = await getSession({
    request: makeReq('/api/id/session', 'GET', null, bobCookie),
    env,
  });
  assert.equal((await resBobAfterLogout.json()).authenticated, false);

  // 15. Anonimização LGPD encerra conta e bloqueia cookie anterior
  const resAnon = await accountAction({
    request: makeReq('/api/id/account', 'POST', { action: 'anonymize', confirmText: 'ENCERRAR CONTA' }, aliceCookie),
    env,
  });
  assert.equal(resAnon.status, 200);
  const resAliceAfterAnon = await getSession({
    request: makeReq('/api/id/session', 'GET', null, aliceCookie),
    env,
  });
  assert.equal((await resAliceAfterAnon.json()).authenticated, false);

  // 16. P0 Segurança: GET /api/media/list NÃO é público (nem acessível com sessão de cliente)
  const resMediaListAnon = await apiMiddleware({
    request: makeReq('/api/media/list', 'GET'),
    env,
    next: async () => new Response('SHOULD NOT REACH', { status: 200 }),
  });
  assert.equal(resMediaListAnon.status, 401, 'GET /api/media/list deve exigir autenticação admin');

  const resMediaListCustomer = await apiMiddleware({
    request: makeReq('/api/media/list', 'GET', null, bobCookie),
    env,
    next: async () => new Response('SHOULD NOT REACH', { status: 200 }),
  });
  assert.equal(resMediaListCustomer.status, 401, 'Sessão de cliente não pode acessar /api/media/list');

  // 17. Buyer-Only Gate (intent: 'portal_login'): e-mail sem perfil/compra recebe 200 uniforme sem disparar OTP
  const emailsBeforeGate = sentEmails.length;
  const resNonCustomerPortal = await requestCode({
    request: makeReq(
      '/api/id/request-code',
      'POST',
      { email: 'curioso.sem.compra@example.com', intent: 'portal_login' },
      null,
      { 'cf-connecting-ip': '203.0.113.77' }
    ),
    env,
  });
  assert.equal(resNonCustomerPortal.status, 200, 'Resposta anti-enumeração 200');
  assert.equal((await resNonCustomerPortal.json()).success, true);
  assert.equal(sentEmails.length, emailsBeforeGate, 'Não deve enviar e-mail OTP para curioso sem compras');
  assert.equal(
    await getOtpChallenge(env, 'curioso.sem.compra@example.com', 'login'),
    null,
    'Não deve gravar desafio OTP para curioso sem compras'
  );

  // Já um cliente existente (Bob) recebe código normalmente no portal_login
  const resExistingCustomerPortal = await requestCode({
    request: makeReq(
      '/api/id/request-code',
      'POST',
      { email: 'bob@example.com', intent: 'portal_login' },
      null,
      { 'cf-connecting-ip': '203.0.113.78' }
    ),
    env,
  });
  assert.equal(resExistingCustomerPortal.status, 200);
  assert.equal(sentEmails.length, emailsBeforeGate + 1, 'Cliente existente recebe OTP normalmente no portal_login');

  const unavailable = await requestCode({
    request: makeReq('/api/id/request-code', 'POST', { email: 'sender-failure@example.com' }),
    env: { ...makeEnv(createMemoryNuaIdStore()), __EMAIL_SENDER__: async () => false },
  });
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).success, false);
  // Primeiro acesso de clientes diferentes. Cada código deve chegar ao titular correspondente.
  const inbox = [];
  const firstLogin = {
    ...makeEnv(createMemoryNuaIdStore(), inbox),
    __CUSTOMER_DATA_FIXTURES__: {
      orders: { pack: { customerEmail: 'Pack@example.com' } },
      personalizados: { custom: { clientContact: 'Custom@example.com' } },
      appointments: { call: { clientEmail: 'Call@example.com' } },
    },
  };
  for (const address of ['pack@example.com', 'custom@example.com', 'call@example.com']) {
    const response = await requestCode({
      request: makeReq('/api/id/request-code', 'POST', { email: ' ' + address.toUpperCase() + ' ', intent: 'portal_login' }),
      env: firstLogin,
    });
    assert.equal(response.status, 200);
    assert.equal(inbox.at(-1)?.to, address);
    assert.match(inbox.at(-1).code, /^\d{6}$/);
    assert.ok(await getOtpChallenge(firstLogin, address, 'login'));
  }
  assert.equal(inbox.length, 3);
  console.log('nuaIdIdentity.test: ALL 19 ASSERTION GROUPS PASSED');
}

runTests().catch((err) => {
  console.error('nuaIdIdentity.test FAILED:', err);
  process.exit(1);
});
