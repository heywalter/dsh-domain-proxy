import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('artifacts',{recursive:true});
const result=spawnSync('npm',['pack','--json','--pack-destination','artifacts'],{encoding:'utf8'});
if(result.status!==0){console.error(result.stderr);process.exit(result.status??1);}
const info=JSON.parse(result.stdout)[0];
if(info.files.some(x=>/(^|\/)(artifacts|node_modules|\.env|sessions)(\/|$)/.test(x.path)))throw new Error('Unexpected private/runtime file in package.');
await writeFile('artifacts/package-manifest.json',JSON.stringify(info,null,2)+'\n');
const archive='artifacts/'+info.filename;
const sha256=createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile(archive+'.sha256',sha256+'  '+info.filename+'\n');
console.log(archive+'\n'+info.integrity+'\nSHA-256: '+sha256);
