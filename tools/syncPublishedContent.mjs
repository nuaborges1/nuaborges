import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const targetFile = path.join(dataDir, 'published_content.json');

// Lê credenciais de .dev.vars ou .env.local
function getEnvConfig() {
  const env = { ...process.env };
  const candidateFiles = ['.dev.vars', '.env.local', '.env'];
  for (const f of candidateFiles) {
    const fullPath = path.join(rootDir, f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const k = match[1].trim();
          let v = match[2].trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (!env[k]) env[k] = v;
        }
      });
    }
  }
  return env;
}

async function syncContent() {
  console.log('🔄 [Sync Published Content] Sincronizando published_content do Supabase com data/published_content.json...');
  const env = getEnvConfig();
  const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_ANON_KEY;

  const allowStale = process.env.ALLOW_STALE_CONTENT === 'true';

  if (!supabaseUrl || !supabaseKey) {
    if ((process.argv.includes('--require-fresh') || process.env.CI === 'true') && !allowStale) {
      console.error('❌ [Sync Published Content] Configure o acesso ao Supabase para gerar um pacote de publicação.');
      process.exit(1);
    }
    console.warn('⚠️ [Sync Published Content] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados. Mantendo arquivo local.');
    return;
  }

  try {
    const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/site_content?key=eq.published_content&select=*`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`❌ [Sync Published Content] Falha na requisição ao Supabase (${res.status}): ${res.statusText}`);
      if (!allowStale) process.exit(1);
      return;
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      console.warn('⚠️ [Sync Published Content] Nenhuma linha encontrada com key=published_content.');
      if (!allowStale) process.exit(1);
      return;
    }

    const row = rows[0];
    let content = row.content;
    if (typeof content === 'string') {
      content = JSON.parse(content);
    }

    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      console.error('❌ [Sync Published Content] Conteúdo retornado é inválido.');
      if (!allowStale) process.exit(1);
      return;
    }

    // Salva em data/published_content.json
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(targetFile, JSON.stringify(content, null, 2), 'utf-8');
    console.log(`✅ [Sync Published Content] Sucesso! published_content.json atualizado para a versão ${row.version || 'recente'}.`);
    console.log(`📦 [Sync Published Content] Packs avulsos disponíveis: ${(content.avulsos?.items || []).map((i) => i.slug || i.id).join(', ')}`);
  } catch (err) {
    console.error('❌ [Sync Published Content] Erro ao sincronizar com Supabase:', err);
    if (!allowStale) process.exit(1);
  }
}

syncContent();
