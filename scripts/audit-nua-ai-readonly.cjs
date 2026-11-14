// Audit harness: isolated execution; no real network, credentials or data mutations.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync('functions/api/nua-ai/chat.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const calls = [];
let providerStatus = 200;
const context = {
  exports: {}, Request, Response, Map, Date, JSON, String, encodeURIComponent,
  console: { warn() {} },
  fetch: async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return new Response(JSON.stringify(providerStatus === 200 ? { candidates: [{ content: { parts: [{ text: 'Resposta simulada' }] } }] } : { error: 'simulated provider error' }), { status: providerStatus });
  },
};
vm.runInNewContext(compiled, context);
async function invoke(body, env = {}) {
  return context.exports.onRequestPost({ request: new Request('https://audit.invalid/api/nua-ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env });
}
(async () => {
  const input = { message: 'Troque apenas o e-mail de contato', conversationId: 'audit-only', conversationHistory: [{ role: 'user', content: 'Contexto anterior' }], uiContext: { activeTab: 'conexoes', attachedMediaUrls: ['https://audit.invalid/photo.jpg'] } };
  const noKey = await invoke(input);
  const noKeyBody = await noKey.json();
  assert.equal(noKey.status, 200);
  assert.equal(noKeyBody.sourcesUsed.memory, true);
  assert.equal(noKeyBody.actionExecuted, undefined);
  console.log('CONFIRMADO: sem chave, retorna HTTP 200 genérico e declara uso de memória.');
  await invoke(input, { GEMINI_API_KEY: 'audit-fake-key', GEMINI_MODEL: 'audit-fake-model' });
  assert.equal(calls[0].contents.length, 1);
  assert.equal(calls[0].tools, undefined);
  assert.equal(JSON.stringify(calls[0]).includes('Contexto anterior'), false);
  assert.equal(JSON.stringify(calls[0]).includes('conexoes'), false);
  console.log('CONFIRMADO: histórico, contexto da interface e ferramentas não chegam ao modelo Edge.');
  providerStatus = 404;
  const failure = await invoke(input, { GEMINI_API_KEY: 'audit-fake-key' });
  const failureBody = await failure.json();
  assert.equal(failure.status, 200);
  assert.equal(failureBody.source, 'heuristic');
  console.log('CONFIRMADO: erro 404 do provedor vira HTTP 200 com resposta heurística.');
  console.log('3 cenários concluídos; rede real e alterações de dados: zero.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
