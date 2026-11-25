import test from 'node:test';
import assert from 'node:assert/strict';
import { loadVaultHandlers } from '../tools/localVaultHandlers.mjs';

test('o acesso exige confirmação no navegador de origem e autorização do pedido em cada leitura',async t=>{
  const handlers=await loadVaultHandlers();
  const records=new Map();
  const store={
    kvGet:async key=>structuredClone(records.get(key) || null),
    kvSet:async(key,value)=>{records.set(key,structuredClone(value));return true;},
    kvDelete:async key=>records.delete(key),
    kvConsume:async key=>records.delete(key),
    kvListByPrefix:async prefix=>Array.from(records).filter(([k])=>k.startsWith(prefix)).map(([key,value])=>({key,value})),
  };
  const origin='https://example.test';
  let proof, payment='paid', stage='pronto';
  const env={SUPABASE_URL:'https://database.test',SUPABASE_SERVICE_ROLE_KEY:'test-service-key',NUA_ID_SECRET:'private-test-secret',NEXT_PUBLIC_SITE_URL:origin,__NUA_ID_TEST_STORE__:store,__CUSTOMER_DATA_FIXTURES__:{catalog:[{slug:'album',exclusivePhotos:['/media/private/photos/primeira.jpg']}]},__EMAIL_SENDER__:async({html})=>{proof=html.match(/confirm=([a-f0-9-]+)/)[1];return true;}};
  t.mock.method(globalThis,'fetch',async input=>{
    const url=new URL(input.url || String(input));
    assert.equal(url.host,'database.test');
    const custom=url.pathname.endsWith('personalizados_orders');
    const row=custom ? {id:'pers_demo',status:stage,payment:{status:'approved'},vault_files:[{url:'/media/private/personal/film.mp4',type:'video'}]} : {id:'ord_demo',status:payment,pack_id:'album',customer_email:'a@example.test'};
    return Response.json([row]);
  });
  const person='buyer';
  records.set('nua_id:profile:'+person,{id:person,email:'a@example.test',status:'active'});
  const rights=[['ord_demo','pack','album'],['pers_demo','custom','pers_demo']].map(([orderRef,kind,resourceId])=>({orderRef,profileId:person,kind,resourceId}));
  records.set('nua_id:entitlements:'+person,rights);
  for(const r of rights) records.set('nua_id:claim:'+r.orderRef,{profileId:person});
  function jar(){return new Map();}
  async function api(browser,action,extra={}) {
    const request=new Request(origin+'/api/me/cofre',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:[...browser].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify({action,order:'ord_demo',...extra})});
    const response=await handlers['/api/me/cofre'].onRequestPost({env,request});
    for(const cookie of response.headers.getSetCookie()) {
      const [name,value]=cookie.split(';')[0].split('=');
      browser.set(name,value);
    }
    return response.json();
  }
  async function sign(browser,path) {
    const request=new Request(origin+'/api/me/media-url',{method:'POST',headers:{Cookie:[...browser].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify({resourceId:'album',mediaPath:path})});
    return handlers['/api/me/media-url'].onRequestPost({env,request});
  }
  const a=jar(), b=jar();
  assert.equal((await api(a,'open')).state,'confirm');
  assert.equal((await api(a,'request')).state,'sent');
  assert.equal((await api(b,'confirm',{token:proof})).state,'wrongBrowser');
  const attempts=await Promise.all([api(a,'confirm',{token:proof}),api(a,'confirm',{token:proof})]);
  assert.deepEqual(attempts.map(x=>x.state).sort(),['expired','ready']);
  assert.equal((await api(a,'open')).files.length,1);
  assert.equal((await api(a,'resume')).state,'ready');
  await api(a,'close');
  assert.equal((await api(a,'resume')).state,'missing');
  assert.equal((await api(a,'open')).state,'ready');
  assert.equal((await sign(a,'private/album/unlisted.jpg')).status,403);
  assert.equal((await sign(a,'private/photos/primeira.jpg')).status,200);
  records.set('nua_id:order_access_restriction:ord_demo',{reason:'Em revisão'});
  assert.equal((await sign(a,'private/photos/primeira.jpg')).status,403);
  records.delete('nua_id:order_access_restriction:ord_demo');
  assert.equal((await sign(a,'private/photos/primeira.jpg')).status,200);
  const path='private/photos/primeira.jpg';
  const media=await handlers.media.onRequestGet({env,params:{path},request:new Request(origin+'/media/'+path+'?cofre=1')});
  assert.equal(media.status,403);
  for(const [key,value] of records) if(key.startsWith('vault:visit:')) value.seen-=16*60000;
  assert.equal((await sign(a,path)).status,403);
  assert.equal((await api(a,'open')).state,'ready');
  payment='refunded';
  assert.equal((await sign(a,path)).status,403);
  payment='paid';
  rights[0].revokedAt=new Date().toISOString();
  assert.equal((await sign(a,path)).status,403);
  assert.equal((await api(a,'open',{order:'pers_demo'})).files.length,1);
  stage='em_producao';
  assert.notEqual((await api(a,'open',{order:'pers_demo'})).state,'ready');
  delete rights[0].revokedAt;
  await api(b,'request');
  assert.equal((await api(b,'confirm',{token:proof})).state,'ready');
  const {devices}=await api(a,'devices');
  assert.equal(devices.length,2);
  await api(a,'revoke',{id:devices[0].id});
  assert.equal((await api(a,'open')).state,'confirm');
  assert.equal((await api(b,'open')).state,'ready');
});