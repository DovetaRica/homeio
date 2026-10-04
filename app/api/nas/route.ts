import {NextResponse} from 'next/server';
import {requireApiSession} from '@/lib/server/modules/auth/api';
import {verifyPassword} from '@/lib/server/modules/auth/password';
import {nasBatch,nasCall} from '@/lib/server/modules/truenas/client';
import {operation,sameOrigin,targetOf,validateOperation} from '@/lib/server/modules/truenas/policy';
import {audit,consumeIntent,createIntent,pruneIntents,recentAudit} from '@/lib/server/modules/truenas/intents';
import {assertUnchanged,preparePreview} from '@/lib/server/modules/truenas/preview';
import {jobCountParams,jobPageParams,pageResult,parsePage,snapshotCountParams,snapshotPageParams} from '@/lib/server/modules/truenas/pagination';
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
// User-facing error text is generic and bounded so upstream reasons, config and
// request arguments can never reach the client or logs. Typed client errors are
// matched by name/code so route tests can stub the client module.
const GENERIC:Record<string,string>={
  stale_preview:'The operation target changed; review the operation again',
  transport_error:'TrueNAS is unreachable; check the connection before retrying',
  upstream_rejected:'TrueNAS rejected the request',
  unknown_outcome:'The operation outcome is unknown; verify the result before retrying',
};
function codeOf(error:unknown){return error&&typeof error==='object'&&typeof (error as {code?:unknown}).code==='string'?(error as {code:string}).code:'';}
function nameOf(error:unknown){return error instanceof Error?error.name:'';}
function safeMessage(error:unknown){const text=error instanceof Error?error.message:typeof error==='string'?error:'';return (text.replace(/\s+/g,' ').trim()||'Operation failed').slice(0,300);}
type Failure={status:number;code:string;outcome?:string};
function specific(error:unknown):Failure|null {
  const name=nameOf(error),code=codeOf(error);
  if(name==='StalePreviewError'||code==='stale_preview')return {status:409,code:'stale_preview'};
  if(name==='InvalidQueryError'||code==='invalid_request')return {status:400,code:'invalid_request'};
  if(name==='NasTransportError'||code==='transport_error')return {status:502,code:'transport_error'};
  if(name==='NasRpcError'||code==='upstream_rejected')return {status:502,code:'upstream_rejected',outcome:'rejected'};
  return null;
}
function respond(failure:Failure,error?:unknown){const message=failure.code==='invalid_request'?safeMessage(error):GENERIC[failure.code]??'Operation failed';return json({error:message,code:failure.code,...(failure.outcome?{outcome:failure.outcome}:{})},failure.status);}
// raw_result is not part of the job contract and may carry raw/secret output;
// redact alone does not remove it, so drop it explicitly at any depth.
function withoutRawResult(value:unknown):unknown {
  if(Array.isArray(value))return value.map(withoutRawResult);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([key])=>!/^raw_result$/i.test(key)).map(([key,item])=>[key,withoutRawResult(item)]));
  return value;
}
const OVERVIEW_METHODS=['system.info','pool.query','app.query','alert.list','interface.checkin_waiting'];
export async function GET(request:Request) {
  const auth=await authorize(request);if(auth.response)return auth.response;
  try {
    const url=new URL(request.url);const resource=url.searchParams.get('resource')??'overview';
    if(resource==='audit')return json({data:await recentAudit()});
    if(resource==='overview') {
      const results=await nasBatch(OVERVIEW_METHODS.map(method=>({method})));
      const data:Record<string,unknown>={};const errors:Record<string,string>={};
      OVERVIEW_METHODS.forEach((name,index)=>{
        const result=results[index];
        // TrueNAS returns null when no network rollback is pending.
        const invalidNull=result===null&&name!=='interface.checkin_waiting';
        if(result===undefined||invalidNull||(result!==null&&typeof result==='object'&&'nasError' in result))errors[name]='TrueNAS request failed';
        else data[name]=redact(result);
      });
      // A partial result keeps the section that succeeded and names the failed method.
      if(Object.keys(data).length===0)return json({error:'TrueNAS is unavailable',code:'upstream_rejected',outcome:'rejected'},502);
      return json({data,errors,at:new Date().toISOString()});
    }
    if(resource==='acl') {
      const target=url.searchParams.get('path')??'';
      if(!target.startsWith('/mnt/')||target.split('/').includes('..'))return json({error:'Choose a dataset path',code:'invalid_request'},400);
      return json({data:redact(await nasCall('filesystem.getacl',[target,true,true]))});
    }
    if(resource==='job') {
      const raw=url.searchParams.get('jobId');
      if(raw===null||!/^\d+$/.test(raw)||Number(raw)<1||!Number.isSafeInteger(Number(raw)))return json({error:'Invalid job id',code:'invalid_request'},400);
      try {
        const result=await nasCall('core.get_jobs',[[['id','=',Number(raw)]],{get:true}]);
        const job=Array.isArray(result)?result[0]:result;
        if(job===null||job===undefined||typeof job!=='object')return json({error:'Job not found',code:'not_found'},404);
        return json({data:redact(withoutRawResult(job)),at:new Date().toISOString()});
      }catch(error){
        if(/not found|matchnotfound|no matching query|does not exist|no such|no job/i.test(safeMessage(error)))return json({error:'Job not found',code:'not_found'},404);
        throw error;
      }
    }
    if(resource==='snapshots'||resource==='jobs') {
      // Validate every query parameter before any RPC; only bounded allowlisted
      // filters/orderings are translated for the middleware.
      const page=parsePage(url.searchParams,resource==='snapshots'?200:100);
      const method=resource==='snapshots'?'pool.snapshot.query':'core.get_jobs';
      const pageParams=resource==='snapshots'?snapshotPageParams(page):jobPageParams(page);
      const countParams=resource==='snapshots'?snapshotCountParams(page):jobCountParams(page);
      const [rows,total]=await Promise.all([nasCall(method,pageParams),nasCall(method,countParams)]);
      return json(pageResult(redact(resource==='jobs'?withoutRawResult(rows):rows),total,page));
    }
    const definition=catalog.resources.find(x=>x.id===resource);if(!definition)return json({error:'Unknown resource',code:'not_found'},404);
    let params:unknown[]=[];
    if(resource==='datasets')params=[[],{extra:{flat:true,retrieve_children:true}}];
    if(resource==='users'||resource==='groups')params=[[['builtin','=',false]]];
    return json({data:redact(await nasCall(definition.query,params)),limit:null,at:new Date().toISOString()});
  }catch(error){
    const failure=specific(error);
    if(failure)return respond(failure,error);
    return json({error:'TrueNAS rejected the request',code:'upstream_rejected',outcome:'rejected'},502);
  }
}
export async function POST(request:Request) {
  const auth=await authorize(request);if(auth.response)return auth.response;
  if(!sameOrigin(request))return json({error:'Same-origin request required'},403);
  const raw=await request.text();if(raw.length>262144)return json({error:'Request too large'},413);
  try {
    const body=JSON.parse(raw);
    if(body.stage==='preview') {
      if(typeof body.method!=='string'||!Array.isArray(body.args))return json({error:'Invalid operation',code:'invalid_request'},400);
      validateOperation(body.method,body.args);
      const target=targetOf(body.args,body.method);const op=operation(body.method);
      const preview=await preparePreview(body.method,body.args);
      const token=await createIntent({method:body.method,args:body.args,target,userId:auth.session.userId,sessionId:auth.session.sessionId,baseline:preview.baseline});
      await pruneIntents();
      return json({token,target,operation:op.label,changes:redact(body.args),danger:op.danger,expiresIn:180,diff:preview.diff,previewComplete:preview.previewComplete});
    }
    if(body.stage!=='execute'||typeof body.token!=='string'||typeof body.password!=='string'||body.password.length>1024)return json({error:'Invalid confirmation',code:'invalid_request'},400);
    const now=Date.now();const old=attempts.get(auth.session.userId);const rate=old&&old.until>now?old:{count:0,until:now+60000};
    if(++rate.count>5)return json({error:'Too many confirmations; wait one minute'},429);attempts.set(auth.session.userId,rate);
    if(!await verifyPassword(body.password,auth.session.passwordHash))return json({error:'Incorrect Homeio password'},403);
    const intent=await consumeIntent(body.token,auth.session.userId,auth.session.sessionId);
    if(body.confirmation!==intent.target)throw new Error('Confirmation must match the target exactly');
    validateOperation(intent.method,intent.args);
    // Baseline-bearing intents re-read the approved before-state after the
    // single-use token is consumed and refuse to write when it changed.
    if(intent.baseline) {
      try{await assertUnchanged(intent.method,intent.args,intent.baseline);}
      catch(error){
        const failure=specific(error);
        // An actual change or a definitive rejection is conclusive; any other
        // execute-stage failure stays an unknown, non-retryable outcome.
        if(failure?.code==='stale_preview'||failure?.code==='upstream_rejected')return respond(failure,error);
        return json({error:GENERIC.unknown_outcome,code:'unknown_outcome',outcome:'unknown'},502);
      }
    }
    // Persist intention before sending. Any audit failure at execute stage is
    // reported as an unknown outcome so the UI never retries automatically.
    try{await audit({user:auth.session.username,method:intent.method,target:intent.target,status:'submitted'});}
    catch{return json({error:GENERIC.unknown_outcome,code:'unknown_outcome',outcome:'unknown'},502);}
    let result:unknown;
    try {
      result=await nasCall(intent.method,intent.args);
    }catch(error){
      try{await audit({user:auth.session.username,method:intent.method,target:intent.target,status:'failed-or-unknown'});}catch{}
      const failure=specific(error);
      // A definitive middleware rejection is safe to show; anything else
      // (transport/config/unexpected) may or may not have been applied.
      if(failure?.code==='upstream_rejected')return respond(failure,error);
      return json({error:GENERIC.unknown_outcome,code:'unknown_outcome',outcome:'unknown'},502);
    }
    const job=operation(intent.method).job;
    try{await audit({user:auth.session.username,method:intent.method,target:intent.target,status:job?'accepted':'completed',job:job?result:undefined});}
    catch{return json({error:GENERIC.unknown_outcome,code:'unknown_outcome',outcome:'unknown'},502);}
    return json({accepted:true,job:job?result:null,result:job?null:redact(result)});
  }catch(error){
    const failure=specific(error);
    if(failure)return respond(failure,error);
    return json({error:'Invalid request',code:'invalid_request'},400);
  }
}
