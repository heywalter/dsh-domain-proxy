import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObserver, observeDispatch } from '../src/observation.js';
import { fixture } from './fixture.js';
const config={domains:['api.fixture.test'],includeSubdomains:false,proxyUrl:'http://127.0.0.1:7890'};
const consume=async stream=>{const out=[];for await(const c of stream)out.push(c);return out;};
test('opt-in, exact pass-through, metadata privacy, missing usage stays unknown',async()=>{
 const o=createObserver();const chunks=[{type:'text-delta',text:'PRIVATE-ANSWER'},{type:'finish',reason:{kind:'stop'}}];
 const next=()=> (async function*(){yield* chunks;})();
 assert.deepEqual(await consume(o.wrap({provider:'fixture',model:'model'},next,1)),chunks);
 assert.equal(o.snapshot().records.length,0);
 o.configure(true);
 const out=await consume(o.wrap({provider:'fixture',model:'model',messages:['PRIVATE-PROMPT']},next,1));
 assert.equal(out[0],chunks[0]);const row=o.snapshot().records[0];
 assert.equal(row.outputTokens,null);assert.equal(row.retries,null);assert.equal(row.maxContentGapMs,null);
 assert.equal(row.routes.length,0);assert.equal(row.status,'completed');
 assert.ok(!JSON.stringify(row).includes('PRIVATE'));
});
test('timing uses content arrival and block span; usage and structured outcome retained',async()=>{
 let time=0;const o=createObserver({clock:()=>time,wall:()=> 'fixture'});o.configure(true);
 await consume(o.wrap({provider:'p',model:'m'},()=> (async function*(){
  time=100;yield {type:'block-start'};
  time=150;yield {type:'reasoning-delta',text:'secret'};
  time=250;yield {type:'tool-call-delta',argumentsDelta:'secret'};
  time=600;yield {type:'block-end',block:{text:'secret'}};
  time=650;yield {type:'usage',usage:{inputTokens:5,outputTokens:50,cacheReadTokens:0}};
  time=700;yield {type:'finish',reason:{kind:'tool-calls'}};
 })(),3));
 const r=o.snapshot().records[0];
 assert.equal(r.ttfcMs,150);assert.equal(r.maxContentGapMs,100);
 assert.equal(r.streamMs,500);assert.equal(r.streamTps,100);assert.equal(r.totalMs,700);
 assert.equal(r.inputTokens,5);assert.equal(r.cacheReadTokens,0);assert.equal(r.cacheWriteTokens,null);
 assert.equal(r.generation,3);
});
test('concurrent real proxy/original requests correlate independently; outer scope does not leak',async t=>{
 const f=await fixture();t.after(()=>f.close());f.runtime();
 const o=createObserver();o.configure(true);
 const call=(model,host)=>o.wrap({provider:'fixture',model},()=> (async function*(){
  await (await fetch(f.url('/stream',host))).text();
  yield {type:'finish',reason:{kind:'stop'}};
 })(),1);
 await Promise.all([consume(call('proxied','api.fixture.test')),consume(call('original','direct.fixture.test'))]);
 observeDispatch('https://unrelated.test/path?secret=1',config,true,1);
 const rows=o.snapshot().records;
 assert.equal(rows.find(x=>x.model==='proxied').routes[0].path,'proxy-dispatch');
 assert.equal(rows.find(x=>x.model==='original').routes[0].path,'original-dispatch');
 assert.ok(rows.every(x=>x.routes.length===1));
 assert.ok(!JSON.stringify(rows).includes('secret'));
});
test('cancellation closes underlying generator and clearing prevents late resurrection',async()=>{
 const o=createObserver();o.configure(true);let closed=false;
 const stream=o.wrap({provider:'p',model:'m'},()=> (async function*(){
  try { observeDispatch('https://api.fixture.test/private?token=secret',config,true,1);yield {type:'text-delta',text:'x'}; }
  finally {closed=true;}
 })(),1);
 await stream.next();await stream.return();assert.equal(closed,true);
 assert.equal(o.snapshot().records[0].status,'aborted');
 assert.equal(o.snapshot().records[0].routes[0].host,'api.fixture.test');
 const active=o.wrap({},()=> (async function*(){yield {type:'text-delta',text:'x'};yield {type:'finish',reason:{kind:'stop'}};})(),1);
 await active.next();o.clear();await active.next();await active.next();assert.equal(o.snapshot().records.length,0);
});
test('errors preserve identity and redact messages; capacity and off clear records',async()=>{
 const o=createObserver({limit:2});o.configure(true);const error=new Error('secret-token');
 await assert.rejects(consume(o.wrap({},()=> (async function*(){throw error;})(),1)),e=>e===error);
 assert.equal(o.snapshot().records[0].status,'failed');assert.ok(!JSON.stringify(o.snapshot()).includes('secret'));
 for(let i=0;i<3;i++)await consume(o.wrap({},()=> (async function*(){yield {type:'finish',reason:{kind:'error',failure:{code:'AUTH',message:'secret'}}};})(),1));
 assert.equal(o.snapshot().records.length,2);assert.equal(o.snapshot().records[0].errorCode,'AUTH');
 o.configure(false);assert.equal(o.snapshot().records.length,0);
});
