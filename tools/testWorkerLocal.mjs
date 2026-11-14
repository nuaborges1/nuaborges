import worker from '../out-admin/_worker.js';

async function test() {
  const req = new Request('https://admin.nuaborges.com.br/api/admin/orders-feed', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  });

  const env = {
    ADMIN_API_SECRET: 'test_secret_123',
    ADMIN_PASSWORD: 'test_password_123'
  };

  const workerContext = {
    waitUntil: () => {},
    passThroughOnException: () => {}
  };

  try {
    const res = await worker.fetch(req, env, workerContext);
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    const body = await res.text();
    console.log('Body:', body.slice(0, 300));
  } catch (err) {
    console.error('Worker error:', err);
  }
}

test();
