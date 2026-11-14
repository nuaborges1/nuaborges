/**
 * Operações genéricas de edição do conteúdo do site (SiteContent) pela NuaIA.
 * Nenhum campo é fixo aqui: tudo é validado contra a ESTRUTURA REAL do rascunho atual.
 * Usado pelo servidor (validação antes de responder) e pelo painel (aplicação autoritativa).
 *
 * op = { action: 'set' | 'append' | 'remove', path: string, value?: any }
 * path: "about.paragraph1", "avulsos.items[0].title", "avulsos.items[id=pack_1].price"
 */

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Campos de uma mídia da biblioteca que o servidor realmente precisa para
 * validar, resolver e anexar arquivos. `variants`, hashes e métricas de
 * compressão são pesados e não influenciam nenhuma decisão da IA.
 */
const LIBRARY_FIELDS = [
  'id',
  'name',
  'url',
  'objectKey',
  'uploadedAt',
  'isVideo',
  'duration',
  'durationSeconds',
  'posterUrl',
  'favorite',
  'albumIds',
  'usedIn',
  'sizeBytes',
  'width',
  'height',
  'provider',
];

function isPlain(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Reduz uma mídia da biblioteca ao essencial, sem variantes nem data URLs. */
export function slimMediaItem(item) {
  if (!isPlain(item)) return item;
  const out = {};
  for (const key of LIBRARY_FIELDS) {
    if (item[key] !== undefined) out[key] = item[key];
  }
  if (!out.id && item.url) out.id = item.url;
  return out;
}

export function slimLibrary(library) {
  if (!Array.isArray(library)) return [];
  return library.map(slimMediaItem);
}

/**
 * Prepara o rascunho para trafegar até o servidor.
 *
 * DIFERENÇA CRÍTICA em relação à versão anterior: a biblioteca NÃO é mais
 * removida. Ela é apenas enxugada (sem `variants`/data URLs), porque é a
 * única fonte de verdade para validar quais mídias podem ser anexadas.
 *
 * Remover a biblioteca aqui era a causa raiz de "Selecione uma mídia
 * existente na biblioteca" e do apagamento da biblioteca local a cada ação.
 */
export function draftForAi(content) {
  const walk = (v) => {
    if (typeof v === 'string') return v.startsWith('data:') ? '[mídia embutida]' : v;
    if (Array.isArray(v)) return v.map(walk);
    if (isPlain(v)) {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] = k === 'library' ? slimLibrary(val) : walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(content);
}

/** @deprecated Use `draftForAi`. Mantido para compatibilidade de imports. */
export const compactForAi = draftForAi;

/**
 * Reconstitui uma biblioteca enxuta usando os itens completos locais.
 *
 * O servidor só devolve os campos que a IA precisa (`slimMediaItem`). Ao gravar
 * o rascunho de volta no painel, os campos pesados que já existiam localmente
 * (`variants`, métricas de compressão etc.) precisam sobreviver.
 */
export function rehydrateLibrary(slim, full) {
  if (!Array.isArray(slim)) return slim;
  const complete = Array.isArray(full) ? full : [];
  return slim.map((item) => {
    if (!isPlain(item)) return item;
    const match =
      (item.id && complete.find((m) => m.id && String(m.id) === String(item.id))) ||
      (item.url && complete.find((m) => m.url === item.url)) ||
      (item.objectKey && complete.find((m) => m.objectKey === item.objectKey)) ||
      null;
    return match ? { ...match, ...item } : item;
  });
}

/** Versão curta para o prompt: textos longos truncados, listas limitadas. */
export function snapshotForPrompt(content, { maxString = 220, maxItems = 15 } = {}) {
  const walk = (v) => {
    if (typeof v === 'string') return v.length > maxString ? `${v.slice(0, maxString)}…` : v;
    if (Array.isArray(v)) return v.slice(0, maxItems).map(walk);
    if (isPlain(v)) return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, walk(val)]));
    return v;
  };
  return walk(content);
}

/** "a.b[0].c" / "a.b[id=x].c" / "a.b[-1].c" -> [{key:'a'},{key:'b'},{index:0},{id:'x'}...] */
export function parsePath(path) {
  if (typeof path !== 'string' || !path.trim()) return null;
  const segs = [];
  for (const part of path.trim().split('.')) {
    const m = part.match(/^([^\[\]]*)((?:\[[^\]]+\])*)$/);
    if (!m) return null;
    if (m[1]) segs.push({ key: m[1] });
    for (const g of m[2].matchAll(/\[([^\]]+)\]/g)) {
      const raw = g[1];
      if (/^-?\d+$/.test(raw)) segs.push({ index: Number(raw) });
      else if (['last', 'ultimo', 'último'].includes(raw.toLowerCase())) segs.push({ index: -1 });
      else if (raw.startsWith('id=')) segs.push({ id: raw.slice(3) });
      else return null;
    }
  }
  if (segs.length === 0) return null;
  if (segs.some((s) => s.key && BLOCKED_KEYS.has(s.key))) return null;
  return segs;
}

function step(node, seg) {
  if (seg.key !== undefined) {
    if (!isPlain(node) || !Object.prototype.hasOwnProperty.call(node, seg.key)) return { ok: false };
    return { ok: true, value: node[seg.key], key: seg.key };
  }
  if (!Array.isArray(node)) return { ok: false };
  if (seg.index !== undefined) {
    const realIdx = seg.index < 0 ? node.length + seg.index : seg.index;
    return realIdx >= 0 && realIdx < node.length ? { ok: true, value: node[realIdx], key: realIdx } : { ok: false };
  }
  const idx = node.findIndex((x) => isPlain(x) && String(x.id) === seg.id);
  return idx >= 0 ? { ok: true, value: node[idx], key: idx } : { ok: false };
}

function resolve(root, segs) {
  let parent = null;
  let key = null;
  let value = root;
  for (const seg of segs) {
    const r = step(value, seg);
    if (!r.ok) return { ok: false };
    parent = value;
    key = r.key;
    value = r.value;
  }
  return { ok: true, parent, key, value };
}

function coerce(before, value) {
  if (typeof before === 'number' && typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  if (typeof before === 'boolean' && typeof value === 'string' && (value === 'true' || value === 'false')) return value === 'true';
  return value;
}

function sameKind(before, after) {
  if (before === null || before === undefined) return true;
  if (Array.isArray(before)) return Array.isArray(after);
  if (isPlain(before)) return isPlain(after);
  return typeof before === typeof after;
}

/**
 * Valida e aplica ops de forma atômica sobre uma cópia. Se qualquer op falhar, nada é aplicado.
 * @returns {{ok:true, content:any, changes:Array}|{ok:false, errors:string[]}}
 */
export function applyContentOps(content, ops) {
  if (!Array.isArray(ops) || ops.length === 0) return { ok: false, errors: ['Nenhuma operação informada.'] };
  if (ops.length > 40) return { ok: false, errors: ['Operações demais de uma vez (máx. 40).'] };
  const draft = JSON.parse(JSON.stringify(content));
  const errors = [];
  const changes = [];

  for (const op of ops) {
    const label = `${op?.action || '?'} ${op?.path || '?'}`;
    const segs = parsePath(op?.path);
    if (!segs) {
      errors.push(`Caminho inválido ou protegido: "${op?.path}".`);
      continue;
    }
    const target = resolve(draft, segs);
    if (!target.ok) {
      errors.push(`Caminho inexistente no painel atual: "${op.path}". Nada foi alterado.`);
      continue;
    }

    if (op.action === 'set') {
      if (op.value === undefined) { errors.push(`${label}: valor ausente.`); continue; }
      const value = coerce(target.value, op.value);
      if (!sameKind(target.value, value)) {
        errors.push(`${label}: tipo incompatível (esperado ${Array.isArray(target.value) ? 'lista' : typeof target.value}).`);
        continue;
      }
      if (target.parent === null) { errors.push(`${label}: não é possível substituir a raiz.`); continue; }
      target.parent[target.key] = value;
      changes.push({ action: 'set', path: op.path, before: target.value, after: value });
    } else if (op.action === 'append') {
      const arr = target.value;
      if (!Array.isArray(arr)) { errors.push(`${label}: o destino não é uma lista.`); continue; }
      let item = op.value;
      if (item === undefined) { errors.push(`${label}: valor ausente.`); continue; }
      const template = arr.find(isPlain);
      if (isPlain(item) && template) {
        const unknown = Object.keys(item).filter((k) => !Object.prototype.hasOwnProperty.call(template, k));
        if (unknown.length) { errors.push(`${label}: campos que não existem nos itens desta lista: ${unknown.join(', ')}.`); continue; }
        if ('id' in template && item.id === undefined) item = { ...item, id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
      }
      arr.unshift(item);
      changes.push({ action: 'append', path: op.path, before: null, after: item });
    } else if (op.action === 'remove') {
      if (!target.parent || !Array.isArray(target.parent)) { errors.push(`${label}: só é possível remover itens de listas.`); continue; }
      target.parent.splice(target.key, 1);
      changes.push({ action: 'remove', path: op.path, before: target.value, after: null });
    } else {
      errors.push(`Ação desconhecida: "${op?.action}".`);
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, content: draft, changes };
}
