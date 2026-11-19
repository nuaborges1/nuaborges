import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, 'utf8');
  const res = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.slice(0, idx).trim();
      let v = trimmed.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      res[k] = v;
    }
  }
  return res;
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local') };
const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

console.log('Supabase URL:', url ? url.substring(0, 20) + '...' : 'NONE');

if (!url || !key) {
  console.log('No supabase credentials found in .env.local');
  process.exit(1);
}

const sb = createClient(url, key);

async function run() {
  // Query orders
  const targetToken = 'ptok_mwh4ov53_e421b5p9';
  console.log(`\n=== SEARCHING FOR TOKEN ${targetToken} ===`);
  
  const { data: orderById, error: err1 } = await sb
    .from('orders')
    .select('*')
    .eq('id', targetToken);
  console.log('Search by id:', orderById);

  const { data: orderByPurchaseToken, error: err2 } = await sb
    .from('orders')
    .select('*')
    .eq('purchase_token', targetToken);
  console.log('Search by purchase_token:', orderByPurchaseToken);

  // Search in metadata or system_kv
  const { data: sysKv, error: err3 } = await sb
    .from('system_kv')
    .select('*')
    .ilike('key', `%${targetToken}%`);
  console.log('Search in system_kv:', sysKv);

  if (err1) console.log('Err1:', err1);
  if (err2) console.log('Err2:', err2);
  if (err3) console.log('Err3:', err3);
  const { data: recentOrders, error: err4 } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (err4) console.log('Err4:', err4);
  console.log('\n=== 5 RECENT ORDERS ===');
  console.log(JSON.stringify(recentOrders, null, 2));
}

run().catch(console.error);
