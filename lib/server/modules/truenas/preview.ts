import 'server-only';
import {createHash} from 'node:crypto';
import {nasCall} from './client';
import {redact} from '@/modules/nas/schema';
export type DiffEntry={path:string;before:unknown;after:unknown;beforeAvailable:boolean;sensitive?:boolean};
export type Preview={diff:DiffEntry[];baseline?:string;previewComplete:boolean};
export class StalePreviewError extends Error {
  readonly code='stale_preview';
  constructor(message='The operation target changed; review the operation again'){super(message);this.name='StalePreviewError';}
}
const MASK='***';
// Mirror schema.redact's protected-key policy for nested diff values, and keep a
// narrower secret set for top-level fields that are masked in place.
const PROTECTED=/password|passwd|secret|token|keyhash|privatekey|private_key|passphrase|^key$|^hash$|^args$|^arguments$|^env$|^environment$|^values$|^custom_compose/i;
const SENSITIVE=/password|passwd|secret|token|keyhash|privatekey|private_key|passphrase|^key$|^hash$/i;
const isProtectedKey=(field:string)=>PROTECTED.test(field);
const isSensitiveKey=(field:string)=>SENSITIVE.test(field);
// Only the Supervisor-approved before-state mappings are queried. Everything
// else reports beforeAvailable:false rather than guessing.
const UPDATE_SOURCES:Record<string,{query:string;unwrap:boolean}>={
  'pool.dataset.update':{query:'pool.dataset.query',unwrap:true},
  'sharing.smb.update':{query:'sharing.smb.query',unwrap:false},
  'vm.update':{query:'vm.query',unwrap:false},
};
const APP_ACTIONS:Record<string,string>={'app.start':'RUNNING','app.stop':'STOPPED'};
function asObject(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;}
// TrueNAS dataset query wraps many fields as {value,parsed,source}; the parsed
// value is the normalized one used for comparison.
function unwrapDataset(value:unknown):unknown {
  const record=asObject(value);
  if(record&&('value' in record||'parsed' in record))return record.parsed!==undefined?record.parsed:record.value;
  return value;
}
function canonicalize(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonicalize);
  const record=asObject(value);
  if(record)return Object.fromEntries(Object.keys(record).sort().map(key=>[key,canonicalize(record[key])]));
  return value;
}
function hash(values:Record<string,unknown>){return createHash('sha256').update(JSON.stringify(canonicalize(values))).digest('hex');}
// Sensitive top-level fields are masked in place with sensitive:true; all other
// values pass through schema.redact so nested credentials and protected keys
// (env/values/args/custom_compose) can never reach the diff.
function diffEntry(path:string,before:unknown,after:unknown,beforeAvailable:boolean):DiffEntry {
  const sensitive=isSensitiveKey(path);
  return {path,before:sensitive?(before===null?null:MASK):redact(before),after:sensitive?MASK:redact(after),beforeAvailable,...(sensitive?{sensitive:true}:{})};
}
// Protected-but-not-sensitive fields are dropped from previews entirely rather
// than echoed; sensitive fields stay so the UI can mark them.
const keepField=(path:string)=>!isProtectedKey(path)||isSensitiveKey(path);
async function fetchRecord(query:string,id:unknown):Promise<Record<string,unknown>|null> {
  const result=await nasCall(query,[[['id','=',id]],{get:true}]);
  if(Array.isArray(result))return asObject(result[0]);
  return asObject(result);
}
function updatePreview(source:{query:string;unwrap:boolean},args:unknown[]):Promise<Preview> {
  const patch=asObject(args[1]);
  if(!patch)return Promise.resolve({diff:[],baseline:hash({}),previewComplete:true});
  return fetchRecord(source.query,args[0]).then(record=>{
    const diff:DiffEntry[]=[];const beforeValues:Record<string,unknown>={};
    for(const [path,after] of Object.entries(patch)) {
      if(!keepField(path))continue;
      const sensitive=isSensitiveKey(path);
      const known=record!==null&&Object.hasOwn(record,path);
      const before=known?(source.unwrap?unwrapDataset(record[path]):record[path]):null;
      diff.push(diffEntry(path,known?before:null,after,known));
      // Sensitive values are excluded from the baseline hash, never persisted raw.
      if(known&&!sensitive)beforeValues[path]=before;
    }
    return {diff,baseline:record!==null?hash(beforeValues):undefined,previewComplete:diff.every(entry=>entry.beforeAvailable)};
  });
}
async function appActionPreview(method:string,args:unknown[]):Promise<Preview> {
  const record=await fetchRecord('app.query',args[0]);
  const current=record?record.state:undefined;
  const known=current!==undefined;
  return {diff:[diffEntry('state',known?current:null,APP_ACTIONS[method],known)],baseline:known?hash({state:current}):undefined,previewComplete:known};
}
function createPreview(args:unknown[]):Preview {
  const patch=asObject(args[0]);
  if(!patch)return {diff:[diffEntry('args',null,args,true)],previewComplete:true};
  return {diff:Object.entries(patch).filter(([path])=>keepField(path)).map(([path,after])=>diffEntry(path,null,after,true)),previewComplete:true};
}
function submittedPreview(args:unknown[]):Preview {
  const first=asObject(args[0]);
  const diff=first?Object.entries(first).filter(([path])=>keepField(path)).map(([path,value])=>diffEntry(path,null,value,false)):[diffEntry('args',null,args,false)];
  return {diff,previewComplete:false};
}
export async function preparePreview(method:string,args:unknown[]):Promise<Preview> {
  const source=UPDATE_SOURCES[method];
  if(source)return updatePreview(source,args);
  if(Object.hasOwn(APP_ACTIONS,method))return appActionPreview(method,args);
  if(method.endsWith('.create'))return createPreview(args);
  return submittedPreview(args);
}
export async function assertUnchanged(method:string,args:unknown[],baseline:string):Promise<void> {
  const preview=await preparePreview(method,args);
  if(preview.baseline!==baseline)throw new StalePreviewError();
}
