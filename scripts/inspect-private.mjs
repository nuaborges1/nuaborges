import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^["']|["']$/g, '');
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: priv } = await sb.from('site_content').select('content').eq('key', 'private_admin_content').single();
  const avulsosPriv = priv?.content?.avulsos?.items || [];
  console.log('Avulsos in private_admin_content:', JSON.stringify(avulsosPriv, null, 2));

  const { data: pub } = await sb.from('site_content').select('content').eq('key', 'published_content').single();
  const avulsosPub = pub?.content?.avulsos?.items || [];
  console.log('Avulsos in published_content:', JSON.stringify(avulsosPub, null, 2));
}

run().catch(console.error);
