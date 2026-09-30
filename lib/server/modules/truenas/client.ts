import 'server-only';
import WebSocket from 'ws';
import {readFile} from 'node:fs/promises';
import {createHash, timingSafeEqual} from 'node:crypto';
import type {TLSSocket} from 'node:tls';

type Config = {url: string; key: string; fingerprint: string; username: string};
export async function getNasConfig(): Promise<Config> {
  const path = process.env.TRUENAS_CONFIG_FILE;
  if (!path) throw new Error('TrueNAS connection is not configured');
  const config = JSON.parse(await readFile(path,'utf8')) as Config;
  if (!config.url.startsWith('wss://') || !/^[a-f0-9]{64}$/i.test(config.fingerprint) || !config.key) throw new Error('Invalid TrueNAS TLS configuration');
  return config;
}
// A single pinned service-account connection avoids repeated PAM logins during polling.
// Route authorization still happens per Homeio request; RPC IDs isolate concurrent callers.
type Pending = {resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
let connection: {config:string;ready:Promise<(call:{method:string;params?:unknown[]})=>Promise<unknown>>;close:(error?:Error)=>void}|undefined;
function connect(config:Config) {
  const ws=new WebSocket(config.url,{rejectUnauthorized:false,handshakeTimeout:8000,maxPayload:16*1024*1024});
  const pending=new Map<number,Pending>();let nextId=1;let done=false;let verified=false;let authenticated=false;
  let resolveReady:(send:(call:{method:string;params?:unknown[]})=>Promise<unknown>)=>void;
  let rejectReady:(error:Error)=>void;
  let idle:ReturnType<typeof setTimeout>|undefined;
  const ready=new Promise<(call:{method:string;params?:unknown[]})=>Promise<unknown>>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  const authTimer=setTimeout(()=>close(new Error('TrueNAS authentication timed out')),15000);authTimer.unref?.();
  function close(error=new Error('TrueNAS connection closed; check jobs before retrying')) {
    if(done)return;done=true;clearTimeout(authTimer);clearTimeout(idle);
    if(connection?.ready===ready)connection=undefined;
    rejectReady(error);for(const request of pending.values()){clearTimeout(request.timer);request.reject(error);}pending.clear();ws.close();
  }
  function scheduleIdle(){clearTimeout(idle);if(!pending.size){idle=setTimeout(()=>close(),300000);idle.unref?.();}}
  function send(call:{method:string;params?:unknown[]}) {
    if(done||!authenticated)return Promise.reject(new Error('TrueNAS connection closed; refresh before retrying'));
    clearTimeout(idle);const id=nextId++;
    return new Promise<unknown>((resolve,reject)=>{
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('TrueNAS request timed out; check job status before retrying an operation'));scheduleIdle();},25000);timer.unref?.();
      pending.set(id,{resolve,reject,timer});
      ws.send(JSON.stringify({jsonrpc:'2.0',id,method:call.method,params:call.params??[]}),error=>{if(error)close(new Error('TrueNAS request could not be sent; check jobs before retrying'));});
    });
  }
  ws.on('upgrade',response=>{
    const certificate=(response.socket as TLSSocket).getPeerCertificate();
    const actual=certificate.raw?createHash('sha256').update(certificate.raw).digest():Buffer.alloc(0);
    const expected=Buffer.from(config.fingerprint,'hex');
    if(actual.length!==expected.length||!timingSafeEqual(actual,expected)){close(new Error('TrueNAS certificate changed; connection refused'));ws.terminate();}else verified=true;
  });
  ws.on('open',()=>{if(done)return;if(!verified){close(new Error('TrueNAS TLS peer was not verified'));return;}ws.send(JSON.stringify({jsonrpc:'2.0',id:0,method:'auth.login_with_api_key',params:[config.key]}));});
  ws.on('message',data=>{
    if(done)return;
    let msg:{id?:number;error?:{message?:string;data?:{reason?:string}};result?:unknown};
    try{msg=JSON.parse(data.toString());}catch{close(new Error('Invalid TrueNAS response'));return;}
    if(msg.id===undefined)return;
    if(!Number.isInteger(msg.id)||msg.id<0){close(new Error('Invalid TrueNAS response ID'));return;}
    if(msg.id===0){
      if(authenticated){close(new Error('Duplicate TrueNAS authentication response'));return;}
      if(msg.error||msg.result!==true){close(new Error('TrueNAS authentication failed'));return;}
      authenticated=true;clearTimeout(authTimer);resolveReady(send);scheduleIdle();return;
    }
    const request=pending.get(msg.id);
    // Ignore late replies to timed-out requests; never resend the operation automatically.
    if(!request)return;
    pending.delete(msg.id);clearTimeout(request.timer);
    request.resolve(msg.error?{nasError:msg.error.data?.reason??msg.error.message??'TrueNAS operation failed'}:msg.result);scheduleIdle();
  });
  ws.on('error',()=>close(new Error('Cannot connect to TrueNAS over TLS')));
  ws.on('close',()=>close());
  return {config:JSON.stringify(config),ready,close};
}
export async function nasBatch(calls:{method:string;params?:unknown[]}[]) {
  const config=await getNasConfig();const identity=JSON.stringify(config);
  if(connection&&connection.config!==identity)connection.close(new Error('TrueNAS connection configuration changed'));
  if(!connection)connection=connect(config);
  const send=await connection.ready;
  return Promise.all(calls.map(send));
}
export async function nasCall(method:string,params:unknown[]=[]) {
  const [result]=await nasBatch([{method,params}]);
  if(result&&typeof result==='object'&&'nasError' in result)throw new Error(String(result.nasError));
  return result;
}
