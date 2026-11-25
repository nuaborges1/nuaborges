import Module, { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { sendSmtpLocal } from './localNuaIdBridge.mjs';

const localAdminRoutes = {
  '/api/admin/notification-prefs': 'admin/notification-prefs',
  '/api/admin/presence': 'admin/presence',
  '/api/admin/refund': 'admin/refund',
};

const routes = {
  ...localAdminRoutes,
  '/api/admin/customers':'admin/customers',
  '/api/me/order-payment':'me/order-payment',
  '/api/me/cofre':'me/cofre', '/api/me/media-url':'me/media-url', '/api/me/library':'me/library',
  '/api/me/overview':'me/overview','/api/me/personalizados':'me/personalizados','/api/me/claim':'me/claim','/api/me/bind-order':'me/bind-order',
  '/api/payments/send-otp':'payments/send-otp',
  '/api/payments/recover-access':'payments/recover-access','/api/payments/update-email':'payments/update-email','/api/payments/simulate-approve':'payments/simulate-approve',
  '/api/payments/create-pix':'payments/create-pix','/api/payments/status':'payments/status',
  '/api/personalizados/create':'personalizados/create','/api/personalizados/status':'personalizados/status'
};
let compiled;
export async function loadVaultHandlers() {
  if (!compiled) compiled = compile().catch(error=>{compiled=undefined;throw error;});
  return compiled;
}
async function compile() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const local = new Module(filename);
    cache.set(filename, local);
    const nativeRequire = createRequire(filename);
    local.require = spec => {
      if (spec.endsWith('/_smtpHelper')) return {
        ...load(path.join(root, 'functions/api/_smtpHelper.ts')),
        sendSmtpEmailDetailed: async (env, options) => ({ok:await env.__EMAIL_SENDER__(options)}),
        sendSmtpEmail: (env, options) => env.__EMAIL_SENDER__(options)
      };
      if (spec.startsWith('.') || spec.startsWith('@/')) {
        const base = spec.startsWith('@/') ? path.join(root,spec.slice(2)) : path.resolve(path.dirname(filename),spec);
        for (const target of [base+'.ts',path.join(base,'index.ts')]) if (existsSync(target)) return load(target);
      }
      return nativeRequire(spec);
    };
    const js = ts.transpileModule(readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    local._compile(js,filename);
    return local.exports;
  }
  const result = {middleware:load(path.join(root,'functions/api/_middleware.ts')),media:load(path.join(root,'functions/media/[[path]].ts'))};
  for (const [route, file] of Object.entries(routes)) result[route] = load(path.join(root,'functions/api',file+'.ts'));
  return result;
}
export async function serveVaultRoute({pathname,parsedUrl,req,res,env,readJsonBody,resolveRefundSession}) {
  const isPrivate = pathname.startsWith('/media/') && decodeURIComponent(pathname).split('/').includes('private');
  if (!routes[pathname] && !isPrivate) return false;
  if (Object.hasOwn(localAdminRoutes, pathname)) env = { ...env, ENVIRONMENT: 'development' };
  const handlers = await loadVaultHandlers();
  const method = req.method;
  const request = new Request(parsedUrl,{method,headers:req.headers,body:method==='POST'?JSON.stringify(await readJsonBody()):undefined});
  const localOrigin = req.headers.origin;
  if (localOrigin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(localOrigin)) env.NEXT_PUBLIC_SITE_URL=localOrigin;
  env.__EMAIL_SENDER__=options=>sendSmtpLocal(env,options);
  const routeModule = isPrivate ? handlers.media : handlers[pathname];
  const handler = routeModule['onRequest'+method[0]+method.slice(1).toLowerCase()] || routeModule.onRequest;
  const localRefund = pathname === '/api/admin/refund'
    && ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
  const session = localRefund && method === 'POST' ? resolveRefundSession?.() : null;
  const refundActor = session && session.expiresAt > Date.now() && ['admin', 'dev', 'client'].includes(session.role)
    ? { role: session.role, subject: session.sub, profile: session.sub === 'phdev' ? 'phdev' : 'nua' }
    : null;
  const context = {request,env,data:{localRefund, refundActor},params:{path:decodeURIComponent(pathname.slice(7))}};
  const invoke = ()=>handler ? handler(context) : new Response(null,{status:405});
  const response = isPrivate ? await invoke() : await handlers.middleware.onRequest({...context,next:invoke});
  response.headers.forEach((value,name)=>{if(name!=='set-cookie')res.setHeader(name,value);});
  const cookies=response.headers.getSetCookie();
  if(cookies.length)res.setHeader('Set-Cookie',cookies);
  res.statusCode=response.status;
  if (response.body && method!=='HEAD') await pipeline(Readable.fromWeb(response.body),res);
  else res.end();
  return true;
}
