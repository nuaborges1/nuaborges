import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { onRequestPost as adminLogin } from '@/functions/api/auth/login';
import {
  onRequestGet as adminFeedbackGet,
  onRequestPost as adminFeedbackPost,
} from '@/functions/api/admin/prelaunch-feedback';
import { onRequestGet as adminAttachmentGet } from '@/functions/api/admin/prelaunch-feedback/attachment';
import { onRequestGet as publicSessionGet } from '@/functions/api/prelaunch-feedback/session';
import { onRequestPost as publicStartPost } from '@/functions/api/prelaunch-feedback/start';
import { onRequestPost as publicUploadPost } from '@/functions/api/prelaunch-feedback/upload';
import { onRequestPost as publicSubmitPost } from '@/functions/api/prelaunch-feedback/submit';
import * as mediaStore from '@/functions/api/_mediaStore';
import {
  FEEDBACK_COMPLETION,
  FEEDBACK_INTRO,
  FEEDBACK_PARTS,
  ISSUE_AREA_OPTIONS,
  PART6_ACTIVITY_OPTIONS,
} from '@/lib/prelaunchFeedback';
import { IsolatedBackendHarness } from '../helpers/supabaseStub';
import { extractCookies, serializeCookieJar, TEST_SECRETS } from '../factories/domainFactories';

// PNG 1x1 válido (magic bytes 89 50 4E 47 0D 0A 1A 0A)
const VALID_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
]);

describe('Sistema de Avaliação do Pré-lançamento — API, Segurança, Concorrência, Anexos e Exportação', () => {
  let harness: IsolatedBackendHarness;
  let env: Record<string, any>;
  let adminCookie: string;
  let nuaCookie: string;
  const PHDEV_TEST_PASS = 'PhdevTestPass!2026';
  const mockStorage = new Map<string, { body: ArrayBuffer; contentType: string }>();

  beforeEach(async () => {
    mockStorage.clear();
    harness = new IsolatedBackendHarness();
    harness.installFetchInterceptor();
    env = harness.createEnv({
      ADMIN_PASSWORD: TEST_SECRETS.ADMIN_PASSWORD,
      DEV_PANEL_PASSWORD: PHDEV_TEST_PASS,
      ADMIN_SESSION_SECRET: TEST_SECRETS.ADMIN_SESSION_SECRET,
      NEXT_PUBLIC_SITE_URL: 'https://nuaborges.com.br',
    });

    vi.spyOn(mediaStore, 'putMedia').mockImplementation(async (_env, key, body, contentType) => {
      mockStorage.set(key, { body, contentType });
    });
    vi.spyOn(mediaStore, 'getMedia').mockImplementation(async (_env, key) => {
      const found = mockStorage.get(key);
      if (!found) return null;
      return { body: found.body, contentType: found.contentType, size: found.body.byteLength };
    });

    const devLoginRes = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.5' },
        body: JSON.stringify({ password: PHDEV_TEST_PASS }),
      }),
      env,
    });
    adminCookie = serializeCookieJar(extractCookies(devLoginRes.headers));

    const nuaLoginRes = await adminLogin({
      request: new Request('https://admin.nuaborges.com.br/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.6' },
        body: JSON.stringify({ password: TEST_SECRETS.ADMIN_PASSWORD }),
      }),
      env,
    });
    nuaCookie = serializeCookieJar(extractCookies(nuaLoginRes.headers));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    harness.restoreFetch();
  });

  async function adminAction(body: Record<string, unknown>) {
    return adminFeedbackPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/prelaunch-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
        body: JSON.stringify(body),
      }),
      env: env as any,
    });
  }

  function extractCode(url: string): string {
    return url.split('/avaliacao/')[1] || '';
  }

  it('garante linguagem 100% humana sem termos técnicos proibidos no formulário público', () => {
    const forbidden = [
      /\bui\/ux\b/i,
      /\binterface\b/i,
      /\busabilidade\b/i,
      /\bresponsividade\b/i,
      /\bbug\b/i,
      /\bcheckout\b/i,
      /\bautentica[cç][aã]o\b/i,
      /\bbackend\b/i,
      /\bfrontend\b/i,
      /\bapi\b/i,
      /\bfluxo\b/i,
      /\blayout\b/i,
      /\btoken\b/i,
      /\bvalida[cç][aã]o\b/i,
      /\bpersist[eê]ncia\b/i,
      /\bsistema de tickets\b/i,
    ];

    const allPublicTexts: string[] = [
      FEEDBACK_INTRO.title,
      ...FEEDBACK_INTRO.paragraphs,
      FEEDBACK_COMPLETION.title,
      FEEDBACK_COMPLETION.message,
      ...PART6_ACTIVITY_OPTIONS.map((o) => o.label),
      ...ISSUE_AREA_OPTIONS,
    ];

    for (const part of FEEDBACK_PARTS) {
      allPublicTexts.push(part.shortTitle, part.title, part.subtitle);
      if (part.gateQuestion) {
        allPublicTexts.push(
          part.gateQuestion.label,
          part.gateQuestion.yesLabel,
          part.gateQuestion.noLabel
        );
      }
      for (const q of part.questions) {
        allPublicTexts.push(q.label);
        if (q.helper) allPublicTexts.push(q.helper);
        if (q.placeholder) allPublicTexts.push(q.placeholder);
        if (q.explainPlaceholder) allPublicTexts.push(q.explainPlaceholder);
        for (const opt of q.options || []) allPublicTexts.push(opt.label);
      }
    }

    const joined = allPublicTexts.join('\n');
    for (const re of forbidden) {
      expect(joined).not.toMatch(re);
    }
  });

  it('gera links individuais e em lote com hash SHA-256 no banco e restringe admin estritamente ao PHDEV', async () => {
    // 1. Sem sessão admin -> 401
    const unauth = await adminFeedbackGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/prelaunch-feedback'),
      env: env as any,
    });
    expect(unauth.status).toBe(401);

    // 1b. Sessão da Nua Borges -> 403 (restrito exclusivamente ao PHDEV)
    const nuaGet = await adminFeedbackGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/prelaunch-feedback', {
        headers: { Cookie: nuaCookie },
      }),
      env: env as any,
    });
    expect(nuaGet.status).toBe(403);

    const nuaPost = await adminFeedbackPost({
      request: new Request('https://admin.nuaborges.com.br/api/admin/prelaunch-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: nuaCookie },
        body: JSON.stringify({ action: 'generate_links', count: 1 }),
      }),
      env: env as any,
    });
    expect(nuaPost.status).toBe(403);

    // 2. Geração individual (1 link)
    const oneRes = await adminAction({ action: 'generate_links', count: 1 });
    expect(oneRes.status).toBe(201);
    const oneData = await oneRes.json();
    expect(oneData.generated).toHaveLength(1);
    expect(oneData.generated[0].adminCode).toBe('AV-001');
    const rawCode1 = extractCode(oneData.generated[0].url);
    expect(rawCode1.length).toBeGreaterThanOrEqual(24);

    // 3. Geração em lote (5 links)
    const batchRes = await adminAction({ action: 'generate_links', count: 5 });
    expect(batchRes.status).toBe(201);
    const batchData = await batchRes.json();
    expect(batchData.generated).toHaveLength(5);
    expect(batchData.generated[0].adminCode).toBe('AV-002');
    expect(batchData.generated[4].adminCode).toBe('AV-006');

    // 4. Banco armazena APENAS hash, nunca o código bruto
    const storedRow = harness.tables.prelaunch_feedback_links.find((r) => r.admin_code === 'AV-001');
    expect(storedRow).toBeTruthy();
    expect(storedRow.code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedRow.code_hash).not.toBe(rawCode1);
    expect(JSON.stringify(storedRow).includes(rawCode1)).toBe(false);

    // 5. GET admin não vaza code_hash nem rawCode
    const listRes = await adminFeedbackGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/prelaunch-feedback', {
        headers: { Cookie: adminCookie },
      }),
      env: env as any,
    });
    expect(listRes.status).toBe(200);
    const listText = await listRes.text();
    expect(listText.includes(rawCode1)).toBe(false);
    expect(listText.includes(storedRow.code_hash)).toBe(false);

    // 6. Link de avaliação NÃO pode ser usado como Bearer/cookie no admin
    const forgeAdmin = await adminFeedbackGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/prelaunch-feedback', {
        headers: { Authorization: `Bearer ${rawCode1}` },
      }),
      env: env as any,
    });
    expect(forgeAdmin.status).toBe(401);
  });

  it('valida ciclo completo de estados: válido, inválido, em andamento, revogado, anexos privados, envio único concorrente e reabertura', async () => {
    const genRes = await adminAction({ action: 'generate_links', count: 2 });
    const { generated } = await genRes.json();
    const codeA = extractCode(generated[0].url);
    const codeB = extractCode(generated[1].url);
    const linkBId = generated[1].id;

    // Link inválido
    const invalidRes = await publicSessionGet({
      request: new Request('https://nuaborges.com.br/api/prelaunch-feedback/session?code=codigo-inexistente-123456'),
      env: env as any,
    });
    expect(await invalidRes.json()).toMatchObject({ state: 'invalid' });

    // Link válido -> available
    const validRes = await publicSessionGet({
      request: new Request(`https://nuaborges.com.br/api/prelaunch-feedback/session?code=${codeA}`),
      env: env as any,
    });
    const validBody = await validRes.json();
    expect(validBody).toMatchObject({ state: 'available' });

    // Iniciar -> in_progress
    const startRes = await publicStartPost({
      request: new Request('https://nuaborges.com.br/api/prelaunch-feedback/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeA }),
      }),
      env: env as any,
    });
    expect(startRes.status).toBe(200);
    expect(await startRes.json()).toMatchObject({ ok: true, state: 'in_progress' });

    // Upload de arquivo malicioso (texto disfarçado de PNG) -> 415 rejeitado
    const badUpload = await publicUploadPost({
      request: new Request('https://nuaborges.com.br/api/prelaunch-feedback/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          'X-Feedback-Code': codeA,
          'X-File-Name': 'falso.png',
        },
        body: new TextEncoder().encode('<script>alert(1)</script>'),
      }),
      env: env as any,
    });
    expect(badUpload.status).toBe(415);

    // Upload de imagem PNG válida -> 201 em caminho privado
    const goodUpload = await publicUploadPost({
      request: new Request('https://nuaborges.com.br/api/prelaunch-feedback/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/png',
          'X-Feedback-Code': codeA,
          'X-File-Name': 'tela-erro.png',
        },
        body: VALID_PNG_BYTES,
      }),
      env: env as any,
    });
    expect(goodUpload.status).toBe(201);
    const { attachment } = await goodUpload.json();
    expect(attachment.key).toMatch(/^objects\/private\/prelaunch-feedback\//);

    // Anexo privado: bloqueado sem sessão (401), bloqueado para Nua (403), bloqueado traversal (400), permitido para PHDEV (200)
    const attUnauth = await adminAttachmentGet({
      request: new Request(
        `https://admin.nuaborges.com.br/api/admin/prelaunch-feedback/attachment?key=${encodeURIComponent(attachment.key)}`
      ),
      env: env as any,
    });
    expect(attUnauth.status).toBe(401);

    const attNua = await adminAttachmentGet({
      request: new Request(
        `https://admin.nuaborges.com.br/api/admin/prelaunch-feedback/attachment?key=${encodeURIComponent(attachment.key)}`,
        { headers: { Cookie: nuaCookie } }
      ),
      env: env as any,
    });
    expect(attNua.status).toBe(403);

    const attTraversal = await adminAttachmentGet({
      request: new Request(
        'https://admin.nuaborges.com.br/api/admin/prelaunch-feedback/attachment?key=objects/private/prelaunch-feedback/../vault/secret.png',
        { headers: { Cookie: adminCookie } }
      ),
      env: env as any,
    });
    expect(attTraversal.status).toBe(400);

    const attOk = await adminAttachmentGet({
      request: new Request(
        `https://admin.nuaborges.com.br/api/admin/prelaunch-feedback/attachment?key=${encodeURIComponent(attachment.key)}`,
        { headers: { Cookie: adminCookie } }
      ),
      env: env as any,
    });
    expect(attOk.status).toBe(200);
    expect(attOk.headers.get('Content-Type')).toBe('image/png');

    // Envio concorrente simultâneo com o mesmo link (duas abas) -> exatamente 1 sucesso e 1 conflito 409!
    const submitPayload = {
      code: codeA,
      firstName: 'Camila',
      lastName: 'Rocha',
      answers: {
        p1_nota_aparencia: 5,
        p2_aparelho: 'celular',
        p3_visitou_packs: 'sim',
        p3_apresentacao_fotos: 4,
        p4_visitou_personalizados: 'nao',
        p5_visitou_chamadas: 'sim',
        p6_atividades: ['apenas_visitei'],
        p8_nota_geral: 5,
        p8_mais_gostou: 'Visual elegante e acolhedor',
      },
      issues: [
        {
          area: 'Packs',
          whatTrying: 'Abrir uma foto de prévia',
          whatHappened: 'A foto demorou para abrir no celular',
          whatExpected: 'Abrir na hora',
          happenedMoreThanOnce: 'yes',
          attachments: [attachment],
        },
        {
          area: 'Chamadas VIP',
          whatTrying: 'Ver horários disponíveis',
          whatHappened: 'Calendário ficou um pouco apertado',
          happenedMoreThanOnce: 'no',
          attachments: [],
        },
      ],
    };

    const makeSubmit = () =>
      publicSubmitPost({
        request: new Request('https://nuaborges.com.br/api/prelaunch-feedback/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitPayload),
        }),
        env: env as any,
      });

    const [s1, s2] = await Promise.all([makeSubmit(), makeSubmit()]);
    const statuses = [s1.status, s2.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(harness.tables.prelaunch_feedback_responses).toHaveLength(1);
    expect(harness.tables.prelaunch_feedback_issues).toHaveLength(2);

    // Reabertura após conclusão -> mensagem amigável, SEM nome nem respostas
    const reopenRes = await publicSessionGet({
      request: new Request(`https://nuaborges.com.br/api/prelaunch-feedback/session?code=${codeA}`),
      env: env as any,
    });
    const reopenBody = await reopenRes.json();
    expect(reopenBody).toEqual({
      state: 'completed',
      message: 'Essa avaliação já foi enviada. Muito obrigada por participar!',
    });
    expect(JSON.stringify(reopenBody).includes('Camila')).toBe(false);

    // Revogação do link B não afeta link A; e link B fica bloqueado
    const revB = await adminAction({ action: 'revoke_link', linkId: linkBId });
    expect(revB.status).toBe(200);
    const revSession = await publicSessionGet({
      request: new Request(`https://nuaborges.com.br/api/prelaunch-feedback/session?code=${codeB}`),
      env: env as any,
    });
    expect(await revSession.json()).toMatchObject({ state: 'revoked' });

    // Link já respondido (A) não pode ser revogado
    const revA = await adminAction({ action: 'revoke_link', linkId: generated[0].id });
    expect(revA.status).toBe(409);
  });

  it('atualiza estados no admin, detecta problemas semelhantes, exporta CSV/JSON sanitizados e encerra coleta preservando dados', async () => {
    const genRes = await adminAction({ action: 'generate_links', count: 3 });
    const { generated } = await genRes.json();
    const code1 = extractCode(generated[0].url);
    const code2 = extractCode(generated[1].url);
    const code3 = extractCode(generated[2].url);

    // Dois participantes relatam problema semelhante em Packs
    for (const [idx, code] of [code1, code2].entries()) {
      const sub = await publicSubmitPost({
        request: new Request('https://nuaborges.com.br/api/prelaunch-feedback/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            firstName: idx === 0 ? 'Ana' : 'Bruno',
            lastName: idx === 0 ? 'Silva' : 'Costa',
            answers: { p1_nota_aparencia: 4, p8_nota_geral: idx === 0 ? 5 : 4, p3_visitou_packs: 'sim' },
            issues: [
              {
                area: 'Packs',
                whatTrying: 'Abrir prévia',
                whatHappened: 'Imagem demorou abrir celular',
                happenedMoreThanOnce: 'yes',
                attachments: [],
              },
            ],
          }),
        }),
        env: env as any,
      });
      expect(sub.status).toBe(201);
    }

    // Consulta no admin: métricas + recorrência (2 relatos semelhantes preservados separadamente)
    const get1 = await adminFeedbackGet({
      request: new Request('https://admin.nuaborges.com.br/api/admin/prelaunch-feedback', {
        headers: { Cookie: adminCookie },
      }),
      env: env as any,
    });
    const d1 = await get1.json();
    expect(d1.metrics).toMatchObject({
      linksGenerated: 3,
      linksAvailable: 1,
      linksCompleted: 2,
      responsesReceived: 2,
      responsesPendingReview: 2,
      issuesReported: 2,
      issuesResolved: 0,
      averageOverallRating: 4.5,
    });
    expect(d1.issues).toHaveLength(2);
    expect(d1.issues[0].similarCount).toBe(2);
    expect(d1.issues[1].similarCount).toBe(2);

    // Atualiza status da avaliação e do problema
    const updResp = await adminAction({
      action: 'update_response',
      responseId: d1.responses[0].id,
      reviewStatus: 'reviewed',
      adminNotes: 'Feedback revisado com a Nua',
    });
    expect(updResp.status).toBe(200);

    const updIss = await adminAction({
      action: 'update_issue',
      issueId: d1.issues[0].id,
      issueStatus: 'resolved',
      adminNotes: 'Otimizado carregamento de prévias',
    });
    expect(updIss.status).toBe(200);

    // Encerramento da coleta: bloqueia link 3 disponível, preserva respostas já recebidas
    const closeRes = await adminAction({
      action: 'update_settings',
      collectionActive: false,
      hideFromSidebar: true,
    });
    expect(closeRes.status).toBe(200);
    expect((await closeRes.json()).settings).toMatchObject({
      collectionActive: false,
      hideFromSidebar: true,
    });

    const closedSession = await publicSessionGet({
      request: new Request(`https://nuaborges.com.br/api/prelaunch-feedback/session?code=${code3}`),
      env: env as any,
    });
    expect(await closedSession.json()).toMatchObject({ state: 'closed' });

    const blockedSubmit = await publicSubmitPost({
      request: new Request('https://nuaborges.com.br/api/prelaunch-feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code3, firstName: 'Tarde', lastName: 'Demais', answers: {}, issues: [] }),
      }),
      env: env as any,
    });
    expect(blockedSubmit.status).toBe(403);

    // Exportações CSV e JSON continuam funcionando após encerramento e NÃO expõem hashes ou códigos
    const csvRes = await adminAction({ action: 'export', format: 'csv', scope: 'responses' });
    expect(csvRes.status).toBe(200);
    const csvText = await csvRes.text();
    expect(csvText.includes('Ana')).toBe(true);
    expect(csvText.includes('Bruno')).toBe(true);
    expect(csvText.includes(code1)).toBe(false);
    expect(csvText.includes('code_hash')).toBe(false);

    const jsonRes = await adminAction({ action: 'export', format: 'json', scope: 'all' });
    expect(jsonRes.status).toBe(200);
    const jsonText = await jsonRes.text();
    const exported = JSON.parse(jsonText);
    expect(exported.responses).toHaveLength(2);
    expect(exported.consolidated.issuesResolved).toBe(1);
    expect(jsonText.includes(code1)).toBe(false);
    expect(jsonText.includes(code2)).toBe(false);
    expect(jsonText.includes('code_hash')).toBe(false);
  });
});
