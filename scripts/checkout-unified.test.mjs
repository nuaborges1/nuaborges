import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Checkout Unificado & Auditoria Arquitetural', async (t) => {
  await t.test('1. Centralização do Checkout: Todas as páginas usam CheckoutModal compartilhado', () => {
    const chamadasPage = fs.readFileSync(path.join(ROOT_DIR, 'app/chamadas/page.tsx'), 'utf-8');
    const personalizadosView = fs.readFileSync(path.join(ROOT_DIR, 'app/personalizados/PersonalizadosClientView.tsx'), 'utf-8');
    const avulsosSection = fs.readFileSync(path.join(ROOT_DIR, 'components/nua/site/AvulsosSection.tsx'), 'utf-8');
    const avulsoProductView = fs.readFileSync(path.join(ROOT_DIR, 'app/avulsos/[slug]/AvulsoProductView.tsx'), 'utf-8');
    const checkoutModal = fs.readFileSync(path.join(ROOT_DIR, 'components/nua/site/CheckoutModal.tsx'), 'utf-8');

    // 1. Chamadas importa e renderiza CheckoutModal
    assert.ok(
      chamadasPage.includes("import { CheckoutModal"),
      'app/chamadas/page.tsx deve importar CheckoutModal'
    );
    assert.ok(
      chamadasPage.includes("<CheckoutModal"),
      'app/chamadas/page.tsx deve renderizar o CheckoutModal compartilhado'
    );
    assert.ok(
      !chamadasPage.includes("Gerando imagem do QR Code Pix..."),
      'app/chamadas/page.tsx não deve ter modal de Pix duplicado inline'
    );

    // 2. Personalizados importa e renderiza CheckoutModal
    assert.ok(
      personalizadosView.includes("import { CheckoutModal"),
      'app/personalizados/PersonalizadosClientView.tsx deve importar CheckoutModal'
    );
    assert.ok(
      personalizadosView.includes("<CheckoutModal"),
      'app/personalizados/PersonalizadosClientView.tsx deve renderizar o CheckoutModal compartilhado'
    );
    assert.ok(
      !personalizadosView.includes("Finalize sua Encomenda</h3>"),
      'app/personalizados/PersonalizadosClientView.tsx não deve ter modal de Pix duplicado'
    );

    // 3. Avulsos importa e renderiza CheckoutModal
    assert.ok(
      avulsosSection.includes("import { CheckoutModal"),
      'components/nua/site/AvulsosSection.tsx deve importar CheckoutModal'
    );
    assert.ok(
      avulsoProductView.includes("import { CheckoutModal"),
      'app/avulsos/[slug]/AvulsoProductView.tsx deve importar CheckoutModal'
    );

    // 4. CheckoutModal implementa interface polimórfica UniversalCheckoutContext
    assert.ok(
      checkoutModal.includes("export type CheckoutItemType = 'avulso' | 'chamada' | 'personalizado' | 'vip';"),
      'CheckoutModal deve definir suporte a tipos avulso, chamada, personalizado e vip'
    );
  });

  await t.test('2. Eliminação de Resíduos do Cloudflare KV e Cloudflare Storage nos Backends de Pagamento', () => {
    const filesToCheck = [
      'functions/api/payments/create-pix.ts',
      'functions/api/payments/status.ts',
      'functions/api/webhooks/stripe.ts',
      'functions/api/content/sync.ts',
      'functions/api/contract/sign.ts',
    ];

    for (const file of filesToCheck) {
      const fullPath = path.join(ROOT_DIR, file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert.ok(
          !content.includes('env.CONTENT_KV') &&
          !content.includes('env.NUA_CONTENT') &&
          !content.includes('env.NUA_MEDIA') &&
          !content.includes('kv.put(') &&
          !content.includes('kv.get('),
          `${file} não deve conter chamadas legadas aos namespaces KV`
        );
      }
    }
  });

  await t.test('3. Cloudflare Toml: Apenas hospedagem e proxy (sem bindings de banco de dados)', () => {
    const tomls = [
      'wrangler.toml',
      'wrangler.admin.toml',
      'wrangler.admingeral.toml',
    ];

    for (const toml of tomls) {
      const fullPath = path.join(ROOT_DIR, toml);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        assert.ok(
          !content.includes('[[kv_namespaces]]'),
          `${toml} não deve conter namespaces KV (Cloudflare não é banco de dados)`
        );
      }
    }
  });

  await t.test('4. Backend de Pagamentos: Suporte a chamadas, personalizados e avulsos em create-pix', async () => {
    const createPixFile = fs.readFileSync(
      path.join(ROOT_DIR, 'functions/api/payments/create-pix.ts'),
      'utf-8'
    );

    assert.ok(
      createPixFile.includes("type === 'chamada'"),
      'create-pix.ts deve suportar type === chamada'
    );
    assert.ok(
      createPixFile.includes("type === 'personalizado'"),
      'create-pix.ts deve suportar type === personalizado'
    );
    assert.ok(
      createPixFile.includes("type === 'avulso'"),
      'create-pix.ts deve suportar type === avulso'
    );
    assert.ok(
      createPixFile.includes("getAppointmentByIdFromSupabase"),
      'create-pix.ts deve obter agendamento via Supabase'
    );
    assert.ok(
      createPixFile.includes("getPersonalizadoOrderFromSupabase"),
      'create-pix.ts deve obter pedido personalizado via Supabase'
    );
  });

  await t.test('5. Webhook Stripe: Sincronização oficial em Supabase para todos os tipos de pedido', () => {
    const webhookFile = fs.readFileSync(
      path.join(ROOT_DIR, 'functions/api/webhooks/stripe.ts'),
      'utf-8'
    );

    assert.ok(
      webhookFile.includes("saveAppointmentToSupabase"),
      'Stripe webhook deve atualizar agendamentos no Supabase via saveAppointmentToSupabase'
    );
    assert.ok(
      webhookFile.includes("savePersonalizadoOrderToSupabase"),
      'Stripe webhook deve atualizar pedidos personalizados no Supabase via savePersonalizadoOrderToSupabase'
    );
    assert.ok(
      webhookFile.includes("updateOrderStatusInSupabase"),
      'Stripe webhook deve atualizar pedidos gerais no Supabase via updateOrderStatusInSupabase'
    );
  });

  await t.test('6. Validação de Proibição Absoluta do Ícone Sparkles em todo o Ecossistema', () => {
    const allFiles = [];
    function scan(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.name === 'node_modules' || e.name === '.git' || e.name === '.next' || e.name === 'out' || e.name === 'dist') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) scan(full);
        else if (/\.(tsx|ts|jsx|js)$/.test(e.name) && !e.name.includes('.test.')) {
          allFiles.push(full);
        }
      }
    }
    scan(path.join(ROOT_DIR, 'app'));
    scan(path.join(ROOT_DIR, 'components'));
    scan(path.join(ROOT_DIR, 'functions'));

    for (const f of allFiles) {
      const src = fs.readFileSync(f, 'utf-8');
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('//') && line.includes('Sparkles')) continue;
        assert.ok(
          !line.includes('<Sparkles') && !line.includes('Sparkles,') && !line.includes(', Sparkles'),
          `Violação de regra estética: Sparkles importado/utilizado em ${f}:${i + 1}`
        );
      }
    }
  });
});
