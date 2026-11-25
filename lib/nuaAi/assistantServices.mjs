import fs from 'node:fs';
import path from 'node:path';

// Cloudflare Workers fornece um shim parcial de `process`; só o Node real pode
// usar fs/path para o fallback local.
const IS_CLOUDFLARE_RUNTIME =
  typeof navigator !== 'undefined' && /Cloudflare-Workers/i.test(navigator.userAgent || '');
const IS_NODE_RUNTIME =
  !IS_CLOUDFLARE_RUNTIME &&
  typeof process !== 'undefined' &&
  typeof process.versions?.node === 'string';

function arrayBufferToBase64(buffer) {
  if (typeof Buffer !== 'undefined') return Buffer.from(buffer).toString('base64');
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const MAX_VISION_BYTES = 6 * 1024 * 1024;

/**
 * Baixa uma imagem do acervo para a Nay enxergar de verdade (visão multimodal).
 * Aceita apenas https:// ou caminhos internos /media/..., só imagens e até 6 MB.
 */
function createMediaFetcher(fetcher, base, callerHeaders = {}) {
  return async (rawUrl) => {
    const value = String(rawUrl || '');
    let target;
    if (/^\/media\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) {
      if (!base) return null;
      target = `${String(base).replace(/\/$/, '')}${value}`;
    } else {
      try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:') return null;
        target = parsed.toString();
      } catch {
        return null;
      }
    }
    try {
      const isInternal = base && target.startsWith(String(base));
      const res = await fetcher(target, {
        headers: isInternal ? { ...callerHeaders } : {},
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) return null;
      const mimeType = String(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!/^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/.test(mimeType)) return null;
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > MAX_VISION_BYTES) return null;
      const buffer = await res.arrayBuffer();
      if (buffer.byteLength > MAX_VISION_BYTES) return null;
      return { mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType, data: arrayBufferToBase64(buffer) };
    } catch {
      return null;
    }
  };
}

function createLocalFileServices({ origin, callerHeaders = {} } = {}) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const getFilePath = (name) => {
    if (name === 'published_content' || name === 'private_admin_content') {
      return path.join(dataDir, 'content.json');
    }
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(dataDir, `kv_${safeName}.json`);
  };

  const loadJson = (file, fallback = null) => {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
    } catch {}
    return fallback;
  };

  const saveJson = (file, data) => {
    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch {
      return false;
    }
  };

  const dbFile = (table) => path.join(dataDir, `db_${String(table).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  const loadTable = (table) => {
    const data = loadJson(dbFile(table), []);
    return Array.isArray(data) ? data : [];
  };
  const saveTable = (table, rows) => saveJson(dbFile(table), rows);

  const localDb = {
    select: async (table, params = {}) => {
      let rows = loadTable(table);
      if (params.eq) {
        rows = rows.filter((row) => Object.entries(params.eq).every(([k, v]) => String(row[k]) === String(v)));
      }
      if (params.order) {
        const [field, dir] = String(params.order).split('.');
        rows = [...rows].sort((a, b) => {
          const cmp = String(a[field] ?? '').localeCompare(String(b[field] ?? ''));
          return dir === 'desc' ? -cmp : cmp;
        });
      }
      return params.limit ? rows.slice(0, Number(params.limit)) : rows;
    },
    upsert: async (table, row) => {
      const rows = loadTable(table);
      const idx = rows.findIndex((r) => String(r.id) === String(row.id));
      if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
      else rows.push(row);
      saveTable(table, rows);
      return [row];
    },
    update: async (table, match, patch) => {
      const rows = loadTable(table).map((row) =>
        Object.entries(match).every(([k, v]) => String(row[k]) === String(v)) ? { ...row, ...patch } : row
      );
      saveTable(table, rows);
      return rows.filter((row) => Object.entries(match).every(([k, v]) => String(row[k]) === String(v)));
    },
    remove: async (table, match) => {
      const rows = loadTable(table).filter(
        (row) => !Object.entries(match).every(([k, v]) => String(row[k]) === String(v))
      );
      saveTable(table, rows);
      return true;
    },
  };

  return {
    read: async (name) => {
      const file = getFilePath(name);
      return loadJson(file, null);
    },

    write: async (name, value) => {
      const file = getFilePath(name);
      saveJson(file, value);
    },

    delete: async (name) => {
      const file = getFilePath(name);
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
        return true;
      } catch {
        return false;
      }
    },

    db: localDb,

    fetchMedia: createMediaFetcher(fetch, origin || process.env.NUA_API_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3105}`),

    api: async (apiPath, options = {}) => {
      const base = origin || process.env.NUA_API_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3105}`;
      const res = await fetch(`${base}${apiPath}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...callerHeaders,
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(20000),
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      return { ok: res.ok, status: res.status, data };
    },

    listConversations: async () => {
      try {
        const files = fs.readdirSync(dataDir).filter((f) => f.startsWith('kv_nua_ai_conversation_'));
        const list = [];
        for (const file of files) {
          const content = loadJson(path.join(dataDir, file), null);
          if (content && content.id) {
            list.push({
              id: content.id,
              title: content.title || 'Conversa sem título',
              summary: content.summary || content.turns?.at(-1)?.content?.slice(0, 100) || '',
              createdAt: content.createdAt,
              updatedAt: content.updatedAt,
              messageCount: content.turns?.length || 0,
            });
          }
        }
        return list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      } catch {
        return [];
      }
    },

    getSystemOverview: async () => {
      const content = loadJson(path.join(dataDir, 'content.json'), {});
      const orders = loadJson(path.join(dataDir, 'local_orders.json'), {});
      const personalizados = loadJson(path.join(dataDir, 'local_personalizados.json'), {});
      const appointments = loadJson(path.join(dataDir, 'local_appointments.json'), {});
      const memory = loadJson(path.join(dataDir, 'kv_nua_ai_memory.json'), null);

      return {
        // Nunca inventar situação financeira: sem dado real, a Nay deve consultar get_finance_summary.
        finance: null,
        orders: Object.values(orders).slice(0, 8).map((o) => ({
          id: o.id,
          client: o.customerName || o.customerEmail || 'Cliente',
          amount: `R$ ${Number(o.totalAmount || o.amount || 0).toFixed(2).replace('.', ',')}`,
          status: o.status === 'approved' ? 'Aprovado' : 'Pendente',
          createdAt: o.createdAt,
        })),
        personalizados: Object.values(personalizados).slice(0, 8).map((p) => ({
          id: p.id,
          client: p.clientName || 'Cliente',
          price: `R$ ${Number(p.totalPrice || 0).toFixed(2).replace('.', ',')}`,
          status: p.status,
          channel: p.deliveryChannel,
          createdAt: p.createdAt,
        })),
        appointments: Object.values(appointments).slice(0, 8).map((a) => ({
          id: a.id,
          client: a.clientName || 'Cliente',
          status: a.status,
          dateTime: a.dateTime || (a.date ? `${a.date} ${a.startTime || ''}`.trim() : null),
          meetingUrl: a.meeting?.url || a.meetingUrl || null,
        })),
        requests: [],
        memory,
      };
    },
  };
}

/** Constrói a query string do PostgREST sem permitir SQL nem colunas arbitrárias. */
function buildQueryString(params = {}) {
  const qs = new URLSearchParams();
  if (params.select) qs.set('select', params.select);
  if (params.order) qs.set('order', params.order);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.eq) {
    for (const [key, value] of Object.entries(params.eq)) qs.append(key, `eq.${value}`);
  }
  return qs.toString();
}

/** Supabase REST adapter shared by the local server and Cloudflare. */
export function createAssistantServices(env, fetcher = fetch, options = {}) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
  const origin = options.origin || env.NUA_API_ORIGIN || null;
  const callerHeaders = options.callerHeaders || {};
  if (!url || !key) {
    if (IS_NODE_RUNTIME) {
      return {
        ...createLocalFileServices({ origin, callerHeaders }),
        generate: createGenerateFunction(env, fetcher),
      };
    }
    throw new Error('A conexão administrativa com o Supabase não está configurada.');
  }

  const request = async (path, options = {}) => {
    const res = await fetcher(`${url.replace(/\/$/, '')}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error('Não consegui acessar o Supabase. Nenhuma confirmação de gravação foi recebida.');
    return res.status === 204 ? null : res.json();
  };

  const localFileServices = IS_NODE_RUNTIME ? createLocalFileServices({ origin, callerHeaders }) : null;

  return {
    read: async (name) => {
      try {
        const rows = await request(`site_content?key=eq.${encodeURIComponent(name)}&select=content`);
        return rows[0]?.content || (localFileServices ? await localFileServices.read(name) : null);
      } catch (err) {
        if (localFileServices) return localFileServices.read(name);
        throw err;
      }
    },

    write: async (name, value) => {
      try {
        await request('site_content?on_conflict=key', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            key: name,
            content: value,
            version: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'Nay',
          }),
        });
      } catch (err) {
        if (localFileServices) return localFileServices.write(name, value);
        throw err;
      }
    },

    delete: async (name) => {
      try {
        await request(`site_content?key=eq.${encodeURIComponent(name)}`, { method: 'DELETE' });
        return true;
      } catch {
        if (localFileServices) return localFileServices.delete(name);
        return false;
      }
    },

    /**
     * Acesso relacional controlado (tabelas reais do Supabase).
     * Nunca recebe SQL: apenas tabela + filtros de igualdade + ordem + limite.
     */
    db: {
      select: async (table, params = {}) => {
        try {
          return await request(`${table}?${buildQueryString(params)}`);
        } catch (err) {
          if (localFileServices?.db) return localFileServices.db.select(table, params);
          throw err;
        }
      },
      upsert: async (table, row, conflict = 'id') => {
        try {
          return await request(`${table}?on_conflict=${encodeURIComponent(conflict)}`, {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify(row),
          });
        } catch (err) {
          if (localFileServices?.db) return localFileServices.db.upsert(table, row);
          throw err;
        }
      },
      update: async (table, match, patch) => {
        try {
          return await request(`${table}?${buildQueryString({ eq: match })}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(patch),
          });
        } catch (err) {
          if (localFileServices?.db) return localFileServices.db.update(table, match, patch);
          throw err;
        }
      },
      remove: async (table, match) => {
        try {
          return await request(`${table}?${buildQueryString({ eq: match })}`, { method: 'DELETE' });
        } catch (err) {
          if (localFileServices?.db) return localFileServices.db.remove(table, match);
          throw err;
        }
      },
    },

    /**
     * Chamada interna a um endpoint real do painel. Reutiliza validações,
     * regras de negócio e auditoria já implementadas nas rotas.
     */
    api: async (apiPath, options = {}) => {
      const base = origin || env.NUA_API_ORIGIN || 'http://127.0.0.1:3105';
      const hasCallerAuth = Boolean(callerHeaders.Authorization || callerHeaders.Cookie);
      const dedicatedSecret =
        env.ADMIN_API_SECRET &&
        env.ADMIN_API_SECRET.length >= 24 &&
        env.ADMIN_API_SECRET !== env.ADMIN_PASSWORD
          ? env.ADMIN_API_SECRET
          : '';
      const authHeaders = hasCallerAuth
        ? callerHeaders
        : dedicatedSecret
          ? { 'X-Master-Key': dedicatedSecret }
          : {};
      const res = await fetcher(`${String(base).replace(/\/$/, '')}${apiPath}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(25000),
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      return { ok: res.ok, status: res.status, data };
    },

    listConversations: async () => {
      try {
        const rows = await request('site_content?key=like.nua_ai_conversation%3A*&select=content&order=updated_at.desc&limit=50');
        return rows.map(({ content: c }) => ({
          id: c.id,
          title: c.title,
          summary: c.summary || c.turns?.at(-1)?.content?.slice(0, 100) || '',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          messageCount: c.turns?.length || 0,
        }));
      } catch (err) {
        if (localFileServices) return localFileServices.listConversations();
        return [];
      }
    },

    getSystemOverview: async () => {
      try {
        const systemOverview = {
          finance: null,
          orders: [],
          personalizados: [],
          appointments: [],
          requests: [],
          memory: null,
        };

        // 1. Financeiro (Suporta v2 e fallback)
        let financeRows = await request('site_content?key=eq.nua_finance_installments_v2&select=content').catch(() => []);
        if (!financeRows[0]?.content) {
          financeRows = await request('site_content?key=eq.nua_finance_installments&select=content').catch(() => []);
        }

        const installments = Array.isArray(financeRows[0]?.content) ? financeRows[0].content : [];
        if (installments.length > 0) {
          const paidInstallments = installments.filter((i) => i.status === 'paid');
          const totalPaid = paidInstallments.reduce((sum, i) => sum + (Number(i.paidAmount) || Number(i.amount) || 0), 0);
          const totalContract = installments.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) || 2000;
          const totalPending = totalContract - totalPaid;
          const nextInstallment = installments.find((i) => i.status === 'pending' || i.status === 'in_process');

          systemOverview.finance = {
            totalContract: `R$ ${totalContract.toFixed(2).replace('.', ',')}`,
            totalPaid: `R$ ${totalPaid.toFixed(2).replace('.', ',')}`,
            totalPending: `R$ ${totalPending.toFixed(2).replace('.', ',')}`,
            paidCount: `${paidInstallments.length} de ${installments.length} parcelas`,
            nextDueDate: nextInstallment
              ? `${nextInstallment.label} (${nextInstallment.referenceMonth || ''}) - Vencimento: ${nextInstallment.dueDateFormatted || nextInstallment.dueDate}`
              : 'Todas as parcelas estão quitadas!',
            installments: installments.map((i) => ({
              number: i.number,
              label: i.label,
              referenceMonth: i.referenceMonth,
              amount: `R$ ${Number(i.amount).toFixed(2).replace('.', ',')}`,
              status: i.status === 'paid' ? 'Quitada' : i.status === 'in_process' ? 'Em processamento' : 'Pendente',
              dueDate: i.dueDateFormatted || i.dueDate,
              paidAt: i.paidAt || null,
            })),
          };
        }

        // 2. Vendas de packs (sem espelhos de Chamadas/Personalizados e sem PIX não pago)
        const ordersRows = await request('orders?select=id,status,amount,customer_email,customer_name,created_at,pack_id&order=created_at.desc&limit=40').catch(() => []);
        if (Array.isArray(ordersRows)) {
          const PAID = new Set(['paid', 'approved', 'pago', 'pago_liberado', 'liberado']);
          systemOverview.orders = ordersRows
            .filter((o) => {
              const oid = String(o.id || '');
              const pid = String(o.pack_id || '');
              return !(/^(app_|apt_|book_|ped_|pers_)/.test(oid) || pid.startsWith('chamada-') || pid.startsWith('personalizado'));
            })
            .filter((o) => PAID.has(String(o.status || '')))
            .slice(0, 8)
            .map((o) => ({
              id: o.id,
              client: o.customer_name || o.customer_email || 'Cliente',
              pack: o.pack_id || 'Pack',
              amount: `R$ ${Number(o.amount || 0).toFixed(2).replace('.', ',')}`,
              status: 'Pago',
              createdAt: o.created_at,
            }));
        }

        // 3. Pedidos Personalizados
        const persRows = await request('personalizados_orders?select=id,status,total_price,client_name,delivery_channel,created_at&order=created_at.desc&limit=8').catch(() => []);
        if (Array.isArray(persRows)) {
          systemOverview.personalizados = persRows.map((p) => ({
            id: p.id,
            client: p.client_name,
            price: `R$ ${Number(p.total_price || 0).toFixed(2).replace('.', ',')}`,
            status: p.status,
            channel: p.delivery_channel,
            createdAt: p.created_at,
          }));
        }

        // 4. Próximas Chamadas VIP (a partir de agora, em ordem cronológica)
        const nowIso = new Date().toISOString();
        const apptRows = await request(`appointments?select=id,status,client_name,modality_id,date_time,call_link&date_time=gte.${encodeURIComponent(nowIso)}&order=date_time.asc&limit=10`).catch(() => []);
        if (Array.isArray(apptRows)) {
          systemOverview.appointments = apptRows.map((a) => ({
            id: a.id,
            client: a.client_name,
            status: a.status,
            dateTime: a.date_time,
            meetingUrl: a.call_link || null,
          }));
        }

        // 5. Central de Solicitações (Philippe)
        const reqIndexRows = await request('site_content?key=eq.requests%3Aindex&select=content').catch(() => []);
        const reqIds = Array.isArray(reqIndexRows[0]?.content) ? reqIndexRows[0].content.slice(0, 5) : [];
        if (reqIds.length > 0) {
          const reqs = [];
          for (const reqId of reqIds) {
            const reqData = await request(`site_content?key=eq.request%3A${encodeURIComponent(reqId)}&select=content`).catch(() => []);
            if (reqData[0]?.content) {
              const r = reqData[0].content;
              reqs.push({
                id: r.id,
                title: r.title,
                status: r.status,
                priority: r.priority,
                createdAt: r.createdAt,
              });
            }
          }
          systemOverview.requests = reqs;
        }

        // 6. Memória Persistente Nua IA
        const memRows = await request('site_content?key=eq.nua_ai_memory&select=content').catch(() => []);
        if (memRows[0]?.content) {
          systemOverview.memory = memRows[0].content;
        }

        return systemOverview;
      } catch (err) {
        if (localFileServices) return localFileServices.getSystemOverview();
        return { finance: null, orders: [], personalizados: [], appointments: [], requests: [], memory: null };
      }
    },

    generate: createGenerateFunction(env, fetcher),
    fetchMedia: createMediaFetcher(fetcher, origin || env.NUA_API_ORIGIN || null, callerHeaders),
  };
}

function createGenerateFunction(env, fetcher = fetch) {
  return async ({ system, turns, message, tools, contents, temperature, preferredModel }) => {
    const apiKey = String(env.GEMINI_API_KEY || '').replace(/[\uFEFF\r\n\s"']/g, '').trim();
    if (!apiKey) {
      throw new Error('A chave do Gemini não está configurada no ambiente. Adicione GEMINI_API_KEY no arquivo .dev.vars ou .env.local.');
    }
    const geminiModel = env.GEMINI_MODEL ? String(env.GEMINI_MODEL).replace(/[\uFEFF\r\n\s"']/g, '').trim() : undefined;
    // Ordem: modelo pedido pelo orquestrador → modelo do ambiente → Flash (raciocínio
    // completo com ferramentas) → Flash Lite apenas como último recurso.
    const models = [
      ...new Set([
        preferredModel,
        geminiModel,
        'gemini-2.5-flash',
        'gemini-flash-latest',
        'gemini-2.5-flash-lite',
      ].filter(Boolean))
    ];

    // `contents` já vem pronto do orquestrador (inclui functionCall/functionResponse).
    // `turns` + `message` continuam suportados para compatibilidade.
    const finalContents = Array.isArray(contents)
      ? contents
      : [
          ...(turns || []).slice(-14).map((t) => ({
            role: t.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(t.content).slice(0, 6000) }],
          })),
          { role: 'user', parts: [{ text: String(message || '') }] },
        ];

    const failures = [];

    for (const model of models) {
      try {
        const payload = {
          systemInstruction: { parts: [{ text: system }] },
          contents: finalContents,
          generationConfig: { temperature: temperature ?? 0.4, maxOutputTokens: 8192 },
          safetySettings: [
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        };
        if (Array.isArray(tools) && tools.length > 0) {
          payload.tools = [{ functionDeclarations: tools }];
        }

        const res = await fetcher(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(30000),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const detail = errData?.error?.message || res.statusText;
          console.warn(`[NuaAiServices] Modelo ${model} retornou HTTP ${res.status}:`, detail);
          if ([400, 404, 503, 504, 429].includes(res.status)) {
            failures.push(`${model}: HTTP ${res.status} — ${String(detail).slice(0, 220)}`);
            continue;
          }
          throw new Error(`O serviço de IA recusou a solicitação (HTTP ${res.status}).`);
        }
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        // O Gemini exige que o `thoughtSignature` do functionCall seja devolvido
        // no turno seguinte. Sem ele a API responde 400 e o loop de ferramentas morre.
        const calls = parts
          .filter((p) => p.functionCall)
          .map((p) => ({
            name: p.functionCall.name,
            args: p.functionCall.args || {},
            id: p.functionCall.id || undefined,
            thoughtSignature: p.thoughtSignature || undefined,
          }));
        const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('\n').trim();

        if (!calls.length && !text) {
          failures.push(`${model}: resposta vazia (${candidate?.finishReason || 'sem motivo'})`);
          console.warn(`[NuaAiServices] Modelo ${model} retornou sem texto e sem functionCall. FinishReason: ${candidate?.finishReason}`);
          continue;
        }

        return { model, calls, call: calls[0], text };
      } catch (err) {
        failures.push(`${model}: ${err?.message || err}`);
        console.warn(`[NuaAiServices] Modelo ${model} falhou ou expirou:`, err?.message || err);
        continue;
      }
    }
    const last = failures[failures.length - 1];
    throw new Error(
      `Nenhum modelo do Gemini respondeu com sucesso.${last ? ` Último erro: ${last}` : ''}`
    );
  };
}
