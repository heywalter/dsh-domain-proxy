import https from 'node:https';
import http from 'node:http';
import net from 'node:net';
import {once} from 'node:events';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {Agent,ProxyAgent,getGlobalDispatcher,setGlobalDispatcher} from 'undici';
import {createRuntime} from '../src/router.js';
export async function fixture() {
 const dir=await mkdtemp(join(tmpdir(),'dsh-domain-proxy-test-'));
 try {
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=api.fixture.test','-addext','subjectAltName=DNS:api.fixture.test,DNS:direct.fixture.test','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem')],{stdio:'ignore'});
 } catch(error){await rm(dir,{recursive:true,force:true});throw new Error('Tests require openssl with -addext support.',{cause:error});}
 const key=await readFile(join(dir,'key.pem')),ca=await readFile(join(dir,'cert.pem'));
 const sockets=new Set(),requests=[],connects=[];
 function track(server){server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});}
 const origin=https.createServer({key,cert:ca},(req,res)=>{
  requests.push({host:req.headers.host,path:req.url,authorization:req.headers.authorization});
  if(req.url==='/hang')return;
  if(req.url.startsWith('/redirect-')){
   const host=req.url==='/redirect-away'?'direct.fixture.test':'api.fixture.test';
   res.writeHead(302,{location:'https://'+host+':'+origin.address().port+'/final'});return res.end();
  }
  if(req.url==='/stream'||req.url==='/slow'){
   res.writeHead(200,{'content-type':'text/event-stream'});let i=0;
   const interval=setInterval(()=>{res.write('data: '+i+'\n\n');if(++i===12){clearInterval(interval);res.end();}},req.url==='/slow'?40:5);
   res.on('close',()=>clearInterval(interval));return;
  }
  res.writeHead(200);res.end('fixture-ok');
 });track(origin);origin.listen(0,'127.0.0.1');await once(origin,'listening');
 const proxy=http.createServer((req,res)=>{res.writeHead(405);res.end();});track(proxy);
 proxy.on('connect',(req,client,head)=>{
  connects.push(req.url);
  if(!/^(api|direct)\.fixture\.test:\d+$/.test(req.url)){client.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
  const upstream=net.connect(origin.address().port,'127.0.0.1',()=>{
   client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
   if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);
  });sockets.add(upstream);upstream.on('close',()=>sockets.delete(upstream));
  upstream.on('error',()=>client.destroy());client.on('error',()=>upstream.destroy());client.on('close',()=>upstream.destroy());
 });proxy.listen(0,'127.0.0.1');await once(proxy,'listening');
 const original=getGlobalDispatcher();
 const direct=new Agent({connect:{ca,lookup:(hostname,options,callback)=> options.all?callback(null,[{address:'127.0.0.1',family:4}]):callback(null,'127.0.0.1',4)}});
 setGlobalDispatcher(direct);
 const config={enabled:true,proxyUrl:'http://127.0.0.1:'+proxy.address().port,domains:['api.fixture.test']};
 let runtime;
 return {
  config,requests,connects,origin,proxy,direct,ca,
  url:(path='/',host='api.fixture.test')=>'https://'+host+':'+origin.address().port+path,
  runtime(options={}){runtime=createRuntime(config,{makeProxy:url=>new ProxyAgent({uri:url,requestTls:{ca}}),...options});return runtime;},
  async close(){await runtime?.close({forceAfterMs:100});setGlobalDispatcher(original);await direct.destroy();for(const s of sockets)s.destroy();await Promise.all([new Promise(r=>origin.close(r)),new Promise(r=>proxy.close(r))]);await rm(dir,{recursive:true,force:true});}
 };
}
