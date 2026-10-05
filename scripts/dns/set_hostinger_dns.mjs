/**
 * Script de Automação de DNS na Hostinger via API Oficial
 *
 * Cria os apontamentos CNAME para admingeral.pages.dev no domínio phdev.store
 */

const domain = 'phdev.store';
const target = 'admingeral.pages.dev';

async function updateHostingerDns(apiToken) {
  if (!apiToken) {
    console.error('❌ Token da API Hostinger não informado!');
    console.log('Uso: node scripts/set_hostinger_dns.mjs <HOSTINGER_API_TOKEN>');
    process.exit(1);
  }

  console.log(`🚀 Conectando à API da Hostinger para configurar DNS de "${domain}"...`);

  const url = `https://developers.hostinger.com/api/dns/v1/zones/${domain}`;

  const payload = {
    overwrite: false,
    zone: [
      {
        name: 'admingeral',
        type: 'CNAME',
        records: [
          {
            content: target,
            ttl: 300,
          },
        ],
      },
      {
        name: 'admin',
        type: 'CNAME',
        records: [
          {
            content: target,
            ttl: 300,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log('✅ SUCESSO! Apontamentos DNS criados na Hostinger com sucesso!');
      console.log('Registros criados:');
      console.log(` - CNAME admingeral.${domain} -> ${target}`);
      console.log(` - CNAME admin.${domain} -> ${target}`);
      console.log('\nResposta da Hostinger:', JSON.stringify(data, null, 2));
    } else {
      console.error(`❌ Erro na Hostinger (HTTP ${status}):`, JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('❌ Falha na requisição:', err.message);
  }
}

const tokenArg = process.argv[2] || process.env.HOSTINGER_API_TOKEN;
updateHostingerDns(tokenArg);
