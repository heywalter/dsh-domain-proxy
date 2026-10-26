import { normalizeConfig } from './config.js';
const own = (object,key) => object && typeof object === 'object' && Object.hasOwn(object,key) ? object[key] : undefined;
function at(value,path) {
  if (!Array.isArray(path) || path.some(x=>typeof x!=='string'||['__proto__','constructor','prototype'].includes(x))) return undefined;
  return path.reduce((v,k)=>own(v,k),value);
}
function hostname(url) {
  if(typeof url!=='string'||url.length>4096)return null;
  try {
    const parsed=new URL(url);
    if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)return null;
    return normalizeConfig({domains:[parsed.hostname]}).domains[0];
  } catch {return null;}
}
// Read only documented endpoint fields. Never return credentials, full URLs,
// paths, environment values, settings blobs, or provider errors.
export function providerChoices(directory=[],namespaces=[],active=[]) {
  const settings=new Map(namespaces.map(x=>[x.ns,x.value]));
  const running=new Set(active.map(x=>x.id));
  const providers=new Map();
  for(const entry of directory) {
    if(typeof entry.provider!=='string')continue;
    const config=at(settings.get(entry.settingsNs),entry.settingsPath);
    if(!config&&!running.has(entry.provider))continue;
    const hosts=new Map();
    const explicit=own(config,'baseURL');
    const add=(url,source)=>{const host=hostname(url);if(host&&!hosts.has(host))hosts.set(host,source);};
    if(explicit!==undefined) add(explicit,'configured');
    else if(!entry.baseURLEnv?.length)add(entry.defaultBaseURL,'catalog-default');
    const models=own(config,'models');
    if(Array.isArray(models))for(const model of models)add(own(model,'baseURL'),'model-override');
    providers.set(entry.provider,{provider:entry.provider.slice(0,160),
      label:(typeof entry.displayName==='string'?entry.displayName:entry.provider).slice(0,160),
      hosts:[...hosts].map(([host,source])=>({host,source}))});
  }
  for(const entry of active)if(!providers.has(entry.id)&&typeof entry.id==='string')
    providers.set(entry.id,{provider:entry.id.slice(0,160),label:String(entry.name??entry.id).slice(0,160),hosts:[]});
  return [...providers.values()].sort((a,b)=>a.label.localeCompare(b.label));
}
