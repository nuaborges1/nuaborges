import { webcrypto } from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const subtle = webcrypto.subtle;
const VAULT_SALT_STATIC = 'nua-borges-vault-v1-2026';

function stringToBuffer(str) {
  return new TextEncoder().encode(str);
}

function bufferToString(buf) {
  return new TextDecoder().decode(buf);
}

function uint8ArrayToBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function base64ToUint8Array(b64) {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function deriveVaultKey(masterSecret, saltBytes) {
  const keyMaterial = await subtle.importKey(
    'raw',
    stringToBuffer(masterSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptVaultText(plainText, masterKey = VAULT_SALT_STATIC) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(masterKey, salt);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    stringToBuffer(plainText)
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
  };
}

async function decryptVaultText(payload, masterKey = VAULT_SALT_STATIC) {
  const saltBytes = base64ToUint8Array(payload.salt);
  const ivBytes = base64ToUint8Array(payload.iv);
  const ciphertextBytes = base64ToUint8Array(payload.ciphertext);

  const key = await deriveVaultKey(masterKey, saltBytes);

  const decryptedBuffer = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    ciphertextBytes
  );

  return bufferToString(decryptedBuffer);
}

const CREDENTIALS_TO_ADD = [
  {
    id: 'cred_hostinger_email',
    service: 'hostinger',
    category: 'hosting',
    title: 'Hostinger (E-mail & Hospedagem Oficial)',
    username: process.env.VAULT_HOSTINGER_USER || 'contato@nuaborges.com.br',
    passwordRaw: process.env.VAULT_HOSTINGER_PASS || '[DEFINIR_VIA_ENV]',
    accessUrl: 'https://mail.hostinger.com',
    notesRaw: 'Servidor SMTP smtp.hostinger.com:465 (SSL/TLS). hPanel: https://hpanel.hostinger.com',
  },
  {
    id: 'cred_yahoo_email',
    service: 'yahoo',
    category: 'email',
    title: 'Yahoo Mail (E-mail Oficial Nua Borges)',
    username: process.env.VAULT_YAHOO_USER || 'nuaborges@yahoo.com',
    passwordRaw: process.env.VAULT_YAHOO_PASS || '[DEFINIR_VIA_ENV]',
    accessUrl: 'https://mail.yahoo.com',
    notesRaw: 'E-mail oficial cadastrado para contato comercial.',
  },
  {
    id: 'cred_admin_panel',
    service: 'admin',
    category: 'admin',
    title: 'Painel Administrativo Nua Borges (Acesso Mestre)',
    username: 'admin@nuaborges.com.br',
    passwordRaw: process.env.ADMIN_PASSWORD || '[DEFINIR_VIA_ENV]',
    accessUrl: '/admin',
    notesRaw: 'Senha mestre do painel configurada no Cloudflare Pages.',
  },
  {
    id: 'cred_mercadopago_gateway',
    service: 'mercadopago',
    category: 'payment',
    title: 'Mercado Pago (Gateway Oficial de Pagamentos)',
    username: process.env.VAULT_MP_USER || 'contato@nuaborges.com.br',
    passwordRaw: process.env.MP_ACCESS_TOKEN || '[DEFINIR_VIA_ENV]',
    accessUrl: 'https://www.mercadopago.com.br/developers',
    notesRaw: 'Chaves configuradas no Cloudflare Pages e Mercado Pago Developers.',
  },
];

async function main() {
  console.log('🔒 Criptografando credenciais com AES-GCM (256-bit) + PBKDF2...');
  const nowIso = new Date().toISOString();
  const encryptedCredentials = [];

  for (const item of CREDENTIALS_TO_ADD) {
    const encryptedPassword = await encryptVaultText(item.passwordRaw);
    const encryptedNotes = item.notesRaw ? await encryptVaultText(item.notesRaw) : undefined;

    // Testar descriptografia imediata para garantir 100% de integridade
    const testDecrypted = await decryptVaultText(encryptedPassword);
    if (testDecrypted !== item.passwordRaw) {
      throw new Error(`Falha no teste de integridade da credencial ${item.id}`);
    }

    encryptedCredentials.push({
      id: item.id,
      service: item.service,
      category: item.category,
      title: item.title,
      username: item.username,
      accessUrl: item.accessUrl,
      encryptedPassword,
      encryptedNotes,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  console.log(`✅ ${encryptedCredentials.length} credenciais criptografadas e validadas.`);

  // 1. Salvar no arquivo local
  const dataDir = path.resolve('data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const localFile = path.join(dataDir, 'local_vault_credentials.json');
  fs.writeFileSync(localFile, JSON.stringify(encryptedCredentials, null, 2), 'utf-8');
  console.log(`💾 Salvo localmente em: ${localFile}`);

  // 2. Persistir no Supabase PostgreSQL (site_content) se configurado
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('ℹ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes. Persistência remota ignorada.');
    return;
  }
  const sb = createClient(url, key);

  const { error: upsertErr } = await sb.from('site_content').upsert({
    key: 'vault_credentials',
    content: encryptedCredentials,
    updated_at: nowIso,
    updated_by: 'CofreCredenciaisSetup',
    version: 1,
  });

  if (upsertErr) {
    console.error('❌ Erro ao salvar no Supabase:', upsertErr);
    process.exit(1);
  }

  console.log('🚀 Todas as 8 credenciais persistidas no Supabase com sucesso!');
  for (const c of encryptedCredentials) {
    console.log(`   - [${c.service.toUpperCase()}] ${c.title} (${c.username}) -> Criptografada AES-256`);
  }
}

main().catch(console.error);
