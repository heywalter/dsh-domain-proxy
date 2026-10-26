import {test} from 'node:test';
import assert from 'node:assert/strict';
import {providerChoices} from '../src/providers.js';
test('configured endpoints and per-model overrides produce host-only deduplicated choices',()=>{
 const directory=[{provider:'custom',displayName:'Custom',settingsNs:'models',settingsPath:['providers','custom']}];
 const namespaces=[{ns:'models',value:{providers:{custom:{apiKey:'private-key',headers:{authorization:'private-header'},
   baseURL:'https://API.EXAMPLE.COM:8443/v1?key=private-query',
   models:[{baseURL:'https://api.example.com/v2'},{baseURL:'https://second.example.com/v1'}]}}}}];
 const got=providerChoices(directory,namespaces);
 assert.deepEqual(got,[{provider:'custom',label:'Custom',hosts:[{host:'api.example.com',source:'configured'},{host:'second.example.com',source:'model-override'}]}]);
 assert.ok(!JSON.stringify(got).includes('private'));
});
test('dormant catalog is omitted; configured/active default and unknown env handled conservatively',()=>{
 const directory=[
  {provider:'unused',displayName:'Unused',settingsNs:'s',settingsPath:['providers','unused'],defaultBaseURL:'https://unused.test'},
  {provider:'ready',displayName:'Ready',settingsNs:'s',settingsPath:['providers','ready'],defaultBaseURL:'https://ready.test'},
  {provider:'env',displayName:'Env',settingsNs:'s',settingsPath:['providers','env'],defaultBaseURL:'https://wrong.test',baseURLEnv:['URL']},
 ];
 const got=providerChoices(directory,[{ns:'s',value:{providers:{ready:{},env:{}}}}],[{id:'unknown',name:'Unknown'}]);
 assert.equal(got.length,3);assert.equal(got.find(x=>x.provider==='ready').hosts[0].host,'ready.test');
 assert.deepEqual(got.find(x=>x.provider==='env').hosts,[]);assert.deepEqual(got.find(x=>x.provider==='unknown').hosts,[]);
});
test('rejects credential URLs, IP hosts, unsafe paths, malformed explicit URLs; never falls back over explicit value',()=>{
 for(const baseURL of ['https://user:secret@api.test','http://127.0.0.1:8000','not-a-url','https://<redacted>']){
  const got=providerChoices([{provider:'p',displayName:'P',settingsNs:'s',settingsPath:[],defaultBaseURL:'https://wrong.test'}],[{ns:'s',value:{baseURL}}]);
  assert.deepEqual(got[0].hosts,[]);
 }
 const got=providerChoices([{provider:'p',displayName:'P',settingsNs:'s',settingsPath:['__proto__']}],[{ns:'s',value:{}}]);
 assert.deepEqual(got,[]);
});
test('shared host keeps provider identities so UI can explain shared domain routing',()=>{
 const got=providerChoices(['a','b'].map(provider=>({provider,displayName:provider,settingsNs:provider,settingsPath:[]})),
 ['a','b'].map(ns=>({ns,value:{baseURL:'https://shared.example/v1'}})));
 assert.equal(got.length,2);assert.equal(got[0].hosts[0].host,got[1].hosts[0].host);
});
