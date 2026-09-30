'use client';
import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useLocale,useTranslations} from 'next-intl';
import catalog from './catalog.json';
import schemas from './schemas.json';
import {initial,validate,type Schema,type Value} from './schema';
import {SchemaField,buttonClass,fieldLabel,inputClass} from './schema-form';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
type Row=Record<string,Value>;
export async function requestNas(body:unknown) {const response=await fetch('/api/nas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error);return data;}
export function OperationDialog({method,row,onClose,onDone}:{method:keyof typeof catalog.operations;row?:Row;onClose:()=>void;onDone:(job:number|null)=>void}) {
  const t=useTranslations('nas');const locale=useLocale()==='zh-CN'?'zh-CN':'en';const op=catalog.operations[method];
  const definitions=schemas[method] as Schema[];
  const resource=catalog.resources.find(r=>r.id===op.resource);
  const aclPath=row&&typeof row.id==='string'?`/mnt/${row.id}`:'';
  const acl=useQuery({queryKey:['nas','acl',aclPath],enabled:method==='filesystem.setacl'&&Boolean(aclPath),queryFn:async()=>{const response=await fetch(`/api/nas?resource=acl&path=${encodeURIComponent(aclPath)}`);const body=await response.json();if(!response.ok)throw new Error(body.error);return body.data as Row;},retry:false});
  const [aclSeeded,setAclSeeded]=useState(false);
  const [args,setArgs]=useState<Value[]>(()=>definitions.map((s,i)=>{
    if(method==='interface.commit')return {rollback:true,checkin_timeout:60};
    if(row&&s.type!=='object'&&!s.anyOf&&!s.oneOf){const key=s._name_??'';const candidate=key==='app_name'?row.id:key==='dev'?row.name:key==='service'?row.service:(i===0&&op.item)?row[resource?.key??'id']:row[key];if(candidate!==undefined&&validate(s,candidate).length===0)return candidate;}
    const value=initial(s);
    if(row && method==='filesystem.setacl' && value && typeof value==='object'&&!Array.isArray(value))return {...value,path:typeof row.id==='string'?`/mnt/${row.id}`:''};
    return value;
  }));
  const [preview,setPreview]=useState<{token:string;target:string;changes:unknown;danger:boolean}|null>(null);
  const [confirmation,setConfirmation]=useState('');const [password,setPassword]=useState('');const [pending,setPending]=useState(false);const [error,setError]=useState('');
  const errors=definitions.flatMap((s,i)=>validate(s,args[i],s._name_??String(i)));
  useEffect(()=>{
    if(method!=='filesystem.setacl'||!acl.data||aclSeeded)return;
    const current=acl.data;
    setArgs([{path:aclPath,dacl:current.acl??[],uid:current.uid??null,gid:current.gid??null,acltype:current.acltype??'NFS4'}]);
    setAclSeeded(true);
  },[method,acl.data,aclSeeded,aclPath]);
  async function review(){setPending(true);setError('');try{setPreview(await requestNas({stage:'preview',method,args}));}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setPending(false);}}
  async function execute(){if(!preview)return;setPending(true);setError('');try{const result=await requestNas({stage:'execute',token:preview.token,confirmation,password});setPassword('');onDone(result.job);onClose();}catch(e){setPassword('');setPreview(null);setError(e instanceof Error?e.message:String(e));}finally{setPending(false);}}
  return <Dialog open onOpenChange={open=>{if(!open&&!pending)onClose();}}><DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto border-white/10 bg-slate-950 text-slate-100">
    <DialogTitle>{op.label[locale]}</DialogTitle><DialogDescription>{preview?t('previewHint'):t('warning')}</DialogDescription>
    {(error||acl.error)&&<div role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{error||acl.error?.message}</div>}
    {!preview?<><div className="space-y-4">{definitions.map((s,i)=><section key={i}><h3 className="mb-2 text-sm font-semibold">{fieldLabel(s._name_??s.title??String(i),t)}</h3>{method==='interface.commit'?<p className="text-sm text-slate-400">{t('networkNotice')}</p>:<SchemaField key={method==='filesystem.setacl'?String(aclSeeded):i} schema={s} value={args[i]} seed={row} name={s._name_??String(i)} onChange={v=>setArgs(args.map((x,j)=>j===i?v:x))}/>}</section>)}</div>{errors.length>0&&<p className="text-xs text-amber-300">{errors.slice(0,4).join('; ')}</p>}<button className={buttonClass} disabled={pending||errors.length>0||(method==='filesystem.setacl'&&Boolean(aclPath)&&!aclSeeded)} onClick={()=>void review()}>{t('review')}</button></>:<>
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="font-semibold">{op.label[locale]} · {preview.target}</p><p className="mt-2 text-sm text-amber-200">{t('warning')}</p></div>
      <ReviewChanges value={preview.changes}/>
      <label className="space-y-2 text-sm"><span>{t('typeTarget')}: <strong>{preview.target}</strong></span><input className={inputClass} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
      <label className="space-y-2 text-sm"><span>{t('password')}</span><input className={inputClass} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/><p className="text-xs text-slate-400">{t('passwordHint')}</p></label>
      <div className="flex gap-2"><button className={buttonClass} disabled={pending} onClick={()=>{setPreview(null);setPassword('');}}>{t('cancel')}</button><button className={`${buttonClass} border-teal-400/30 bg-teal-400/10 text-teal-200`} disabled={pending||confirmation!==preview.target||!password} onClick={()=>void execute()}>{t('confirm')}</button></div>
    </>}
  </DialogContent></Dialog>;
}
function ReviewChanges({value}:{value:unknown}) {
  const t=useTranslations('nas');
  if(Array.isArray(value))return <div className="space-y-2">{value.map((v,i)=><ReviewChanges key={i} value={v}/>)}</div>;
  if(value&&typeof value==='object')return <dl className="space-y-2 rounded-xl border border-white/10 p-3">{Object.entries(value).map(([k,v])=><div key={k}><dt className="text-xs text-slate-400">{fieldLabel(k,t)}</dt><dd className="break-all text-sm"><ReviewChanges value={v}/></dd></div>)}</dl>;
  return <span>{value===null?'—':String(value)}</span>;
}
