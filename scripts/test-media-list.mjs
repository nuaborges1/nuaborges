import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(l => {
  const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^["']|["']$/g, '');
});

async function test() {
  const secret = env.ADMIN_API_SECRET || env.ADMIN_PASSWORD;
  console.log('Secret present:', !!secret);
  const res = await fetch('https://nuaborges.com.br/api/media/list?limit=1000', {
    headers: { 'Authorization': 'Bearer ' + secret }
  });
  console.log('Status with auth:', res.status);
  const data = await res.json();
  console.log('Audit:', data.audit);
  console.log('Total items returned:', data.items?.length);
  if (data.items?.length > 0) {
    console.log('Sample item 0:', data.items[0]);
    console.log('Sample item 1:', data.items[1]);
  }
}

test().catch(console.error);
