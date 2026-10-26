import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Dispatcher,getGlobalDispatcher,setGlobalDispatcher,ProxyAgent} from 'undici';
import {fixture} from './fixture.js';
import {createRuntime,DomainDispatcher} from '../src/router.js';
test('real CONNECT + verified TLS + SSE; concurrent non-target requests stay on original route',async t=>{
 const f=await fixture();t.after(()=>f.close());const r=f.runtime();
 const results=await Promise.all(Array.from({length:8},(_,i)=>fetch(f.url('/stream',i%2?'direct.fixture.test':'api.fixture.test')).then(x=>x.text())));
 assert.ok(results.every(x=>x.includes('data: 11')));
 assert.ok(f.connects.length>0);assert.ok(f.connects.every(x=>x.startsWith('api.fixture.test:')));
 assert.deepEqual(r.snapshot().counts,{proxyAttempts:4,originalAttempts:4});
});
test('redirects re-check domains in both directions and preserve Fetch auth stripping',async t=>{
 const f=await fixture();t.after(()=>f.close());f.runtime();
 assert.equal(await (await fetch(f.url('/redirect-away'),{headers:{authorization:'test-fixture-only'}})).text(),'fixture-ok');
 assert.equal(f.requests.at(-1).authorization,undefined);
 assert.equal(await (await fetch(f.url('/redirect-to','direct.fixture.test'))).text(),'fixture-ok');
 assert.ok(f.connects.every(x=>x.startsWith('api.fixture.test:')));
 assert.ok(f.requests.some(x=>x.host.startsWith('direct.fixture.test')));
});
test('proxy failure never falls back; other targets still work',async t=>{
 const f=await fixture();t.after(()=>f.close());const r=f.runtime();
 await new Promise(resolve=>f.proxy.close(resolve));
 await assert.rejects(fetch(f.url(),{signal:AbortSignal.timeout(2000)}));
 assert.equal(f.requests.length,0);
 assert.equal(await (await fetch(f.url('/','direct.fixture.test'))).text(),'fixture-ok');
 assert.equal(r.snapshot().counts.proxyAttempts,1);
});
test('disable while streaming drains owned connections and restores the original path',async t=>{
 const f=await fixture();t.after(()=>f.close());const r=f.runtime();
 const response=await fetch(f.url('/slow'));const reader=response.body.getReader();let total=(await reader.read()).value.length;
 r.configure({...f.config,enabled:false});assert.equal(r.snapshot().active,false);assert.equal(getGlobalDispatcher(),f.direct);
 for(;;){const next=await reader.read();if(next.done)break;total+=next.value.length;}
 assert.ok(total>90);assert.equal(await (await fetch(f.url())).text(),'fixture-ok');
});
test('abort during header wait and output releases requests',async t=>{
 const f=await fixture();t.after(()=>f.close());f.runtime();
 await assert.rejects(fetch(f.url('/hang'),{signal:AbortSignal.timeout(100)}));
 const response=await fetch(f.url('/slow'));const reader=response.body.getReader();await reader.read();await reader.cancel();
});
test('TLS certificate errors remain errors; validation is not disabled',async t=>{
 const f=await fixture();t.after(()=>f.close());f.runtime({makeProxy:url=>new ProxyAgent(url)});
 await assert.rejects(fetch(f.url()),error=>/CERT|SELF_SIGNED/.test(error.cause?.code||''));
});
test('singleton and out-of-order unload leave a harmless pass-through reference',async t=>{
 const f=await fixture();t.after(()=>f.close());const r=f.runtime();const a=getGlobalDispatcher();
 assert.throws(()=>createRuntime(f.config),/DUPLICATE/);
 class Other extends Dispatcher {dispatch(options,handler){return a.dispatch(options,handler);}}
 const b=new Other();setGlobalDispatcher(b);
 assert.equal(r.snapshot().conflict,true);
 assert.throws(()=>r.configure(f.config),/CONFLICT/);
 await r.close();assert.equal(getGlobalDispatcher(),b);
 assert.equal(await (await fetch(f.url())).text(),'fixture-ok');
 setGlobalDispatcher(a);assert.equal(await (await fetch(f.url())).text(),'fixture-ok');
 assert.equal(f.connects.length,0);
});
test('dispatcher close/destroy support promise and callbacks without owning original',async()=>{
 let originalClosed=0,proxyClosed=0,proxyDestroyed=0;
 const original={close(){originalClosed++;},destroy(){originalClosed++;}};
 const proxy={close:async()=>{proxyClosed++;},destroy:async()=>{proxyDestroyed++;}};
 const router=new DomainDispatcher(original,proxy,{domains:[]});
 await new Promise((resolve,reject)=>router.close(e=>e?reject(e):resolve()));
 await router.close();await new Promise((resolve,reject)=>router.destroy(e=>e?reject(e):resolve()));
 assert.equal(proxyClosed,1);assert.equal(proxyDestroyed,1);assert.equal(originalClosed,0);
 await new Promise(resolve=>router.dispatch({origin:'https://api.fixture.test'},{onError:error=>{assert.ok(error);resolve();}}));
});

test('failed owned-pool close is destroyed and never closes the inherited route',async()=>{
 const previous=getGlobalDispatcher();let destroyed=0;
 const runtime=createRuntime({enabled:true,domains:['api.fixture.test']},{makeProxy:()=>({dispatch(){return true;},close:async()=>{throw new Error('fixture close failure');},destroy:async()=>{destroyed++;}})});
 await runtime.close();assert.equal(destroyed,1);assert.equal(getGlobalDispatcher(),previous);
});
test('invalid initial config releases singleton; invalid update preserves active route',async()=>{
 assert.throws(()=>createRuntime({proxyUrl:'socks5://127.0.0.1:7890'}));
 const runtime=createRuntime({enabled:true,domains:['api.fixture.test']});
 try {
  const active=getGlobalDispatcher(),before=runtime.snapshot().config;
  assert.throws(()=>runtime.configure({enabled:true,domains:['*']}));
  assert.equal(getGlobalDispatcher(),active);assert.deepEqual(runtime.snapshot().config,before);
 }finally{await runtime.close();}
});
