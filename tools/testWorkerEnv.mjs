import worker from '../out-admin/_worker.js';

async function test() {
  const req = new Request('https://admin.nuaborges.com.br/api/admin/orders-feed', {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  });

  // Empty env, just like if environment variables were missing or if ASSETS is present
  const env = {
    ASSETS: {
      fetch: async (r) => new Response('<html>Fallback HTML from ASSETS</html>', { status: 404, headers: { 'content-type': 'text/html' } })
    }
  };

  const workerContext = {
    waitUntil: () => {},
    passThroughOnException: () => {}
  };

  try {
    const res = await worker.fetch(req, env, workerContext);
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Worker error:', err);
  }
}

test();
