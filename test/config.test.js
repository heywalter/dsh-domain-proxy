import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfig,matches,ambientProxyNames} from '../src/config.js';
import {trusted} from '../src/http.js';
test('defaults are disabled, precise and loopback-only',()=> {
 assert.throws(()=>normalizeConfig(JSON.parse('{"constructor":1}')));
 const c=normalizeConfig(); assert.equal(c.enabled,false); assert.equal(c.includeSubdomains,false);
 assert.deepEqual(c.domains,[]);assert.equal(matches('https://amr-link.open-design.ai/v1',c),false);
 assert.throws(()=>normalizeConfig({enabled:true}),/hostnames/);
 assert.equal(matches('https://other.open-design.ai',c),false);
});
test('normalizes IDNA, case and trailing dot; suffix is dot-boundary only',()=>{
 const c=normalizeConfig({domains:['API.Example.COM.','api.example.com','例子.测试'],includeSubdomains:true});
 assert.equal(c.domains.length,2);assert.ok(c.domains[1].startsWith('xn--'));
 for(const host of ['api.example.com','child.api.example.com']) assert.equal(matches('https://'+host,c),true);
 for(const host of ['evilapi.example.com','api.example.com.evil.test','localhost']) assert.equal(matches('https://'+host,c),false);
});
test('rejects invalid domains and proxies without reflecting credentials',()=>{
 for(const domain of ['*','https://api.example.com','api.example.com:443','127.0.0.1','a..test','bad host.test','user@api.test']) assert.throws(()=>normalizeConfig({domains:[domain]}));
 for(const proxyUrl of ['socks5://127.0.0.1:7890','http://remote.example:7890','http://user:private-secret@127.0.0.1:7890','http://127.0.0.1:7890/path','not-secret-url']){
  try{normalizeConfig({proxyUrl});assert.fail('accepted');}catch(e){assert.ok(!e.message.includes('private-secret'));assert.ok(!e.message.includes('not-secret-url'));}
 }
 assert.deepEqual(ambientProxyNames({HTTPS_PROXY:'http://user:secret@proxy:80'}),['HTTPS_PROXY']);
});
test('local API requires loopback host, custom header, and no cross-site origin',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:8000','x-dsh-domain-proxy':'1'}};
 assert.equal(trusted(req),true);
 assert.equal(trusted({...req,headers:{...req.headers,origin:'http://127.0.0.1:8000'}}),true);
 for(const patch of [{origin:'https://evil.example'},{host:'evil.example:8000'},{host:'127.0.0.1:8000#fragment'},{'x-dsh-domain-proxy':undefined},{'sec-fetch-site':'cross-site'}]) assert.equal(trusted({...req,headers:{...req.headers,...patch}}),false);
 assert.equal(trusted({...req,socket:{remoteAddress:'192.0.2.10'}}),false);
});

test('proxy scheme and port are configurable for loopback HTTP(S) listeners',()=>{
 for(const proxyUrl of ['http://127.0.0.1:7897','http://localhost:8080','https://127.0.0.1:8443','http://[::1]:8080']) {
  assert.equal(normalizeConfig({proxyUrl}).proxyUrl,proxyUrl);
 }
 for(const proxyUrl of ['socks5://127.0.0.1:1080','http://192.168.1.2:7890','https://user:secret@localhost:8443'])assert.throws(()=>normalizeConfig({proxyUrl}));
});
