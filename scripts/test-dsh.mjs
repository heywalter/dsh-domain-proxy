import {spawn,spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdtemp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(join(root,'artifacts'),{recursive:true});
const home=await mkdtemp(join(root,'artifacts/host-smoke-'));
const exe=process.env.DSH_TEST_EXECUTABLE??'/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
const cli=process.env.DSH_TEST_CLI??'/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js';
const base=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(PROXY|TOKEN|SECRET|PASSWORD|API_KEY)/i.test(k)));
const env={...base,DSH_HOME:home,ELECTRON_RUN_AS_NODE:'1',DSH_TELEMETRY_DISABLED:'1',DSH_TELEMETRY_MODE:'DISABLED'};
const evidence={runtime:'DSH 0.2.1-rc.3',at:new Date().toISOString(),checks:[]};
function command(args,install=false){
 const result=spawnSync(exe,[cli,...args],{env:install?{...env,...(process.env.HTTPS_PROXY?{HTTPS_PROXY:process.env.HTTPS_PROXY}:{})}:env,encoding:'utf8',timeout:120000});
 assert.equal(result.status,0,'DSH command failed: '+args.slice(0,3).join(' ')+' '+(result.stderr??'').replace(/https?:\/\/\S+/g,'[URL omitted]').slice(-600));
 return result.stdout;
}
const pack=spawnSync('npm',['pack','--json','--pack-destination','artifacts'],{cwd:root,encoding:'utf8'});
assert.equal(pack.status,0);
const info=JSON.parse(pack.stdout)[0],tar=join(root,'artifacts',info.filename);
evidence.package={filename:info.filename,integrity:info.integrity,files:info.files.map(x=>x.path)};
assert.ok(evidence.package.files.every(p=>!/(^|\/)(artifacts|node_modules|\.env|sessions)(\/|$)/.test(p)));
command(['--profile','web','--help']);
const patch=join(home,'profiles/web/cordis.patch.yml');
await writeFile(patch,(await readFile(patch,'utf8'))+'\n# preserve-user-comment\n');
command(['plugin','--profile','web','add',tar,'--ignore-scripts'],true);
evidence.checks.push('real tarball installed through official DSH plugin CLI');
// Register a synthetic adapter inside the real host. Its network requests stay
// local (one direct fixture endpoint and one deliberately closed local proxy).
const fixtureFile=join(home,'profiles/web/observation-fixture.mjs');
const llmModule=cli.replace('/dsh/lib/bin.js','/dsh-llm/lib/index.js');
await writeFile(fixtureFile,'import {LlmAdapter} from '+JSON.stringify(pathToFileURL(llmModule).href)+';\n'+await readFile(join(root,'scripts/observation-fixture.txt'),'utf8'));
await writeFile(patch,(await readFile(patch,'utf8')).replace(/^\[\]\s*$/m,'')+'\n- insert:\n    - id: observation-fixture\n      name: ./observation-fixture.mjs\n');

let child;
async function stop(){
 if(!child||child.exitCode!==null)return;
 const p=child;child=undefined;
 await new Promise(resolve=>{
  const timer=setTimeout(()=>p.kill('SIGKILL'),3000);
  p.once('exit',()=>{clearTimeout(timer);resolve();});p.kill('SIGTERM');
 });
}
async function boot(){
 child=spawn(exe,[cli,'--profile','web','--no-open','--host','127.0.0.1','--port','0'],{env,stdio:['ignore','pipe','pipe']});
 let bootError=''; child.stderr.on('data',chunk=>{bootError=(bootError+String(chunk)).slice(-5000);});
 return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('DSH boot timeout')),20000);
  const lines=createInterface({input:child.stdout});
  lines.on('line',line=>{const found=line.match(/https?:\/\/[^\s\u001b]+/);if(found){clearTimeout(timer);resolve(new URL(found[0]).origin);}});
  child.once('exit',code=>{clearTimeout(timer);reject(new Error('DSH exited before ready: '+code+' '+bootError.replace(/https?:\/\/\S+/g,'[URL omitted]')));});
 });
}
let origin;
async function api(body,headers={}){
 const r=await fetch(origin+'/domain-proxy/api',{method:body?'POST':'GET',headers:{'x-dsh-domain-proxy':'1',...(body?{'content-type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 return {status:r.status,data:await r.json()};
}
try{
 origin=await boot();
 let s=await api();assert.equal(s.status,200);assert.equal(s.data.active,false);
 assert.equal((await api(undefined,{'x-dsh-domain-proxy':''})).status,403);
 assert.equal((await api(undefined,{origin:'https://untrusted.example'})).status,403);
 const initial=s.data;
 let saved=await api({action:'save',revision:initial.revision,config:{...initial.config,domains:['api.fixture.test'],enabled:true}});
 assert.equal(saved.status,200);assert.equal(saved.data.active,true);
 const stale=await api({action:'save',revision:initial.revision,config:initial.config});
 assert.notEqual(stale.status,200);assert.equal((await api()).data.active,true);
 const bad=await api({action:'save',revision:saved.data.revision,config:{...saved.data.config,proxyUrl:'http://user:fixture-secret@127.0.0.1:7890'}});
 assert.equal(bad.status,400);assert.ok(!JSON.stringify(bad).includes('fixture-secret'));
 s=await api();const off=await api({action:'save',revision:s.data.revision,config:{...s.data.config,enabled:false}});
 assert.equal(off.data.active,false);
 s=await api();await api({action:'save',revision:s.data.revision,config:{...s.data.config,enabled:true}});
 evidence.checks.push('native volatile settings: enable, disable, stale revision, invalid config and source guards');
 s=await api();const generation=s.data.generation;
 s=await api({action:'save',revision:s.data.revision,config:{...s.data.config,recording:true}});
 assert.equal(s.data.generation,generation,'recording must not reset network routing');
 s=await api({action:'save',revision:s.data.revision,config:{...s.data.config,domains:['route.fixture.invalid'],proxyUrl:'http://127.0.0.1:9'}});
 const ran=await fetch(origin+'/observation-fixture-run',{headers:{'x-observation-fixture':'1'},signal:AbortSignal.timeout(10000)});
 assert.equal(await ran.text(),'done');
 s=await api();const records=s.data.observation.records;
 assert.ok(s.data.providers.items.some(p=>p.provider==='observation-fixture'&&p.hosts[0]?.host==='fixture.example.com'));
 assert.equal(records.length,2,JSON.stringify(records));
 const direct=records.find(r=>r.model==='original'),proxy=records.find(r=>r.model==='proxy');
 assert.equal(direct.status,'completed');assert.equal(direct.outputTokens,8);assert.ok(direct.ttfcMs>=0);
 assert.equal(direct.routes[0].path,'original-dispatch');
 assert.equal(proxy.status,'failed');assert.equal(proxy.routes[0].path,'proxy-dispatch');
 assert.equal(proxy.routes[0].matchedRule,'route.fixture.invalid');
 assert.ok(!JSON.stringify(s.data).includes('fixture-only-private'));
 assert.equal(direct.retries,null);
 await api({action:'clear-records'});assert.equal((await api()).data.observation.records.length,0);
 evidence.checks.push('real LLM waterfall: concurrent adapter calls, route attribution, usage, failure, privacy and clear');

 await stop();origin=await boot();s=await api();assert.equal(s.data.active,true);assert.equal(s.data.observation.records.length,0);assert.equal(s.data.observation.enabled,true);
 evidence.checks.push('enabled configuration persists across a real DSH restart');
 await stop();
 command(['plugin','--profile','web','remove','dsh-domain-proxy'],true);
 const manifest=JSON.parse(await readFile(join(home,'profiles/web/package.json'),'utf8'));
 assert.ok(!manifest.dependencies?.['dsh-domain-proxy']);
 assert.ok(!manifest.dsh.profile.bundles.includes('dsh-domain-proxy'));
 assert.ok((await readFile(patch,'utf8')).includes('preserve-user-comment'));
 evidence.checks.push('uninstall removes bundle/dependency and preserves unrelated profile comment');
 evidence.retainedUserOverride=(await readFile(patch,'utf8')).includes('domain-proxy');
 evidence.passed=true;
 await writeFile(join(root,'artifacts/dsh-smoke.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log(JSON.stringify(evidence,null,2));
}finally{await stop();}
