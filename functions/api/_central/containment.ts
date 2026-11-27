import { getSupabaseClient } from '../_supabaseClient';
import type { CentralActor, CentralEnv, RoutePolicy } from './types';

const CONTAINMENT_KEY = 'system:containment:';
export const CONTAINMENT_PROTOCOLS = ['itachi', 'madara', 'kaguya'] as const;
export type ContainmentProtocol = typeof CONTAINMENT_PROTOCOLS[number];
const KEYS = CONTAINMENT_PROTOCOLS.map((protocol) => CONTAINMENT_KEY + protocol);

export const CONTAINMENT_MODULES = [
  'checkout', 'vip_booking', 'personalizados', 'nua_id_login', 'contact', 'vip_subscribe',
] as const;
const INFRASTRUCTURE_COMPONENTS = ['mercadopago', 'b2', 'supabase', 'cloudflare', 'email'] as const;
const EMERGENCY_ROUTES = new Set([
  '/api/control/system', '/api/auth/login', '/api/auth/session', '/api/auth/logout',
]);

interface ContainmentChange {
  active: boolean;
  incidentId: string;
  evidence: string;
  scopes: string[];
  changedBy: string;
  changedAt: string;
  revision: string;
}

export interface ContainmentRecord extends ContainmentChange {
  protocol: ContainmentProtocol;
  history?: ContainmentChange[];
}

export async function readContainments(env: CentralEnv): Promise<ContainmentRecord[]> {
  const database = getSupabaseClient(env);
  if (!database) throw new Error('Containment store unavailable');
  const { data, error } = await database.from('site_content').select('key,content').in('key', KEYS)
    .abortSignal(AbortSignal.timeout(4000));
  if (error || !Array.isArray(data)) throw new Error('Containment read failed');
  return data.map(({ key, content }) => {
    const known = CONTAINMENT_PROTOCOLS.find((protocol) => CONTAINMENT_KEY + protocol === key);
    if (!known || content?.protocol !== known || typeof content.active !== 'boolean'
      || !Array.isArray(content.scopes) || typeof content.revision !== 'string') {
      throw new Error('Invalid containment state');
    }
    return content as ContainmentRecord;
  });
}

export async function updateContainment(env: CentralEnv, actor: CentralActor, input: Record<string, unknown>) {
  const protocol = CONTAINMENT_PROTOCOLS.find((value) => value === input.protocol);
  const { active, expectedRevision } = input;
  const incidentId = typeof input.incidentId === 'string' ? input.incidentId.trim() : '';
  const evidence = typeof input.evidence === 'string' ? input.evidence.trim() : '';
  const allowedScopes: readonly string[] = protocol === 'kaguya' ? INFRASTRUCTURE_COMPONENTS
    : protocol === 'itachi' ? CONTAINMENT_MODULES : [];
  const suppliedScopes = Array.isArray(input.scopes) ? input.scopes : [];
  const scopes = [...new Set(suppliedScopes)].sort();
  if (!protocol || typeof active !== 'boolean'
    || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(incidentId)
    || evidence.length < 12 || evidence.length > 500
    || scopes.some((scope) => typeof scope !== 'string' || !allowedScopes.includes(scope))
    || (active && protocol !== 'madara' && !scopes.length)) {
    return { error: 'Informe protocolo, incidente, evidência e escopo válidos.', status: 400 } as const;
  }
  if (active && protocol !== 'itachi' && env.NUA_EMERGENCY_ACCESS_VERIFIED !== 'true') {
    return { error: 'O acesso emergencial do PHDEV ainda precisa ser validado neste ambiente.', status: 409 } as const;
  }
  const database = getSupabaseClient(env);
  if (!database) throw new Error('Containment store unavailable');
  const current = (await readContainments(env)).find((state) => state.protocol === protocol);
  if ((current?.revision ?? null) !== (expectedRevision ?? null)
    || (!active && (!current?.active || current.incidentId !== incidentId))
    || (active && current?.active && current.incidentId !== incidentId)) {
    return { error: 'O estado do incidente mudou. Atualize a página antes de continuar.', status: 409 } as const;
  }
  const history = current ? [current, ...(current.history || [])].slice(0, 30).map((entry) => ({
    active: entry.active, incidentId: entry.incidentId, evidence: entry.evidence, scopes: entry.scopes,
    changedBy: entry.changedBy, changedAt: entry.changedAt, revision: entry.revision,
  })) : [];
  const record: ContainmentRecord = {
    protocol, active, incidentId, evidence, scopes: active ? scopes as string[] : current?.scopes || [],
    changedBy: actor.subject, changedAt: new Date().toISOString(), revision: crypto.randomUUID(), history,
  };
  const key = CONTAINMENT_KEY + protocol;
  const row = { key, content: record, updated_at: record.changedAt, updated_by: actor.subject, version: 1 };
  const query = current
    ? database.from('site_content').update(row).eq('key', key).eq('content->>revision', current.revision)
    : database.from('site_content').insert(row);
  const result = await query.select('key').maybeSingle();
  if (result.error?.code === '23505' || (!result.error && !result.data)) {
    return { error: 'O estado do incidente mudou. Atualize a página antes de continuar.', status: 409 } as const;
  }
  if (result.error) throw new Error('Containment persistence failed');
  return { record } as const;
}

function affectedByKaguya(pathname: string, policy: RoutePolicy, scopes: string[]) {
  return scopes.some((scope) => {
    switch (scope) {
      case 'mercadopago':
        return ['checkout', 'vip_booking', 'personalizados'].includes(policy.moduleKey || '')
          || /^\/api\/(?:payments\/|webhooks\/mercadopago|admin\/refund(?:\/|$))/.test(pathname);
      case 'b2':
        return /^\/api\/(?:media\/|admin\/media|me\/media-url(?:\/|$))/.test(pathname);
      case 'email':
        return /^\/api\/(?:mail\/|contact(?:\/|$)|id\/request-code(?:\/|$)|me\/cofre(?:\/|$)|cron\/.+)/.test(pathname);
      case 'supabase':
      case 'cloudflare':
        return true;
      default:
        return false;
    }
  });
}

export function activeContainment(records: ContainmentRecord[], pathname: string, policy: RoutePolicy) {
  if (EMERGENCY_ROUTES.has(pathname)) return null;
  const madara = records.find((state) => state.active && state.protocol === 'madara');
  if (madara) return madara.protocol;
  const kaguya = records.find((state) => state.active && state.protocol === 'kaguya');
  if (kaguya && affectedByKaguya(pathname, policy, kaguya.scopes)) return kaguya.protocol;
  const itachi = records.find((state) => state.active && state.protocol === 'itachi');
  return policy.moduleKey && itachi?.scopes.includes(policy.moduleKey) ? itachi.protocol : null;
}

export function blocksProtectedMedia(records: ContainmentRecord[]) {
  return records.some((state) => state.active && (state.protocol === 'madara' || (
    state.protocol === 'kaguya' && state.scopes.some((scope) => ['b2', 'supabase', 'cloudflare'].includes(scope))
  )));
}

export function describeIncident(protocol: ContainmentProtocol) {
  const classification = {
    itachi: 'localized_application',
    madara: 'critical_application',
    kaguya: 'infrastructure',
  } as const;
  return classification[protocol];
}
export function blocksPublicPages(records: ContainmentRecord[]) {
  return records.some((state) => state.active && (state.protocol === 'madara'
    || (state.protocol === 'kaguya' && state.scopes.includes('cloudflare'))));
}
export function blocksNormalAdminLogin(records: ContainmentRecord[]) {
  return blocksPublicPages(records) || records.some((state) => state.active && state.protocol === 'kaguya'
    && state.scopes.includes('supabase'));
}
