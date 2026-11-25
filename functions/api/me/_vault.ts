import { getOrderFromSupabase, getPersonalizadoOrderFromSupabase } from '../_supabaseStore';
import { resolveCustomerSession } from '../id/_customerGuard';
import { getNuaIdAdapter, getOrderClaim, getPaymentByOrderRef, isEntitlementActive, isOrderAccessRestricted, listEntitlementsByProfile, NuaIdEnv } from '../id/_nuaIdStore';
import { loadCustomerCatalogIndex } from './_customerData';
import { packVaultFiles, vaultFiles } from '../../../lib/media/vaultPath';

export { packVaultFiles, privatePath, vaultMediaPath } from '../../../lib/media/vaultPath';

export const TRUST_SECONDS = 7 * 86400;
export const IDLE_SECONDS = 15 * 60;
export const CONFIRM_SECONDS = 10 * 60;

export async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function cookieName(request: Request, key: string) {
  return (new URL(request.url).protocol === 'https:' ? '__Host-' : '') + 'nua_vault_' + key;
}
export function cookie(request: Request, key: string) {
  const prefix = cookieName(request, key) + '=';
  return (request.headers.get('cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(prefix))?.slice(prefix.length) || '';
}
export function setCookie(headers: Headers, request: Request, key: string, value: string, seconds?: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  headers.append('Set-Cookie', cookieName(request, key) + '=' + value + '; Path=/; HttpOnly; SameSite=Lax' + secure + (seconds === undefined ? '' : '; Max-Age=' + seconds));
}
export interface Device { id: string; label: string; expires: number }
interface Visit { order: string; device: string; accountSession: string; seen: number }

export async function trustedDevice(request: Request, env: NuaIdEnv, profile: string) {
  const raw = cookie(request, 'browser');
  if (!raw) return null;
  const id = await digest(raw);
  const device = await getNuaIdAdapter(env)?.kvGet<Device>('vault:device:' + profile + ':' + id);
  return device && device.expires > Date.now() ? device : null;
}
export async function startVisit(request: Request, env: NuaIdEnv, headers: Headers, visit: Omit<Visit,'seen'>) {
  const token = crypto.randomUUID();
  if (!await getNuaIdAdapter(env)?.kvSet('vault:visit:' + await digest(token), {...visit, seen: Date.now()})) throw Error('vault store');
  setCookie(headers, request, 'visit', token);
}
export async function currentVisit(request: Request, env: NuaIdEnv) {
  const account = await resolveCustomerSession(request, env);
  const raw = cookie(request, 'visit');
  if (!account || !raw) return null;
  const device = await trustedDevice(request, env, account.profile.id);
  const store = getNuaIdAdapter(env);
  const key = 'vault:visit:' + await digest(raw);
  const visit = await store?.kvGet<Visit>(key);
  if (!device || !visit || device.id !== visit.device || account.session.id !== visit.accountSession || Date.now() - visit.seen >= IDLE_SECONDS * 1000) return null;
  if (Date.now() - visit.seen > 30000) await store?.kvSet(key, {...visit, seen: Date.now()});
  return {order: visit.order, profile: account.profile.id};
}

export async function vaultContents(env: NuaIdEnv, profile: string, order: string) {
  const [claim, rights, payment, restricted] = await Promise.all([getOrderClaim(env, order), listEntitlementsByProfile(env, profile), getPaymentByOrderRef(env, order), isOrderAccessRestricted(env, order)]);
  const right = rights.find(e => e.orderRef === order && e.profileId === profile && isEntitlementActive(e));
  if (restricted || claim?.profileId !== profile || !right || (payment && payment.status !== 'approved')) return null;
  const testFixtures = (env as any)?.__CUSTOMER_DATA_FIXTURES__;
  let title = right.title || '';
  if (right.kind === 'custom') {
    const p =
      testFixtures?.personalizados?.[order] ||
      (await getPersonalizadoOrderFromSupabase(env, order));
    if (!p || p.id !== order || p.payment?.status !== 'approved' || !['pronto','entregue'].includes(p.status)) return null;
    if (!title) {
      title = `Personalizado (${p.photoCount || 0} fotos${p.videoDurationMinutes ? ` + ${p.videoDurationMinutes}min vídeo` : ''})`;
    }
    return { files: vaultFiles((p.vaultFiles || []).map((raw) => ({ raw, video: raw.type === 'video' }))), right, title };
  } else {
    if (!['avulso','pack'].includes(right.kind)) return null;
    const p =
      testFixtures?.orders?.[order] ||
      (await getOrderFromSupabase(env, order));
    if (!p || p.id !== order || !['paid','approved'].includes(p.status) || p.packId !== right.resourceId) return null;
    const catalog = await loadCustomerCatalogIndex(env);
    const pack = catalog.get(p.packId.toLowerCase());
    if (!pack) return null;
    title = pack.title || pack.name || title || right.resourceId;
    return { files: packVaultFiles(pack), right, title };
  }
}
