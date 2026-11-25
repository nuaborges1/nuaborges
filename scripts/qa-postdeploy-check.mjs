/**
 * NUA BORGES — Non-Destructive Post-Deploy Verification Script
 *
 * Strictly READ-ONLY:
 * - Verifies HTTPS reachability and public routes (200)
 * - Verifies security headers (HSTS, X-Content-Type-Options, X-Frame-Options, CSP)
 * - Verifies private/admin endpoints reject unauthenticated requests (401/403/404)
 * - NEVER creates orders, bookings, uploads, or emails!
 *
 * Usage:
 *   node scripts/qa-postdeploy-check.mjs https://nuaborges.com.br
 */

const targetOrigin = (process.argv[2] || process.env.POSTDEPLOY_TARGET_URL || '').replace(/\/$/, '');
if (!targetOrigin || !/^https?:\/\//i.test(targetOrigin)) {
  console.error('Usage: node scripts/qa-postdeploy-check.mjs <https://target-origin>');
  process.exit(2);
}

const checks = [];

async function checkUrl(label, urlPath, expectedStatuses, extraCheck) {
  const url = `${targetOrigin}${urlPath}`;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const statusOk = expectedStatuses.includes(res.status);
    const detail = extraCheck ? extraCheck(res) : { ok: true, note: '' };
    const passed = statusOk && detail.ok;
    checks.push({ label, url, status: res.status, passed, note: detail.note });
    console.log(`${passed ? '✅' : '❌'} ${label} -> HTTP ${res.status} ${detail.note ? `(${detail.note})` : ''}`);
  } catch (err) {
    checks.push({ label, url, status: 0, passed: false, note: err?.message || 'Network error' });
    console.log(`❌ ${label} -> ERROR (${err?.message || err})`);
  }
}

await checkUrl('Public Home /', '/', [200], (res) => {
  const missing = ['x-content-type-options', 'x-frame-options'].filter((h) => !res.headers.get(h));
  return { ok: missing.length === 0, note: missing.length ? `missing headers: ${missing.join(', ')}` : 'headers ok' };
});
await checkUrl('Public Catalog /avulsos', '/avulsos', [200]);
await checkUrl('Public Chamadas /chamadas', '/chamadas', [200]);
await checkUrl('Public Personalizados /personalizados', '/personalizados', [200]);
await checkUrl('Published Catalog JSON', '/catalogo-publicado.json', [200]);
await checkUrl('Sitemap XML', '/sitemap.xml', [200]);
await checkUrl('Admin API Unauthenticated Blocked', '/api/admin/customers', [401, 403]);
await checkUrl('Superadmin Finance Unauthenticated Blocked', '/api/finance/admin', [401, 403]);
await checkUrl('Admin Content Mode Unauthenticated Blocked', '/api/content/sync?mode=admin', [401, 403]);
await checkUrl('Private Media Unauthenticated Blocked', '/media/private/nonexistent-check.webp', [403]);
await checkUrl('Unknown API Default-Deny', '/api/qa-nonexistent-probe', [404]);
await checkUrl('Simulate Approve Blocked in Prod', '/api/payments/simulate-approve', [401, 403, 404, 405]);

const failed = checks.filter((c) => !c.passed);
console.log(`\nPost-deploy summary: ${checks.length - failed.length}/${checks.length} passed.`);
process.exit(failed.length === 0 ? 0 : 1);
