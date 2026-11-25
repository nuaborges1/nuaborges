import { getOrderFromSupabase, getPersonalizadoOrderFromSupabase } from '../_supabaseStore';
import {
  getNuaIdAdapter,
  getOrderClaim,
  getPaymentByOrderRef,
  getProfileById,
  recordNotificationEvent,
  NuaIdEnv,
} from '../id/_nuaIdStore';
import { renderVaultDeliveryEmailHtml } from '../id/_emailTemplates';
import { dispatchTransactionalEmail } from '../id/_emailDispatch';
import { formatUtcToSaoPaulo } from './_customerData';
import { vaultContents } from './_vault';

interface Pending { order: string; attempts: number; next: number }
const prefix = 'vault:delivery:pending:';

function formatBrl(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

function formatPaymentMethod(raw?: string | null): string | null {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return null;
  if (s.includes('pix')) return 'Pix';
  if (s.includes('manual')) return 'Confirmação manual';
  if (s.includes('card') || s.includes('cartao') || s.includes('credit')) return 'Cartão';
  return raw || null;
}

function formatIncludedSummary(files: Array<{ video: boolean }>): string | null {
  const videos = files.filter((f) => f.video).length;
  const photos = files.length - videos;
  const parts: string[] = [];
  if (photos > 0) parts.push(`${photos} ${photos === 1 ? 'foto' : 'fotos'}`);
  if (videos > 0) parts.push(`${videos} ${videos === 1 ? 'vídeo' : 'vídeos'}`);
  return parts.length ? parts.join(' e ') : null;
}

async function deliver(env: NuaIdEnv, job: Pending) {
  const store = getNuaIdAdapter(env);
  if (!store) return false;
  const sentKey = 'vault:delivery:sent:' + job.order;
  const pendingKey = prefix + job.order;
  if (await store.kvGet(sentKey)) {
    await store.kvDelete(pendingKey);
    return true;
  }
  if (job.next > Date.now() || !(await store.kvLease?.(pendingKey, job.next, { ...job, next: Date.now() + 10 * 60000 }))) {
    return false;
  }
  const claim = await getOrderClaim(env, job.order);
  const profile = claim && (await getProfileById(env, claim.profileId));
  const contents = profile?.status === 'active' && (await vaultContents(env, profile.id, job.order));
  if (profile && contents && contents.files.length) {
    const site = (env.NEXT_PUBLIC_SITE_URL || 'https://nuaborges.com.br').replace(/\/$/, '');
    const isCustom = contents.right.kind === 'custom';
    const [payment, orderRecord, persRecord] = await Promise.all([
      getPaymentByOrderRef(env, job.order).catch(() => null),
      isCustom ? Promise.resolve(null) : getOrderFromSupabase(env, job.order).catch(() => null),
      isCustom ? getPersonalizadoOrderFromSupabase(env, job.order).catch(() => null) : Promise.resolve(null),
    ]);

    const rawAmount = payment?.amountCents
      ? payment.amountCents / 100
      : isCustom
        ? Number(persRecord?.totalPrice || 0)
        : Number(orderRecord?.amount || 0);
    const paidAtIso =
      payment?.paidAt ||
      (isCustom ? persRecord?.payment?.paidAt || persRecord?.updatedAt : orderRecord?.updatedAt || orderRecord?.createdAt) ||
      null;
    const paidAtBr = paidAtIso ? formatUtcToSaoPaulo(paidAtIso) : null;
    const confirmedAtFormatted =
      paidAtBr && paidAtBr.dateBr !== '—' ? `${paidAtBr.dateBr} às ${paidAtBr.timeBr} (Brasília)` : null;

    const note = renderVaultDeliveryEmailHtml({
      customerName:
        profile.displayName ||
        (isCustom ? persRecord?.clientName : orderRecord?.customerName) ||
        null,
      itemTitle: contents.title || contents.right.resourceId || job.order,
      kindLabel: isCustom
        ? 'Encomenda Personalizada'
        : contents.right.kind === 'avulso'
          ? 'Conteúdo Avulso'
          : 'Conteúdo Exclusivo',
      includedSummary: formatIncludedSummary(contents.files),
      orderRef: job.order,
      amountFormatted: formatBrl(rawAmount),
      paymentMethodLabel: formatPaymentMethod(
        payment?.paymentMethod ||
          (isCustom ? persRecord?.payment?.method : orderRecord?.paymentMethod) ||
          'pix'
      ),
      confirmedAtFormatted,
      vaultUrl: new URL('/cofre?order=' + encodeURIComponent(job.order), site).href,
      accountUrl: new URL(
        `/conta?tab=${isCustom ? 'personalizados' : 'biblioteca'}`,
        site
      ).href,
      isCustom,
    });

    const result = await dispatchTransactionalEmail(env, { to: profile.email, ...note });
    await recordNotificationEvent(env, {
      profileId: profile.id,
      recipientEmail: profile.email,
      orderRef: job.order,
      kind: 'vault_delivery',
      status: result.sent ? 'sent' : 'failed',
      errorMessage: result.error,
    });
    if (result.sent && (await store.kvSet(sentKey, { sentAt: Date.now() }))) {
      await store.kvDelete(pendingKey);
      return true;
    }
  }
  const attempts = job.attempts + 1;
  await store.kvSet(pendingKey, { ...job, attempts, next: Date.now() + Math.min(1440, 2 ** Math.min(attempts, 11)) * 60000 });
  return false;
}
export async function notifyVaultDelivery(env: NuaIdEnv, order: string) {
  const store = getNuaIdAdapter(env);
  if (!store) return false;
  if (await store.kvGet('vault:delivery:sent:' + order)) return true;
  const key = prefix + order;
  const initial = { order, attempts: 0, next: 0 };
  const existing = await store.kvGet<Pending>(key);
  const job = existing || ((await store.kvCreate?.(key, initial)) ? initial : await store.kvGet<Pending>(key));
  if (!job) throw new Error('Falha ao registrar a entrega do Cofre.');
  return deliver(env, job);
}
export async function retryVaultMail(env: NuaIdEnv) {
  const jobs = (await getNuaIdAdapter(env)?.kvListByPrefix<Pending>(prefix)) || [];
  for (const { value } of jobs.filter((row) => row.value.next <= Date.now()).slice(0, 10)) {
    await deliver(env, value).catch(() => console.error('[VaultMail] Falha ao reprocessar entrega.'));
  }
}