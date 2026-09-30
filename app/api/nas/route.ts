import {NextResponse} from 'next/server';
import {requireApiSession} from '@/lib/server/modules/auth/api';
import {verifyPassword} from '@/lib/server/modules/auth/password';
import {nasBatch,nasCall} from '@/lib/server/modules/truenas/client';
import {operation,sameOrigin,targetOf,validateOperation} from '@/lib/server/modules/truenas/policy';
import {audit,consumeIntent,createIntent,pruneIntents,recentAudit} from '@/lib/server/modules/truenas/intents';
import {redact} from '@/modules/nas/schema';
import catalog from '@/modules/nas/catalog.json';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const attempts=new Map<string,{count:number;until:number}>();
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function authorize(request:Request) {
  const auth=await requireApiSession(request);
  if(auth.response)return auth;
  const admins=(process.env.TRUENAS_ADMIN_USERS??'').split(',').map(x=>x.trim());
  if(!admins.includes(auth.session.username))return {session:null,response:json({error:'TrueNAS administrator access required'},403)};
  if(!process.env.TRUENAS_CONFIG_FILE)return {session:null,response:json({error:'TrueNAS connection is not configured'},503)};
  return auth;
}
export async function GET(request:Request) {
  const auth=await authorize(request);if(auth.response)return auth.response;
  try {
    const url=new URL(request.url);const resource=url.searchParams.get('resource')??'overview';
    if(resource==='audit')return json({data:await recentAudit()});
    if(resource==='overview') {
      const names=['system.info','pool.query','app.query','alert.list','interface.checkin_waiting'];
      const results=await nasBatch(names.map(method=>({method})));
      return json({data:redact(Object.fromEntries(names.map((n,i)=>[n,results[i]]))),at:new Date().toISOString()});
    }
    if(resource==='acl') {
      const target=url.searchParams.get('path')??'';
      if(!target.startsWith('/mnt/')||target.split('/').includes('..'))return json({error:'Choose a dataset path'},400);
      return json({data:redact(await nasCall('filesystem.getacl',[target,true,true]))});
    }
    const definition=catalog.resources.find(x=>x.id===resource);if(!definition)return json({error:'Unknown resource'},404);
    let params:unknown[]=[];
    if(resource==='datasets')params=[[],{extra:{flat:true,retrieve_children:true}}];
    if(resource==='snapshots')params=[[],{limit:200}];
    if(resource==='jobs')params=[[],{limit:100,order_by:['-id']}];
    if(resource==='users'||resource==='groups')params=[[['builtin','=',false]]];
    return json({data:redact(await nasCall(definition.query,params)),limit:resource==='snapshots'?200:resource==='jobs'?100:null,at:new Date().toISOString()});
  }catch(error){return json({error:error instanceof Error?error.message:'TrueNAS request failed'},502);}
}
export async function POST(request:Request) {
  const auth=await authorize(request);if(auth.response)return auth.response;
  if(!sameOrigin(request))return json({error:'Same-origin request required'},403);
  const raw=await request.text();if(raw.length>262144)return json({error:'Request too large'},413);
  try {
    const body=JSON.parse(raw);
    if(body.stage==='preview') {
      if(typeof body.method!=='string'||!Array.isArray(body.args))return json({error:'Invalid operation'},400);
      validateOperation(body.method,body.args);
      const target=targetOf(body.args,body.method);const op=operation(body.method);
      const token=await createIntent({method:body.method,args:body.args,target,userId:auth.session.userId,sessionId:auth.session.sessionId});
      await pruneIntents();
      return json({token,target,operation:op.label,changes:redact(body.args),danger:op.danger,expiresIn:180});
    }
    if(body.stage!=='execute'||typeof body.token!=='string'||typeof body.password!=='string'||body.password.length>1024)return json({error:'Invalid confirmation'},400);
    const now=Date.now();const old=attempts.get(auth.session.userId);const rate=old&&old.until>now?old:{count:0,until:now+60000};
    if(++rate.count>5)return json({error:'Too many confirmations; wait one minute'},429);attempts.set(auth.session.userId,rate);
    if(!await verifyPassword(body.password,auth.session.passwordHash))return json({error:'Incorrect Homeio password'},403);
    const intent=await consumeIntent(body.token,auth.session.userId,auth.session.sessionId);
    if(body.confirmation!==intent.target)throw new Error('Confirmation must match the target exactly');
    validateOperation(intent.method,intent.args);
    // Persist intention before sending: a timeout is an uncertain outcome, never an automatic retry.
    await audit({user:auth.session.username,method:intent.method,target:intent.target,status:'submitted'});
    try {
      const result=await nasCall(intent.method,intent.args);const job=operation(intent.method).job;
      await audit({user:auth.session.username,method:intent.method,target:intent.target,status:job?'accepted':'completed',job:job?result:undefined});
      return json({accepted:true,job:job?result:null,result:job?null:redact(result)});
    }catch(error){await audit({user:auth.session.username,method:intent.method,target:intent.target,status:'failed-or-unknown'});throw error;}
  }catch(error){return json({error:error instanceof Error?error.message:'Operation failed'},400);}
}
