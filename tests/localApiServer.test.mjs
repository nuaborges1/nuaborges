/**
 * TESTES DO SERVIDOR API LOCAL DE DESENVOLVIMENTO — Nua Borges
 *
 * Valida as rotas espelhadas das Cloudflare Pages Functions e as garantias de
 * segurança do servidor local (tools/localApiServer.mjs):
 *
 *  1. Validação e sanitização de /api/audit/event
 *  2. Validação de chave/antipath-traversal em /api/media/*
 *  3. Contrato do presign (200 + uploadUrl vazio → fallback multipart)
 *  4. Login administrativo: senha errada 401, senha certa 200, sem vazamento
 *  5. Rate limiting por IP (5 tentativas / 15 min → 429)
 *  6. Sessão e logout
 *  7. /api/music/oembed e /api/music/upload (JSON externo e binário)
 *  8. Proxy de mídia /media/* (traversal bloqueado; sem storage → erro explícito)
 *  9. 404 padrão com requestId e sem caminhos absolutos/senha na resposta
 * 10. CORS restrito a origens de loopback
 *
 * O servidor roda em um diretório temporário com credenciais fictícias apenas
 * para o processo de teste — nada escreve nos dados reais de desenvolvimento.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ORIGINAL_CWD = process.cwd();
const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'nua-localapi-test-'));

const TEST_ADMIN_PASSWORD = 'senha-ficticia-de-teste-2026';
const TEST_ADMIN_SECRET = 'segredo-ficticio-de-teste-2026';

process.chdir(TMP_ROOT);
process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
process.env.ADMIN_API_SECRET = TEST_ADMIN_SECRET;
delete process.env.CLIENT_PASSWORD;
delete process.env.CONTRACT_PASSWORD;

// Pedido de teste controlado para validar a edição administrativa sem depender
// de Mercado Pago (o checkout real exige chave configurada). Precisa existir ANTES do
// import do servidor, que carrega os stores em memória na inicialização.
const TEST_DATA_DIR = path.join(TMP_ROOT, 'data');
fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
fs.writeFileSync(
  path.join(TEST_DATA_DIR, 'local_personalizados.json'),
  JSON.stringify({
    ped_teste_1: {
      id: 'ped_teste_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientName: 'Cliente Teste',
      clientContact: 'teste@example.com',
      photoCount: 3,
      totalPrice: 111,
      status: 'aguardando_pagamento',
      payment: { status: 'pending' },
    },
  }),
  'utf-8'
);

const { startLocalApiServer } = await import('../tools/localApiServer.mjs');

let server = null;
let base = '';

const json = (method, urlPath, body, extraHeaders = {}) =>
  fetch(`${base}${urlPath}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('Servidor API local (espelho das Pages Functions)', () => {
  before(async () => {
    server = await startLocalApiServer(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(() => {
    if (server) {
      server.closeAllConnections?.();
      server.close();
    }
    process.chdir(ORIGINAL_CWD);
    fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  });

  test('audit/event: rejeita payload sem campos obrigatórios (400)', async () => {
    const res = await json('POST', '/api/audit/event', { type: 'TEST' });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(String(body.error), /type|summary/i);
  });

  test('audit/event: aceita evento válido e redige segredos do details', async () => {
    const res = await json('POST', '/api/audit/event', {
      type: 'TEST_EVENT',
      summary: 'Evento de teste',
      severity: 'info',
      details: { password: 'super-secreta', nota: 'ok' },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.event.details.password, '[REDACTED]');
    assert.equal(body.event.details.nota, 'ok');
    assert.ok(!JSON.stringify(body).includes('super-secreta'), 'senha não pode aparecer na resposta');
  });

  test('appointments/admin: GET devolve settings canônicas completas', async () => {
    const res = await fetch(`${base}/api/appointments/admin`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.settings.timezone, 'America/Sao_Paulo');
    assert.deepEqual(Object.keys(body.settings.weeklyHours).sort(), ['0', '1', '2', '3', '4', '5', '6']);
    assert.ok(Array.isArray(body.settings.blockedDates));
    assert.ok(Array.isArray(body.settings.blockedSlots));
    assert.equal(body.settings.weeklyHours['0'].enabled, false);
    assert.equal(body.settings.weeklyHours['1'].ranges[0].start, '14:00');
    assert.ok(Array.isArray(body.modalities) && body.modalities.length >= 1);
    assert.ok(Array.isArray(body.modalities[0].rules));
    assert.ok(Array.isArray(body.bookings));
  });

  test('appointments/admin: updateSettings parcial preserva defaults e persiste', async () => {
    const res = await json('POST', '/api/appointments/admin', {
      action: 'updateSettings',
      settings: { blockedDates: ['2026-12-25'], minNoticeHours: 8 },
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.deepEqual(updated.settings.blockedDates, ['2026-12-25']);
    assert.equal(updated.settings.minNoticeHours, 8);
    assert.equal(updated.settings.weeklyHours['2'].ranges[0].start, '14:00');

    const getRes = await fetch(`${base}/api/appointments/admin`);
    const body = await getRes.json();
    assert.deepEqual(body.settings.blockedDates, ['2026-12-25']);
    assert.equal(body.settings.weeklyHours['6'].ranges[0].end, '21:00');
    assert.ok(Array.isArray(body.modalities[0].rules));
  });

  const writeProposal = (proposal) => {
    const dir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dir, { recursive: true });
    const safeId = String(proposal.proposalId).replace(/[^a-zA-Z0-9_-]/g, '_');
    fs.writeFileSync(
      path.join(dir, `kv_nua_ai_proposal_${safeId}.json`),
      JSON.stringify(proposal),
      'utf-8'
    );
  };

  const makeProposal = (suffix, overrides = {}) => ({
    proposalId: `prop_teste_${suffix}`,
    nonce: `nonce_${suffix}`,
    actionType: 'update_appointment_settings',
    targetId: 'appointments_settings',
    summary: 'Atualizar os horários e as modalidades das chamadas VIP?',
    proposedChanges: { settings: { blockedDates: ['2026-12-31'], minNoticeHours: 7 } },
    payload: { settings: { blockedDates: ['2026-12-31'], minNoticeHours: 7 } },
    expiresAt: Date.now() + 60_000,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  test('nua-ai/approve-action: aplica proposta sensível após confirmação', async () => {
    const proposal = makeProposal('ok');
    writeProposal(proposal);

    const res = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: proposal.proposalId,
      nonce: proposal.nonce,
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.message, /atualizados/i);

    const getRes = await fetch(`${base}/api/appointments/admin`);
    const data = await getRes.json();
    assert.ok(data.settings.blockedDates.includes('2026-12-31'));
    assert.equal(data.settings.minNoticeHours, 7);
  });

  test('nua-ai/approve-action: não permite reaproveitar o mesmo pedido', async () => {
    const proposal = makeProposal('replay');
    writeProposal(proposal);

    const first = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: proposal.proposalId,
      nonce: proposal.nonce,
    });
    assert.equal(first.status, 200);

    const replay = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: proposal.proposalId,
      nonce: proposal.nonce,
    });
    assert.equal(replay.status, 409);
    const body = await replay.json();
    assert.equal(body.success, false);
    assert.match(body.error, /já foi aplicado/i);
  });

  test('nua-ai/approve-action: recusa confirmação com assinatura errada', async () => {
    const proposal = makeProposal('nonce');
    writeProposal(proposal);

    const res = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: proposal.proposalId,
      nonce: 'assinatura-errada',
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  test('nua-ai/approve-action: recusa pedido expirado', async () => {
    const proposal = makeProposal('expirado', { expiresAt: Date.now() - 1000 });
    writeProposal(proposal);

    const res = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: proposal.proposalId,
      nonce: proposal.nonce,
    });
    assert.equal(res.status, 410);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /expirou/i);
  });

  test('nua-ai/approve-action: pedido inexistente responde mensagem amigável', async () => {
    const res = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: 'prop_nao_existe',
      nonce: 'nonce_qualquer',
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.error, /não está mais disponível/i);
    assert.ok(!/proposalId|nonce/i.test(body.error));
  });

  test('appointments/admin: patch parcial de um dia não reabre os dias fechados', async () => {
    const mondayOnly = {
      weeklyHours: Object.fromEntries(
        Array.from({ length: 7 }, (_, day) => [
          String(day),
          day === 1
            ? { enabled: true, ranges: [{ start: '09:00', end: '18:00' }] }
            : { enabled: false, ranges: [] },
        ])
      ),
    };

    const first = await json('POST', '/api/appointments/admin', {
      action: 'updateSettings',
      settings: mondayOnly,
    });
    assert.equal(first.status, 200);

    // Envia só a segunda-feira: terça/sábado precisam continuar fechados.
    const partial = await json('POST', '/api/appointments/admin', {
      action: 'updateSettings',
      settings: { weeklyHours: { 1: { enabled: true, ranges: [{ start: '10:00', end: '17:00' }] } } },
    });
    assert.equal(partial.status, 200);

    const getRes = await fetch(`${base}/api/appointments/admin`);
    const body = await getRes.json();
    assert.equal(body.settings.weeklyHours['1'].ranges[0].start, '10:00');
    assert.equal(body.settings.weeklyHours['2'].enabled, false);
    assert.equal(body.settings.weeklyHours['6'].enabled, false);

    // Restaura segunda 09h–18h para os testes de disponibilidade.
    await json('POST', '/api/appointments/admin', {
      action: 'updateSettings',
      settings: { weeklyHours: { 1: { enabled: true, ranges: [{ start: '09:00', end: '18:00' }] } } },
    });
  });

  test('appointments/admin: rejeita horário de término antes do início', async () => {
    const res = await json('POST', '/api/appointments/admin', {
      action: 'updateSettings',
      settings: { weeklyHours: { 1: { enabled: true, ranges: [{ start: '18:00', end: '09:00' }] } } },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /término precisa ser depois/i);
  });

  test('appointments/availability: segunda tem horários, terça fica fechada', async () => {
    const mondayDate = new Date();
    mondayDate.setUTCDate(mondayDate.getUTCDate() + ((8 - mondayDate.getUTCDay()) % 7 || 7) + 7);
    const tuesdayDate = new Date(mondayDate);
    tuesdayDate.setUTCDate(tuesdayDate.getUTCDate() + 1);
    const dateKey = (date) => date.toISOString().slice(0, 10);
    const monday = await fetch(
      `${base}/api/appointments/availability?date=${dateKey(mondayDate)}&modalityId=chamada-30`
    );
    assert.equal(monday.status, 200);
    const mondayBody = await monday.json();
    assert.equal(mondayBody.success, true);
    assert.ok(mondayBody.slots.length > 0);
    assert.equal(mondayBody.slots[0], '09:00');
    assert.ok(!mondayBody.slots.some((slot) => slot >= '18:00'));

    const tuesday = await fetch(
      `${base}/api/appointments/availability?date=${dateKey(tuesdayDate)}&modalityId=chamada-30`
    );
    const tuesdayBody = await tuesday.json();
    assert.equal(tuesdayBody.success, true);
    assert.deepEqual(tuesdayBody.slots, []);
  });

  test('Nua IA: set_appointment_hours desativa os outros dias após aprovação', async () => {
    const { executeTool } = await import('../lib/nuaAi/toolRegistry.mjs');
    const { createAssistantServices } = await import('../lib/nuaAi/assistantServices.mjs');
    const services = createAssistantServices({}, fetch, { origin: base });

    const outcome = await executeTool(
      'set_appointment_hours',
      { days: [1], start: '09:00', end: '18:00' },
      { role: 'dev', services, conversationId: 'conv_teste_agenda', content: {}, overview: {} }
    );
    assert.equal(outcome.ok, true, outcome.summary);
    assert.ok(outcome.proposal?.proposalId);
    assert.ok(outcome.proposal?.nonce);
    assert.match(outcome.proposal.summary, /somente em segunda-feira/i);

    const approved = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: outcome.proposal.proposalId,
      nonce: outcome.proposal.nonce,
    });
    assert.equal(approved.status, 200);
    const approvedBody = await approved.json();
    assert.equal(approvedBody.success, true);

    const getRes = await fetch(`${base}/api/appointments/admin`);
    const body = await getRes.json();
    assert.equal(body.settings.weeklyHours['1'].enabled, true);
    assert.deepEqual(body.settings.weeklyHours['1'].ranges, [{ start: '09:00', end: '18:00' }]);
    for (const day of ['0', '2', '3', '4', '5', '6']) {
      assert.equal(body.settings.weeklyHours[day].enabled, false, `dia ${day} deveria estar fechado`);
    }
  });

  test('media/presign: responde 200 com uploadUrl vazio (fallback multipart)', async () => {
    const res = await json('POST', '/api/media/presign', {
      key: 'media/teste.webp',
      mimeType: 'image/webp',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.uploadUrl, '');
    assert.equal(body.fallback, 'multipart');
  });

  test('media/presign: rejeita chave com path traversal (400)', async () => {
    const res = await json('POST', '/api/media/presign', {
      key: 'media/../../etc.webp',
      mimeType: 'image/webp',
    });
    assert.equal(res.status, 400);
  });

  test('media/list: responde 200 com lista vazia em diretório novo', async () => {
    const res = await fetch(`${base}/api/media/list`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.items));
  });

  test('telemetry/track: descarta evento com 204', async () => {
    const res = await json('POST', '/api/telemetry/track', { event: 'play' });
    assert.equal(res.status, 204);
  });

  test('auth/login: senha errada responde 401 sem ecoar a senha', async () => {
    const res = await json('POST', '/api/auth/login', { password: 'senha-completamente-errada' });
    assert.equal(res.status, 401);
    const text = await res.text();
    assert.ok(!text.includes('senha-completamente-errada'), 'a senha enviada não pode voltar no corpo');
    assert.ok(!text.includes(TEST_ADMIN_PASSWORD), 'a senha real não pode aparecer na resposta');
  });

  test('auth/login: senha correta devolve token, papel e cookie HttpOnly', async () => {
    const res = await json('POST', '/api/auth/login', { password: TEST_ADMIN_PASSWORD });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.role, 'admin');
    assert.ok(typeof body.token === 'string' && body.token.length > 20);
    assert.ok(!JSON.stringify(body).includes(TEST_ADMIN_PASSWORD));

    const cookie = res.headers.get('set-cookie') || '';
    assert.match(cookie, /nua_admin_session=/);
    assert.match(cookie, /HttpOnly/i);
  });

  test('auth/session: valida token emitido e dispensa em localhost (como a produção)', async () => {
    const login = await json('POST', '/api/auth/login', { password: TEST_ADMIN_PASSWORD });
    const { token } = await login.json();

    const withToken = await json('GET', '/api/auth/session', undefined, {
      Authorization: `Bearer ${token}`,
    });
    assert.equal(withToken.status, 200);
    const sessionBody = await withToken.json();
    assert.equal(sessionBody.authenticated, true);
    assert.equal(sessionBody.role, 'admin');

    const withoutToken = await fetch(`${base}/api/auth/session`);
    assert.equal(withoutToken.status, 200);
    const anonymous = await withoutToken.json();
    assert.equal(anonymous.authenticated, true);
    assert.equal(anonymous.role, 'dev');
    assert.equal(anonymous.sub, 'local_dev');
  });

  test('auth/logout: encerra a sessão e limpa o cookie', async () => {
    const login = await json('POST', '/api/auth/login', { password: TEST_ADMIN_PASSWORD });
    const { token } = await login.json();
    const res = await json('POST', '/api/auth/logout', undefined, {
      Authorization: `Bearer ${token}`,
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('set-cookie') || '', /Max-Age=0/i);
  });

  test('auth/contract: rejeita chave errada (401) e aceita a senha administrativa', async () => {
    const wrong = await json('POST', '/api/auth/contract', { password: 'chave-errada' });
    assert.equal(wrong.status, 401);

    const right = await json('POST', '/api/auth/contract', { password: TEST_ADMIN_PASSWORD });
    assert.equal(right.status, 200);
    const body = await right.json();
    assert.equal(body.success, true);
    assert.match(body.role, /^contract_/);
  });

  test('auth/login: aplica rate limiting por IP após as tentativas permitidas', async () => {
    // 5 tentativas por janela de 15 min; a seguinte responde 429 com Retry-After.
    let sawTooMany = false;
    for (let i = 0; i < 8 && !sawTooMany; i++) {
      const res = await json('POST', '/api/auth/login', { password: `errada-${i}` });
      if (res.status === 429) {
        sawTooMany = true;
        assert.equal(res.headers.get('retry-after'), '900');
        const body = await res.json();
        assert.match(String(body.error), /tentativas/i);
      } else {
        assert.equal(res.status, 401);
      }
    }
    assert.ok(sawTooMany, 'o rate limiting deve ser aplicado dentro de 8 tentativas');
  });

  test('music/oembed: exige url e valida o esquema', async () => {
    const missing = await fetch(`${base}/api/music/oembed`);
    assert.equal(missing.status, 400);

    const invalid = await fetch(`${base}/api/music/oembed?url=ftp://x`);
    assert.equal(invalid.status, 400);
  });

  test('music/oembed: URL fora dos provedores cai no fallback genérico', async () => {
    const res = await fetch(`${base}/api/music/oembed?url=${encodeURIComponent('https://example.com/faixa')}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.provider, 'generic');
    assert.equal(body.type, 'external_audio');
  });

  test('music/upload: registra faixa externa (JSON) e lista na biblioteca', async () => {
    const res = await json('POST', '/api/music/upload', {
      title: 'Faixa de Teste',
      artist: 'Nua Borges',
      url: 'https://open.spotify.com/track/abc',
      type: 'spotify_track',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.track.title, 'Faixa de Teste');
    assert.equal(body.track.active, true);

    const list = await fetch(`${base}/api/music/list`);
    const lib = await list.json();
    assert.ok(lib.tracks.some((t) => t.title === 'Faixa de Teste'));
  });

  test('music/upload: exige título e URL para faixa externa (400)', async () => {
    const res = await json('POST', '/api/music/upload', { title: 'Sem URL' });
    assert.equal(res.status, 400);
  });

  test('music/upload: rejeita chave fora de audio/ (400)', async () => {
    const res = await fetch(`${base}/api/music/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Object-Key': 'media/nao-e-audio.mp3',
        'X-Mime-Type': 'audio/mpeg',
      },
      body: Buffer.from('ID3fakefakefakefakefakefakefakefake', 'utf8'),
    });
    assert.equal(res.status, 400);
  });

  test('proxy /media/*: bloqueia path traversal e reporta storage ausente', async () => {
    const traversal = await fetch(`${base}/media/..%2f..%2f.env.local`);
    assert.equal(traversal.status, 400);

    const missing = await fetch(`${base}/media/media-inexistente/arquivo.webp`);
    assert.ok([404, 503].includes(missing.status), `status inesperado: ${missing.status}`);
    const text = await missing.text();
    assert.ok(!text.includes(TMP_ROOT), 'caminho absoluto local não pode aparecer na resposta');
  });

  test('rota inexistente: 404 com requestId e sem detalhes internos', async () => {
    const res = await fetch(`${base}/api/rota-que-nao-existe`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.ok(body.requestId, 'a resposta deve trazer um requestId para diagnóstico');
    const serialized = JSON.stringify(body);
    assert.ok(!serialized.includes('C:\\'), 'caminho Windows local não pode vazar');
    assert.ok(!serialized.includes('node_modules'));
    assert.ok(res.headers.get('x-request-id'), 'cabeçalho X-Request-Id presente');
  });

  test('CORS: reflete apenas origens de loopback', async () => {
    const loopback = await fetch(`${base}/api/status`, { headers: { Origin: 'http://localhost:3000' } });
    assert.equal(loopback.headers.get('access-control-allow-origin'), 'http://localhost:3000');

    const foreign = await fetch(`${base}/api/status`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(foreign.headers.get('access-control-allow-origin'), null);
  });

  test('requests: cria, lista, responde, muda andamento e exclui', async () => {
    const created = await json('POST', '/api/requests', {
      action: 'create',
      text: 'Ajustar o texto da seção sobre.',
      category: 'conteudo',
      triage: {
        title: 'Ajustar texto do sobre',
        summary: 'Trocar a frase de apresentação.',
        type: 'content',
        priority: 'medium',
        contractScope: 'franquia_suporte',
      },
    });
    assert.equal(created.status, 200);
    const createdBody = await created.json();
    assert.equal(createdBody.success, true);
    const id = createdBody.request.id;
    assert.equal(createdBody.request.status, 'new');

    const listed = await (await fetch(`${base}/api/requests`)).json();
    assert.ok(listed.requests.some((r) => r.id === id));

    const message = await json('POST', '/api/requests', {
      action: 'message',
      id,
      text: 'Pode deixar que já ajustei.',
      role: 'admin',
    });
    assert.equal(message.status, 200);
    const messageBody = await message.json();
    assert.equal(messageBody.request.messages.length, 2);

    const updated = await json('POST', '/api/requests', {
      action: 'update',
      id,
      status: 'done',
    });
    assert.equal(updated.status, 200);
    const updatedBody = await updated.json();
    assert.equal(updatedBody.request.status, 'done');
    assert.ok(updatedBody.request.completedAt);

    const removed = await json('POST', '/api/requests', { action: 'delete', id });
    assert.equal(removed.status, 200);
    const afterDelete = await (await fetch(`${base}/api/requests`)).json();
    assert.ok(!afterDelete.requests.some((r) => r.id === id));
  });

  test('Nua IA: update_request_status aplica após aprovação', async () => {
    const created = await json('POST', '/api/requests', {
      action: 'create',
      text: 'Solicitação para teste de aprovação.',
      triage: { title: 'Teste de aprovação', type: 'improvement', priority: 'low' },
    });
    const { request } = await created.json();

    const { executeTool } = await import('../lib/nuaAi/toolRegistry.mjs');
    const { createAssistantServices } = await import('../lib/nuaAi/assistantServices.mjs');
    const services = createAssistantServices({}, fetch, { origin: base });

    const outcome = await executeTool(
      'update_request_status',
      { id: request.id, status: 'in_progress' },
      { role: 'dev', services, conversationId: 'conv_teste_request', content: {}, overview: {} }
    );
    assert.equal(outcome.ok, true);
    assert.match(outcome.proposal.summary, /Em andamento/);

    const approved = await json('POST', '/api/nua-ai/approve-action', {
      proposalId: outcome.proposal.proposalId,
      nonce: outcome.proposal.nonce,
    });
    assert.equal(approved.status, 200);
    assert.equal((await approved.json()).success, true);

    const listed = await (await fetch(`${base}/api/requests`)).json();
    const found = listed.requests.find((r) => r.id === request.id);
    assert.equal(found.status, 'in_progress');

    await json('POST', '/api/requests', { action: 'delete', id: request.id });
  });

  test('finance/admin: baixa manual e reversão persistem', async () => {
    const before = await (await fetch(`${base}/api/finance/admin`)).json();
    assert.equal(before.installments.length, 10);
    const target = before.installments.find((i) => i.status !== 'paid');
    assert.ok(target, 'deve existir uma parcela pendente para o teste');

    const paid = await json('POST', '/api/finance/admin', {
      action: 'manual_pay',
      installmentNumber: target.number,
      paidAmount: target.amount,
      paymentMethod: 'pix',
    });
    assert.equal(paid.status, 200);
    const paidBody = await paid.json();
    assert.equal(paidBody.success, true);
    assert.equal(paidBody.installment.status, 'paid');

    const afterPay = await (await fetch(`${base}/api/finance/admin`)).json();
    assert.equal(afterPay.installments.find((i) => i.number === target.number).status, 'paid');

    const reverted = await json('POST', '/api/finance/admin', {
      action: 'revert',
      installmentNumber: target.number,
      reason: 'teste',
    });
    assert.equal(reverted.status, 200);
    const afterRevert = await (await fetch(`${base}/api/finance/admin`)).json();
    const restored = afterRevert.installments.find((i) => i.number === target.number);
    assert.equal(restored.status, 'pending');
    assert.equal(restored.paidAt, undefined);
  });

  test('personalizados/admin: salva preços e atualiza pedido', async () => {
    const saved = await json('POST', '/api/personalizados/admin', {
      action: 'save_settings',
      settings: { pricePerPhoto: 37, minPhotos: 2, maxPhotos: 8, videoEnabled: true },
    });
    assert.equal(saved.status, 200);
    const after = await (await fetch(`${base}/api/personalizados/admin`)).json();
    assert.equal(after.settings.pricePerPhoto, 37);
    assert.equal(after.settings.maxPhotos, 8);

    const created = await json('POST', '/api/personalizados/admin', {
      action: 'update_order',
      orderId: 'ped_teste_1',
      patch: { status: 'em_producao' },
    });
    assert.equal(created.status, 200);
    const createdBody = await created.json();
    assert.equal(createdBody.order.status, 'em_producao');
  });

  test('music: cadastra faixa externa, altera config e remove', async () => {
    const uploaded = await json('POST', '/api/music/upload', {
      title: 'Faixa de Teste',
      artist: 'Artista Teste',
      url: 'https://example.com/audio.mp3',
      provider: 'external',
    });
    assert.equal(uploaded.status, 200);

    let lib = await (await fetch(`${base}/api/music/list`)).json();
    const track = lib.tracks.find((t) => t.title === 'Faixa de Teste');
    assert.ok(track, 'faixa cadastrada deve aparecer na biblioteca');

    const config = await json('PUT', '/api/music/config', { autoplay: true, playlistTitle: 'Teste' });
    assert.equal(config.status, 200);
    lib = await (await fetch(`${base}/api/music/list`)).json();
    assert.equal(lib.config.autoplay, true);

    const removed = await json('DELETE', '/api/music/update', { id: track.id, deleteFile: false });
    assert.equal(removed.status, 200);
    lib = await (await fetch(`${base}/api/music/list`)).json();
    assert.ok(!lib.tracks.some((t) => t.id === track.id));
  });

  test('admin/vault: cria, lista e exclui credencial', async () => {
    const payload = {
      id: 'cred_teste_1',
      service: 'Serviço Teste',
      title: 'Conta de teste',
      username: 'teste@example.com',
      url: 'https://example.com',
      encryptedPassword: 'blob-cifrado-de-teste',
    };
    const created = await json('POST', '/api/admin/vault', payload);
    assert.equal(created.status, 200);

    const list = await (await fetch(`${base}/api/admin/vault`)).json();
    assert.ok(list.credentials.some((c) => c.id === payload.id));

    const removed = await fetch(`${base}/api/admin/vault?id=${payload.id}`, { method: 'DELETE' });
    assert.equal(removed.status, 200);
    const after = await (await fetch(`${base}/api/admin/vault`)).json();
    assert.ok(!after.credentials.some((c) => c.id === payload.id));
  });
});
