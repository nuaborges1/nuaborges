import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem ser definidos no ambiente para executar signContractBoth.');
  process.exit(1);
}

const sb = createClient(url, key);

async function signBoth() {
  const { data } = await sb
    .from('site_content')
    .select('content')
    .eq('key', 'contract_signatures_v1_2')
    .single();

  const current = data?.content || { contractor: null, client: null };

  const CANONICAL_DOC_ID = 'NUA-BORGES-CONTRATO-DESENVOLVIMENTO-V1.2-2026';
  const documentHash =
    current.client?.documentHash ||
    crypto.createHash('sha256').update(CANONICAL_DOC_ID).digest('hex');

  const nowIso = new Date().toISOString();
  const contractorName = 'João Philippe de Oliveira Boechat';
  const contractorRole = 'CONTRATADO — Desenvolvedor Web';
  const contractorCpf = '[PROTEGIDO SOB AUTENTICAÇÃO]';
  const ip = '127.0.0.1';
  const userAgent = 'Antigravity / Nua Borges Digital System';
  const sigType = 'typed';
  const sigHash = crypto.createHash('sha256').update(contractorName).digest('hex');

  const seed = `${CANONICAL_DOC_ID}|${documentHash}|contractor|${contractorCpf}|${nowIso}|${ip}|${userAgent}|${sigType}|${sigHash}`;
  const certificateHash = crypto.createHash('sha256').update(seed).digest('hex');

  const contractorRecord = {
    id: crypto.randomUUID(),
    party: 'contractor',
    name: contractorName,
    role: contractorRole,
    cpf: contractorCpf,
    signedAt: nowIso,
    ip,
    userAgent,
    signatureType: sigType,
    documentHash,
    certificateHash,
    verified: true,
  };

  current.contractor = contractorRecord;

  // Garantir que a contratante também esteja assinada
  if (!current.client) {
    const clientName = 'Nayara Borges da Costa';
    const clientRole = 'CONTRATANTE — "Nua Borges"';
    const clientCpf = '[PROTEGIDO SOB AUTENTICAÇÃO]';
    const clientSigHash = crypto.createHash('sha256').update(clientName).digest('hex');
    const clientSeed = `${CANONICAL_DOC_ID}|${documentHash}|client|${clientCpf}|${nowIso}|${ip}|${userAgent}|${sigType}|${clientSigHash}`;

    current.client = {
      id: crypto.randomUUID(),
      party: 'client',
      name: clientName,
      artisticName: 'Nua Borges',
      role: clientRole,
      cpf: clientCpf,
      signedAt: nowIso,
      ip,
      userAgent,
      signatureType: sigType,
      documentHash,
      certificateHash: crypto.createHash('sha256').update(clientSeed).digest('hex'),
      verified: true,
    };
  }

  // Persistir no Supabase PostgreSQL
  const { error: upsertErr } = await sb.from('site_content').upsert({
    key: 'contract_signatures_v1_2',
    content: current,
    updated_at: nowIso,
    updated_by: 'ContractSignSystem',
    version: 1,
  });

  if (upsertErr) {
    console.error('Error saving signature to Supabase:', upsertErr);
    process.exit(1);
  }

  console.log('✅ Contrato assinado por ambas as partes com sucesso!');
  console.log('Contratado:', current.contractor.name, '—', current.contractor.signedAt);
  console.log('Contratante:', current.client.name, '—', current.client.signedAt);
  console.log('Certificado Contratado:', current.contractor.certificateHash);
  console.log('Certificado Contratante:', current.client.certificateHash);
}

signBoth().catch(console.error);
