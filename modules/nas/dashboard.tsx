'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Database,Server,Network,Shield,RefreshCw,MonitorSpeaker,LogOut,HardDrive} from '@/components/icons/platform-icons';
import {LanguageSelect} from '@/i18n/language-select';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import catalog from './catalog.json';
import {type Value} from './schema';
import {OperationDialog} from './operation-dialog';
import {buttonClass,fieldLabel,inputClass} from './schema-form';
type Row=Record<string,Value>;
type Operation=keyof typeof catalog.operations;
type Result={data:unknown;at?:string;limit?:number|null};
async function fetchResource(resource:string,signal?:AbortSignal):Promise<Result> {
  const response=await fetch(`/api/nas?resource=${encodeURIComponent(resource)}`,{signal,cache:'no-store'});
  const body=await response.json();if(!response.ok)throw new Error(body.error??'TrueNAS unavailable');return body;
}
function display(value:unknown,locale:string):string {
  if(value===undefined||value===null)return '—';
  if(typeof value==='boolean')return value?'✓':'—';
  if(typeof value==='number')return value.toLocaleString(locale);
  if(Array.isArray(value))return value.map(v=>display(v,locale)).join(', ');
  if(typeof value==='object') {const obj=value as Record<string,unknown>;if('$date' in obj)return new Date(Number(obj.$date)).toLocaleString(locale);if('value' in obj)return display(obj.value,locale);if('percent' in obj)return `${obj.percent??0}% · ${obj.description??''}`;return Object.entries(obj).slice(0,5).map(([k,v])=>`${k}: ${display(v,locale)}`).join(' · ');}
  return String(value);
}
function bytes(value:unknown,locale:string) {const n=Number(value);if(!Number.isFinite(n))return '—';const i=n>0?Math.min(4,Math.floor(Math.log(n)/Math.log(1024))):0;return `${(n/1024**i).toLocaleString(locale,{maximumFractionDigits:1})} ${['B','KiB','MiB','GiB','TiB'][i]}`;}
const iconFor=(id:string)=>['pools','datasets','snapshots','snapshotTasks','scrub'].includes(id)?Database:['network','networkConfig','smb','nfs'].includes(id)?Network:['users','groups','alerts','audit'].includes(id)?Shield:id==='vms'?MonitorSpeaker:id==='disks'?HardDrive:Server;

export function NasDashboard({officialUrl,initialResource='overview',embedded=false}:{officialUrl:string;initialResource?:string;embedded?:boolean}) {
  const t=useTranslations('nas');const router=useRouter();const locale=useLocale();const language=locale==='zh-CN'?'zh-CN':'en';
  const [active,setActive]=useState(initialResource);const [search,setSearch]=useState('');const [more,setMore]=useState(false);
  const [action,setAction]=useState<{method:Operation;row?:Row}|null>(null);const [details,setDetails]=useState<Row|null>(null);const [notice,setNotice]=useState('');
  const queryClient=useQueryClient();
  const query=useQuery({queryKey:['nas',active],queryFn:({signal})=>fetchResource(active,signal),refetchInterval:active==='jobs'?5000:30000,retry:false});
  const resource=catalog.resources.find(r=>r.id===active);
  const rows:Row[]=Array.isArray(query.data?.data)?query.data.data as Row[]:query.data?.data&&typeof query.data.data==='object'?[query.data.data as Row]:[];
  const visible=rows.filter(row=>display(row,locale).toLowerCase().includes(search.toLowerCase())||Object.values(row).some(v=>display(v,locale).toLowerCase().includes(search.toLowerCase())));
  const activate=(id:string)=>{setActive(id);setSearch('');setNotice('');};
  const primary=catalog.resources.filter(r=>!r.extra);const extras=catalog.resources.filter(r=>r.extra);
  const title=active==='overview'?t('overview'):active==='audit'?t('audit'):resource?.label[language]??active;
  return <div className={`${embedded?'rounded-2xl':'min-h-screen'} bg-[#080f18] text-slate-100 selection:bg-teal-400/25`}>
    {!embedded&&<div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.07),transparent_50%)]"/>}
    {!embedded&&<aside className="relative border-b border-white/[0.07] bg-[#0c1420] p-4 lg:fixed lg:inset-y-0 lg:w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div className="mb-5 flex items-center gap-3 px-2"><div className="flex size-10 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/10"><Server className="size-6"/></div><div><p className="font-semibold tracking-tight">TrueNAS</p><p className="text-xs text-slate-500">Homeio · {t('title')}</p></div></div>
      <nav aria-label={t('title')} className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {[{id:'overview',label:{en:t('overview'),'zh-CN':t('overview')}},...primary].map(r=>{const Icon=iconFor(r.id);return <button key={r.id} onClick={()=>activate(r.id)} aria-current={active===r.id?'page':undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${active===r.id?'bg-teal-400/10 text-teal-200':'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}><Icon className="size-4 shrink-0"/>{r.label[language]}</button>;})}
        <button className="mt-2 rounded-xl px-3 py-2 text-left text-xs text-slate-500" onClick={()=>setMore(!more)} aria-expanded={more}>{t('more')} {more?'−':'+'}</button>
        {more&&extras.map(r=><button key={r.id} className={`rounded-xl px-3 py-2 text-left text-sm ${active===r.id?'bg-teal-400/10 text-teal-200':'text-slate-400'}`} onClick={()=>activate(r.id)}>{r.label[language]}</button>)}
        <button onClick={()=>activate('audit')} className={`rounded-xl px-3 py-2.5 text-left text-sm ${active==='audit'?'bg-teal-400/10 text-teal-200':'text-slate-400'}`}>{t('audit')}</button>
      </nav>
      <div className="mt-5 space-y-3 border-t border-white/10 pt-4"><Link className="block px-3 text-sm text-slate-400 hover:text-teal-200" href="/desktop">{t('desktop')}</Link><a className="block px-3 text-sm text-slate-400 hover:text-teal-200" href={officialUrl} target="_blank" rel="noreferrer">{t('official')} ↗</a><LanguageSelect/><button className="flex items-center gap-2 px-3 text-xs text-slate-500" onClick={()=>void fetch('/api/auth/logout',{method:'POST'}).then(()=>{router.replace('/login');router.refresh();})}><LogOut className="size-4"/>{t('logout')}</button></div>
    </aside>}
    <main className={embedded?"relative p-4":"relative mx-auto max-w-[1800px] p-5 md:p-8 lg:ml-64 lg:p-10"}>
      <header className={`${embedded?'mb-4':'mb-8'} flex flex-wrap items-start justify-between gap-4`}><div>{!embedded&&<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300/70">NAS CONTROL CENTER</p>}<h1 className={`${embedded?'text-lg':'text-3xl'} font-semibold tracking-tight`}>{title}</h1>{!embedded&&<p className="mt-2 text-sm text-slate-500">{t('subtitle')}</p>}</div><button className={`${buttonClass} flex items-center gap-2`} disabled={query.isFetching} onClick={()=>void query.refetch()}><RefreshCw className={`size-4 ${query.isFetching?'animate-spin':''}`}/>{t('refresh')}</button></header>
      {notice&&<div role="status" className="mb-5 rounded-xl border border-teal-400/20 bg-teal-400/5 p-4 text-sm text-teal-200">{notice}</div>}
      {query.error&&<div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">{query.error.message} · <a href={officialUrl} target="_blank" rel="noreferrer" className="underline">{t('official')}</a></div>}
      {query.isLoading?<p className="py-16 text-center text-slate-400">{t('loading')}</p>:active==='overview'?<Overview data={query.data?.data} onNavigate={activate}/>:<>
        {(active==='network'||active==='networkConfig')&&<div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">{t('networkNotice')}</div>}
        {resource?.extra&&<p className="mb-4 text-sm text-slate-500">{t('unused')}</p>}
        <div className="mb-4 flex flex-wrap gap-3"><input aria-label={t('search')} placeholder={t('search')} className={`${inputClass} ${embedded?'max-w-[12rem]':'max-w-sm'}`} value={search} onChange={e=>setSearch(e.target.value)}/>{resource&&<select aria-label={t('actions')} className={`${inputClass} ${embedded?'max-w-[10rem]':'max-w-xs'}`} value="" onChange={e=>{if(e.target.value)setAction({method:e.target.value as Operation});}}><option value="">{t('actions')}…</option>{resource.actions.map(m=><option key={m} value={m}>{catalog.operations[m as Operation].label[language]}</option>)}</select>}</div>
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0d1724]/80"><table className="w-full text-left text-sm"><thead className="bg-white/[0.025] text-xs text-slate-500"><tr>{(resource?.columns??['at','user','method','target','status','job']).map(k=><th key={k} className="whitespace-nowrap px-5 py-4 font-medium">{fieldLabel(k,t)}</th>)}<th className="px-5 py-4">{t('actions')}</th></tr></thead><tbody>{visible.map((row,i)=><tr key={String(row[resource?.key??'id']??i)} className="border-t border-white/[0.05] hover:bg-white/[0.02]">{(resource?.columns??['at','user','method','target','status','job']).map(k=><td key={k} className="max-w-xs px-5 py-4"><Cell value={row[k]} name={k} locale={locale}/></td>)}<td className="min-w-40 px-5 py-4"><div className="flex items-center gap-2"><button className={buttonClass} onClick={()=>setDetails(row)}>{t('details')}</button>{resource&&<select aria-label={`${t('actions')} ${String(row.name??row.id??row.username??i)}`} value="" className="max-w-36 rounded-lg border border-white/10 bg-black/20 p-2 text-xs" onChange={e=>{if(e.target.value)setAction({method:e.target.value as Operation,row});}}><option value="">{t('actions')}</option>{resource.actions.filter(m=>!m.endsWith('.create')).map(m=><option value={m} key={m}>{catalog.operations[m as Operation].label[language]}</option>)}</select>}</div></td></tr>)}</tbody></table>{!visible.length&&<p className="py-16 text-center text-sm text-slate-500">{t('empty')}</p>}</div>
        {query.data?.limit&&<p className="mt-3 text-xs text-slate-500">{t('limit',{count:query.data.limit})}</p>}
        {query.data?.at&&<p className="mt-3 text-xs text-slate-600">{new Date(query.data.at).toLocaleString(locale)}</p>}
      </>}
    </main>
    {details&&<Dialog open onOpenChange={open=>{if(!open)setDetails(null);}}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border-white/10 bg-slate-950 text-slate-100"><DialogTitle>{t('details')}</DialogTitle><DialogDescription>{String(details.name??details.id??details.username??title)}</DialogDescription><DetailTree data={details}/>{active==='datasets'&&typeof details.id==='string'&&<AclView path={`/mnt/${details.id}`}/>}</DialogContent></Dialog>}
    {action&&<OperationDialog key={`${action.method}:${String(action.row?.id??'new')}`} method={action.method} row={action.row} onClose={()=>setAction(null)} onDone={job=>{setNotice(job===null?t('completed'):`${t('submitted')} #${job}`);void queryClient.invalidateQueries({queryKey:['nas']});if(job!==null)setActive('jobs');}}/>}
  </div>;
}
function Cell({value,name,locale}:{value:unknown;name:string;locale:string}) {
  const text=['size','allocated','free'].includes(name)?bytes(value,locale):display(value,locale);
  if(['state','status','healthy'].includes(name))return <span className={`inline-block rounded-full px-2.5 py-1 text-xs ${['RUNNING','ONLINE','SUCCESS','COMPLETED','true','✓'].includes(text)?'bg-teal-400/10 text-teal-200':['FAILED','CRASHED','FAULTED','DEGRADED'].includes(text)?'bg-red-400/10 text-red-300':'bg-white/5 text-slate-400'}`}>{text}</span>;
  return <span className="line-clamp-3 break-words text-slate-300" title={text}>{text}</span>;
}
function DetailTree({data}:{data:unknown}) {
  const t=useTranslations('nas');const locale=useLocale();
  if(Array.isArray(data))return <div className="space-y-2">{data.map((v,i)=><div key={i} className="rounded-lg border border-white/5 p-2"><DetailTree data={v}/></div>)}</div>;
  if(data&&typeof data==='object')return <dl className="space-y-2">{Object.entries(data).map(([k,v])=><div className="border-b border-white/5 py-2" key={k}><dt className="mb-1 text-xs text-slate-500">{fieldLabel(k,t)}</dt><dd className="break-words text-sm"><DetailTree data={v}/></dd></div>)}</dl>;
  return <span>{display(data,locale)}</span>;
}
function AclView({path}:{path:string}) {
  const t=useTranslations('nas');const query=useQuery({queryKey:['nas','acl',path],queryFn:async()=>{const r=await fetch(`/api/nas?resource=acl&path=${encodeURIComponent(path)}`);const result=await r.json();if(!r.ok)throw new Error(result.error);return result.data;},retry:false});
  return <details className="mt-4 border-t border-white/10 pt-4"><summary className="cursor-pointer">ACL · {path}</summary>{query.error?<p className="mt-2 text-red-300">{query.error.message}</p>:query.isLoading?<p>{t('loading')}</p>:<DetailTree data={query.data}/>}</details>;
}
function Overview({data,onNavigate}:{data:unknown;onNavigate:(id:string)=>void}) {
  const t=useTranslations('nas');const locale=useLocale();const result=(data??{}) as Record<string,unknown>;const system=(result['system.info']??{}) as Record<string,unknown>;
  const pools=Array.isArray(result['pool.query'])?result['pool.query'] as Row[]:[];const apps=Array.isArray(result['app.query'])?result['app.query'] as Row[]:[];const alerts=Array.isArray(result['alert.list'])?result['alert.list'] as Row[]:[];
  const cards=[{title:t('version'),value:String(system.version??'—'),sub:String(system.hostname??''),id:'system'},{title:t('pools'),value:String(pools.length),sub:pools.map(p=>`${p.name} · ${p.status}`).join(', '),id:'pools'},{title:t('apps'),value:`${apps.filter(a=>a.state==='RUNNING').length} / ${apps.length}`,sub:t('running'),id:'apps'},{title:t('alerts'),value:String(alerts.filter(a=>!a.dismissed).length),sub:t('details'),id:'alerts'}];
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{cards.map(c=><button key={c.id} onClick={()=>onNavigate(c.id)} className="rounded-2xl border border-white/[0.08] bg-[#0d1724] p-6 text-left transition hover:border-teal-400/25"><p className="text-xs text-slate-500">{c.title}</p><p className="mt-4 break-all text-2xl font-semibold tracking-tight">{c.value}</p><p className="mt-3 truncate text-xs text-slate-500">{c.sub}</p></button>)}</div>
    {typeof result['interface.checkin_waiting']==='number'&&Number(result['interface.checkin_waiting'])>0&&<button className="w-full rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-left text-sm text-amber-200" onClick={()=>onNavigate('network')}>{t('networkPending',{seconds:Number(result['interface.checkin_waiting'])})}</button>}
    <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border border-white/[0.08] bg-[#0d1724] p-6"><h2 className="mb-5 text-lg font-medium">{t('pools')}</h2>{pools.map(p=><div key={String(p.id)} className="mb-4 rounded-xl bg-white/[0.025] p-4"><div className="flex justify-between"><span className="font-medium">{String(p.name)}</span><Cell value={p.status} name="status" locale={locale}/></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-teal-400/70" style={{width:`${Number(p.size)>0?Math.min(100,Number(p.allocated)/Number(p.size)*100):0}%`}}/></div><p className="mt-3 text-xs text-slate-500">{bytes(p.allocated,locale)} / {bytes(p.size,locale)} · {bytes(p.free,locale)}</p></div>)}</section><section className="rounded-2xl border border-white/[0.08] bg-[#0d1724] p-6"><h2 className="mb-5 text-lg font-medium">TrueNAS</h2><dl className="space-y-4 text-sm">{[[t('cpu'),system.model],[t('memory'),bytes(system.physmem,locale)],[t('uptime'),system.uptime]].map(([k,v])=><div key={String(k)} className="flex justify-between gap-6 border-b border-white/5 pb-3"><dt className="text-slate-500">{String(k)}</dt><dd className="text-right text-slate-300">{display(v,locale)}</dd></div>)}</dl></section></div>
    <section className="rounded-2xl border border-white/[0.08] bg-[#0d1724] p-6"><h2 className="mb-4 text-lg font-medium">{t('redundancy')}</h2><p className="max-w-4xl text-sm leading-7 text-slate-500">{t('redundancyText')}</p></section>
  </div>;
}
