import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createInterface} from 'node:readline';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const home=resolve(root,'artifacts/dsh-home');
await mkdir(home,{recursive:true});
const executable=process.env.DSH_TEST_EXECUTABLE??'/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
const cli=process.env.DSH_TEST_CLI??'/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js';
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(PROXY|TOKEN|SECRET|PASSWORD|API_KEY)/i.test(k)));
Object.assign(env,{DSH_HOME:home,ELECTRON_RUN_AS_NODE:'1',DSH_TELEMETRY_DISABLED:'1',DSH_TELEMETRY_MODE:'DISABLED'});
const child=spawn(executable,[cli,'--profile','web','--no-open','--host','127.0.0.1','--port','0'],{env,stdio:['ignore','pipe','pipe']});
await writeFile(resolve(root,'artifacts/web.pid'),String(child.pid));
child.stderr.on('data',data=>{const line=String(data);if(/error|failed/i.test(line))console.error(line.replace(/https?:\/\/\S+/g,'[URL omitted]'));});
let gateway;
for (const signal of ['SIGTERM','SIGINT']) process.once(signal,()=>{gateway?.close();child.kill(signal);});
for await(const line of createInterface({input:child.stdout})) {
 const found=line.match(/https?:\/\/[^\s\u001b]+/);
 if(!found){if(/error|failed/i.test(line))console.log(line);continue;}
 if(gateway)continue;
 const login=new URL(found[0]);
 if(login.hostname!=='127.0.0.1')throw new Error('Preview must bind loopback.');
 await writeFile(resolve(root,'artifacts/web.port'),login.port);
 // The ephemeral DSH login token stays in this process. Deliver its session
 // cookie through a one-use loopback bootstrap, without putting the token into
 // tool output, files, screenshots or browser navigation history.
 const reply=await fetch(login,{redirect:'manual'});
 const cookies=reply.headers.getSetCookie();
 if(!cookies.length)throw new Error('DSH did not issue a local preview cookie.');
 gateway=createServer((req,res)=>{
  if(req.url!=='/bootstrap'||req.socket.remoteAddress!=='127.0.0.1'){res.writeHead(404);res.end();return;}
  res.writeHead(302,{'set-cookie':cookies,location:login.origin+'/', 'cache-control':'no-store'});
  res.end();gateway.close();
 });
 gateway.listen(0,'127.0.0.1',()=>console.log('PREVIEW_BOOTSTRAP=http://127.0.0.1:'+gateway.address().port+'/bootstrap'));
 console.log('DSH_PREVIEW='+login.origin);
}
gateway?.close();
process.exitCode=await new Promise(resolve=>{if(child.exitCode!==null)resolve(child.exitCode);else child.once('exit',resolve);});
