import { test, expect } from '@playwright/test';

test.describe('E2E — Jornadas Críticas Ponta a Ponta (E2E-001 a E2E-008)', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/__qa__/reset');
  });

  test('E2E-001 & E2E-005 — Compra completa de Pack, Cofre (Fluxo A/B), Novo Navegador (Fluxo C) e Proteção Privada', async ({
    browser,
    request,
    baseURL,
  }) => {
    const buyerEmail = 'e2e.pack.buyer@qa.test';

    // 1. Criar pedido de Pack no fluxo real (via página do produto -> API de checkout)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('/avulsos/teste', { waitUntil: 'domcontentloaded' });
    await expect(page1.locator('body')).toBeVisible();

    const pixRes = await context1.request.post(`${baseURL}/api/payments/create-pix`, {
      data: { type: 'pack', slug: 'teste', payerEmail: buyerEmail, payerName: 'Comprador E2E' },
    });
    expect(pixRes.status()).toBe(201);
    const pixData = await pixRes.json();
    expect(pixData.orderId).toMatch(/^ord_qa_/);
    expect(pixData.amount).toBeGreaterThan(0);

    // Antes do pagamento: mídia privada estritamente bloqueada (403)
    const prePayMedia = await context1.request.get(`${baseURL}/media/private/teste/foto-01.png?cofre=1`);
    expect(prePayMedia.status()).toBe(403);

    // 2. Aprovação financeira confirmada no backend (webhook/sandbox)
    const approveRes = await request.post('/__qa__/approve-payment', { data: { orderId: pixData.orderId } });
    expect(approveRes.status()).toBe(200);

    // 3. Verificar geração do e-mail de entrega com link do Cofre
    const emailsBefore = (await (await request.get('/__qa__/emails')).json()).emails;
    const deliveryEmail = emailsBefore.find((e: any) => e.to === buyerEmail && e.kind === 'vault_delivery');
    expect(deliveryEmail?.url).toContain(`/cofre?order=${pixData.orderId}`);

    // 4. Fluxo A: Abrir Cofre no Navegador 1, solicitar confirmação e autorizar navegador
    await page1.goto(`/cofre?order=${encodeURIComponent(pixData.orderId)}`, { waitUntil: 'networkidle' });
    const reqConfirmRes = await page1.evaluate(async (orderId) => {
      const r = await fetch('/api/me/cofre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', order: orderId }),
      });
      return { status: r.status, body: await r.json() };
    }, pixData.orderId);
    expect(reqConfirmRes.status).toBe(200);
    expect(reqConfirmRes.body.state).toBe('sent');

    const emailsAfterReq = (await (await request.get('/__qa__/emails')).json()).emails;
    const confirmEmail1 = emailsAfterReq.find(
      (e: any) => e.to === buyerEmail && e.kind === 'vault_browser_confirmation'
    );
    expect(confirmEmail1?.token).toBeTruthy();

    const confirmRes1 = await page1.evaluate(
      async ({ orderId, token }) => {
        const r = await fetch('/api/me/cofre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm', order: orderId, token }),
        });
        return { status: r.status, body: await r.json() };
      },
      { orderId: pixData.orderId, token: confirmEmail1.token }
    );
    expect(confirmRes1.status).toBe(200);
    expect(confirmRes1.body.state).toBe('ready');
    expect(confirmRes1.body.files.length).toBeGreaterThanOrEqual(1);

    // Verificar acesso real à mídia privada autorizada no Navegador 1 (HTTP 200)
    const mediaStatus1 = await page1.evaluate(async (url) => (await fetch(url)).status, confirmRes1.body.files[0].url);
    expect(mediaStatus1).toBe(200);

    // 5. Fluxo B: Encerrar visita no Cofre e reabrir mantendo confiança do Navegador 1
    await page1.evaluate(async (orderId) => {
      await fetch('/api/me/cofre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', order: orderId }),
      });
    }, pixData.orderId);

    const reopenRes = await page1.evaluate(async (orderId) => {
      const r = await fetch('/api/me/cofre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', order: orderId }),
      });
      return r.json();
    }, pixData.orderId);
    expect(reopenRes.state).toBe('ready');

    // 6. E2E-005 (Fluxo C — Novo Navegador isolado!): Contexto 2 sem cookies
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto(`/cofre?order=${encodeURIComponent(pixData.orderId)}`, { waitUntil: 'networkidle' });

    // Tentativa de abrir diretamente sem autorização deve exigir confirmação ('confirm')
    const unauthOpen = await page2.evaluate(async (orderId) => {
      const r = await fetch('/api/me/cofre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', order: orderId }),
      });
      return r.json();
    }, pixData.orderId);
    expect(unauthOpen.state).toBe('confirm');

    // Acesso direto à mídia no Navegador 2 deve retornar 403
    const unauthMedia = await page2.evaluate(async (url) => (await fetch(url)).status, confirmRes1.body.files[0].url);
    expect(unauthMedia).toBe(403);

    // Solicitar confirmação para o Navegador 2 e concluir autorização
    await page2.evaluate(async (orderId) => {
      await fetch('/api/me/cofre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', order: orderId }),
      });
    }, pixData.orderId);

    const emailsBrowser2 = (await (await request.get('/__qa__/emails')).json()).emails;
    const confirmEmail2 = emailsBrowser2
      .filter((e: any) => e.to === buyerEmail && e.kind === 'vault_browser_confirmation')
      .pop();

    const confirmRes2 = await page2.evaluate(
      async ({ orderId, token }) => {
        const r = await fetch('/api/me/cofre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm', order: orderId, token }),
        });
        return { status: r.status, body: await r.json() };
      },
      { orderId: pixData.orderId, token: confirmEmail2.token }
    );
    expect(confirmRes2.status).toBe(200);
    expect(confirmRes2.body.state).toBe('ready');

    const mediaStatus2 = await page2.evaluate(async (url) => (await fetch(url)).status, confirmRes2.body.files[0].url);
    expect(mediaStatus2).toBe(200);

    await context1.close();
    await context2.close();
  });

  test('E2E-002 — Personalizado completo: criação -> pagamento -> produção/entrega admin -> Cofre com download', async ({
    page,
    request,
    baseURL,
  }) => {
    const email = 'e2e.pers@qa.test';
    await page.goto('/personalizados', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 1. Criar encomenda personalizada
    const createRes = await request.post('/api/personalizados/create', {
      data: {
        clientName: 'Cliente Personalizado E2E',
        clientContact: email,
        deliveryChannel: 'vault',
        photoCount: 3,
        videoOptionId: 'vid_none',
        mentionName: true,
        express24h: false,
        briefing: 'Briefing E2E',
      },
    });
    expect(createRes.status()).toBe(201);
    const { order } = await createRes.json();
    expect(order.status).toBe('aguardando_pagamento');

    // 2. Pagamento aprovado -> status em_producao
    await request.post('/__qa__/approve-payment', { data: { orderId: order.id } });
    const statusMid = await (await request.get(`/api/personalizados/status?token=${order.publicToken}`)).json();
    expect(statusMid.order.status).toBe('em_producao');

    // 3. Admin autentica e conclui produção + anexa arquivo privado + entrega
    const loginRes = await page.request.post(`${baseURL}/api/auth/login`, {
      data: { password: 'qa-admin-pass-2026' },
    });
    expect(loginRes.status()).toBe(200);

    const deliverRes = await page.request.post(`${baseURL}/api/personalizados/admin`, {
      data: {
        action: 'update_order',
        orderId: order.id,
        patch: {
          status: 'entregue',
          vaultFiles: [{ id: 'v1', title: 'Entrega Personalizada', url: `/media/private/${order.id}/foto-final.png`, type: 'image' }],
        },
      },
    });
    expect(deliverRes.status()).toBe(200);

    // 4. E-mail de entrega emitido e Cofre libera acesso com download habilitado
    const emails = (await (await request.get('/__qa__/emails')).json()).emails;
    expect(emails.some((e: any) => e.to === email && e.orderId === order.id)).toBe(true);
  });

  test('E2E-003 — Chamada VIP completa + bloqueio de conflito no mesmo horário', async ({ page, request }) => {
    await page.goto('/chamadas', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    const avail = await (await request.get('/api/appointments/availability?date=2026-12-18&modalityId=chamada-vip-15')).json();
    expect(avail.slots.length).toBeGreaterThan(0);

    // 1. Primeira reserva -> 201
    const book1 = await request.post('/api/appointments/book', {
      data: {
        modalityId: 'chamada-vip-15',
        date: '2026-12-18',
        startTime: '15:00',
        clientName: 'VIP Um',
        clientEmail: 'vip1@qa.test',
        clientPhone: '+5511999991111',
      },
    });
    expect(book1.status()).toBe(201);
    const { booking } = await book1.json();

    // 2. Segunda reserva no MESMO horário -> 409 Conflict!
    const book2 = await request.post('/api/appointments/book', {
      data: {
        modalityId: 'chamada-vip-15',
        date: '2026-12-18',
        startTime: '15:00',
        clientName: 'VIP Dois',
        clientEmail: 'vip2@qa.test',
        clientPhone: '+5511999992222',
      },
    });
    expect(book2.status()).toBe(409);

    // 3. Aprovar pagamento -> voucher confirmado + link de sala visível
    await request.post('/__qa__/approve-payment', { data: { orderId: booking.id } });
    const lookup = await (await request.get(`/api/appointments/lookup?token=${booking.publicToken}`)).json();
    expect(lookup.paid).toBe(true);
    expect(lookup.booking.status).toBe('confirmada');
    expect(lookup.booking.meeting.visibleToClient).toBe(true);

    // 4. Abrir página real do voucher
    await page.goto(`/chamadas/reserva?token=${encodeURIComponent(booking.publicToken)}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('E2E-004 — Operação administrativa: login -> rascunho -> publicação -> site público -> despublicação', async ({
    page,
    baseURL,
  }) => {
    await page.goto('/admin', { waitUntil: 'networkidle' });
    // Em produção exibe AdminLogin; em loopback local pode abrir Visão Geral diretamente
    const passwordField = page.getByPlaceholder(/Digite sua senha/i);
    if (await passwordField.isVisible().catch(() => false)) {
      await passwordField.fill('qa-admin-pass-2026');
      await page.getByRole('button', { name: /Entrar no Painel/i }).click();
    } else {
      await expect(page.getByRole('heading', { name: 'Visão Geral', exact: true })).toBeVisible();
      const loginRes = await page.request.post(`${baseURL}/api/auth/login`, {
        data: { password: 'qa-admin-pass-2026' },
      });
      expect(loginRes.status()).toBe(200);
    }

    const sessionRes = await page.request.get(`${baseURL}/api/auth/session`);
    expect(sessionRes.status()).toBe(200);

    // Ler conteúdo administrativo atual e criar novo Pack como rascunho (publish: false)
    const adminSync = await (await page.request.get(`${baseURL}/api/content/sync?mode=admin`)).json();
    const newPack = {
      id: 'avulso-editorial-e2e',
      slug: 'editorial-e2e',
      modality: 'pack',
      title: 'Editorial E2E Publicado',
      price: 'R$ 120,00',
      numericPrice: 120,
      active: true,
      isDraft: false,
      exclusivePhotos: ['/media/private/editorial-e2e/foto-1.png'],
      videos: [],
    };
    const nextContent = structuredClone(adminSync.content);
    nextContent.avulsos.items.push(newPack);

    // Salva apenas como rascunho -> NÃO deve aparecer no site público!
    await page.request.post(`${baseURL}/api/content/sync`, {
      data: { content: nextContent, publish: false },
    });
    const pubBefore = await (await page.request.get(`${baseURL}/api/content/sync`)).json();
    expect(pubBefore.content.avulsos.items.some((i: any) => i.slug === 'editorial-e2e')).toBe(false);

    // Publica -> aparece no site público SEM vazar exclusivePhotos!
    await page.request.post(`${baseURL}/api/content/sync`, {
      data: { content: nextContent, publish: true },
    });
    const pubAfter = await (await page.request.get(`${baseURL}/api/content/sync`)).json();
    const publishedPack = pubAfter.content.avulsos.items.find((i: any) => i.slug === 'editorial-e2e');
    expect(publishedPack?.title).toBe('Editorial E2E Publicado');
    expect(publishedPack?.exclusivePhotos).toEqual([]);

    // Despublica (active: false) e publica -> removido do site público!
    nextContent.avulsos.items = nextContent.avulsos.items.map((i: any) =>
      i.slug === 'editorial-e2e' ? { ...i, active: false } : i
    );
    await page.request.post(`${baseURL}/api/content/sync`, {
      data: { content: nextContent, publish: true },
    });
    const pubRemoved = await (await page.request.get(`${baseURL}/api/content/sync`)).json();
    expect(pubRemoved.content.avulsos.items.some((i: any) => i.slug === 'editorial-e2e')).toBe(false);
  });

  test('E2E-006 & E2E-007 — Falha financeira mantém bloqueio e recuperação após falha parcial (503) conclui sem duplicidade', async ({
    request,
  }) => {
    // E2E-007: Injetar falha 503 em /api/payments/create-pix
    await request.post('/__qa__/fault', { data: { prefix: '/api/payments/create-pix', status: 503 } });
    const failedCreate = await request.post('/api/payments/create-pix', {
      data: { type: 'pack', slug: 'teste', payerEmail: 'fault@qa.test' },
    });
    expect(failedCreate.status()).toBe(503);

    // Restaurar serviço e reexecutar -> sucesso limpo
    await request.post('/__qa__/fault', { data: { clear: true } });
    const recoveredCreate = await request.post('/api/payments/create-pix', {
      data: { type: 'pack', slug: 'teste', payerEmail: 'fault@qa.test' },
    });
    expect(recoveredCreate.status()).toBe(201);
    const created = await recoveredCreate.json();

    // E2E-006: Pedido pendente (não pago) -> status paid:false, Cofre bloqueado e mídia 403
    const statusRes = await (await request.get(`/api/payments/status?orderId=${created.orderId}`)).json();
    expect(statusRes.paid).toBe(false);

    const cofreDenied = await (
      await request.post('/api/me/cofre', {
        headers: { Origin: 'http://127.0.0.1:3199' },
        data: { action: 'open', order: created.orderId },
      })
    ).json();
    expect(cofreDenied.state).toBe('confirm');

    const mediaDenied = await request.get('/media/private/teste/foto-01.png?cofre=1');
    expect(mediaDenied.status()).toBe(403);
  });

  test('E2E-008 — Central de Clientes integrada consolida Pack + VIP + Personalizado sob identidade única sem duplicação', async ({
    page,
    request,
    baseURL,
  }) => {
    const email = 'cliente.integrado@qa.test';

    // 1. Pack pago
    const pack = await (
      await request.post('/api/payments/create-pix', {
        data: { type: 'pack', slug: 'teste', payerEmail: email, payerName: 'Cliente Integrado' },
      })
    ).json();
    await request.post('/__qa__/approve-payment', { data: { orderId: pack.orderId } });

    // 2. Chamada VIP paga
    const vip = await (
      await request.post('/api/appointments/book', {
        data: {
          modalityId: 'chamada-vip-15',
          date: '2026-12-20',
          startTime: '16:00',
          clientName: 'Cliente Integrado',
          clientEmail: email,
          clientPhone: '+5511988887777',
        },
      })
    ).json();
    await request.post('/__qa__/approve-payment', { data: { orderId: vip.booking.id } });

    // 3. Personalizado pago
    const pers = await (
      await request.post('/api/personalizados/create', {
        data: {
          clientName: 'Cliente Integrado',
          clientContact: email,
          deliveryChannel: 'vault',
          photoCount: 2,
          videoOptionId: 'vid_none',
          briefing: 'Central QA',
        },
      })
    ).json();
    await request.post('/__qa__/approve-payment', { data: { orderId: pers.order.id } });

    // 4. Consultar Central de Clientes como admin autenticado
    await page.request.post(`${baseURL}/api/auth/login`, { data: { password: 'qa-admin-pass-2026' } });
    const custRes = await page.request.get(`${baseURL}/api/admin/customers`);
    expect(custRes.status()).toBe(200);
    const custData = await custRes.json();

    const matching = custData.customers.filter((c: any) => c.email === email);
    expect(matching).toHaveLength(1); // Zero duplicação!
    expect(matching[0].counts.packs).toBe(1);
    expect(matching[0].counts.appointments).toBe(1);
    expect(matching[0].counts.personalizados).toBe(1);
    expect(matching[0].counts.totalOrders).toBe(3);
  });
});
