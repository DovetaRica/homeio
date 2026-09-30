import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {appendFile,mkdir,readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
type Intent = {method:string; args:unknown[]; userId:string; sessionId:string; expires:number; target:string};
const root=()=>path.join(process.env.HOMEIO_STATE_DIR??'/state','nas-operations');
function key(){const secret=process.env.AUTH_SESSION_SECRET;if(!secret || secret.length<32)throw new Error('Session secret is not configured');return createHash('sha256').update(secret).digest();}
export async function createIntent(intent: Omit<Intent,'expires'>) {
  await mkdir(root(),{recursive:true,mode:0o700});
  const token=randomBytes(24).toString('hex');const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key(),iv);
  const encrypted=Buffer.concat([cipher.update(JSON.stringify({...intent,expires:Date.now()+180000})),cipher.final()]);
  await writeFile(path.join(root(),token+'.json'),JSON.stringify({iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex'),data:encrypted.toString('hex')}),{flag:'wx',mode:0o600});
  return token;
}
export async function consumeIntent(token:string,userId:string,sessionId:string):Promise<Intent> {
  if(!/^[a-f0-9]{48}$/.test(token))throw new Error('Invalid confirmation');
  const file=path.join(root(),token+'.json');const saved=JSON.parse(await readFile(file,'utf8'));
  const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(saved.iv,'hex'));decipher.setAuthTag(Buffer.from(saved.tag,'hex'));
  const intent=JSON.parse(Buffer.concat([decipher.update(Buffer.from(saved.data,'hex')),decipher.final()]).toString()) as Intent;
  if(intent.expires<Date.now()||intent.userId!==userId||intent.sessionId!==sessionId)throw new Error('Confirmation expired; review the operation again');
  // Exclusive creation is atomic across concurrent requests/processes. Never retry a consumed mutation.
  await writeFile(path.join(root(),token+'.used'),'used',{flag:'wx',mode:0o600});
  await unlink(file);
  return intent;
}
export async function audit(entry:Record<string,unknown>) {
  await mkdir(root(),{recursive:true,mode:0o700});
  await appendFile(path.join(root(),'audit.jsonl'),JSON.stringify({at:new Date().toISOString(),...entry})+'\n',{mode:0o600});
}
export async function recentAudit() {
  try{return (await readFile(path.join(root(),'audit.jsonl'),'utf8')).trim().split('\n').slice(-100).filter(Boolean).map(x=>JSON.parse(x));}catch{return [];}
}
export async function pruneIntents() {
  // Intent files contain their expiry only inside encrypted data. Remove old files by mtime.
  const {stat}=await import('node:fs/promises');
  for(const name of await readdir(root()).catch(()=>[])) {
    if(!/^[a-f0-9]{48}\.(json|used)$/.test(name))continue;
    const file=path.join(root(),name);const info=await stat(file).catch(()=>null);
    if(info && info.mtimeMs<Date.now()-3600000)await unlink(file).catch(()=>{});
  }
}
