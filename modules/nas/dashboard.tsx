'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useLocale,useTranslations} from 'next-intl';
import {useQuery,useQueryClient} from '@tanstack/react-query';
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

type DashboardProps = {officialUrl:string; initialResource?:string; embedded?:boolean; contentOnly?:boolean; resourceId?:string; onNavigate?:(id:string)=>void};

export function NasResourcePanel({resource,onNavigate,officialUrl}: {resource:string;onNavigate:(id:string)=>void;officialUrl:string}) {
  return <NasDashboard embedded contentOnly resourceId={resource} onNavigate={onNavigate} officialUrl={officialUrl}/>;
}

export function NasDashboard({officialUrl,initialResource='overview',embedded=false,contentOnly=false,resourceId,onNavigate}:DashboardProps) {
  const t=useTranslations('nas');const router=useRouter();const locale=useLocale();const language=locale==='zh-CN'?'zh-CN':'en';
  const [internalActive,setActive]=useState(initialResource);const active=resourceId??internalActive;const [search,setSearch]=useState('');const [more,setMore]=useState(false);
  const [action,setAction]=useState<{method:Operation;row?:Row}|null>(null);const [details,setDetails]=useState<Row|null>(null);const [notice,setNotice]=useState('');
  const queryClient=useQueryClient();
  const query=useQuery({queryKey:['nas',active],queryFn:({signal})=>fetchResource(active,signal),refetchInterval:active==='jobs'?5000:30000,retry:false});
  const resource=catalog.resources.find(r=>r.id===active);
  const rows:Row[]=Array.isArray(query.data?.data)?query.data.data as Row[]:query.data?.data&&typeof query.data.data==='object'?[query.data.data as Row]:[];
  const visible=rows.filter(row=>display(row,locale).toLowerCase().includes(search.toLowerCase())||Object.values(row).some(v=>display(v,locale).toLowerCase().includes(search.toLowerCase())));
  const activate=(id:string)=>{if(onNavigate)onNavigate(id);else setActive(id);setSearch('');setNotice('');};
  const primary=catalog.resources.filter(r=>!r.extra);const extras=catalog.resources.filter(r=>r.extra);
  const title=active==='overview'?t('overview'):active==='audit'?t('audit'):resource?.label[language]??active;
  const Content = contentOnly ? 'div' : 'main';
  return <div className={contentOnly?'nas-dashboard nas-resource-panel':`nas-dashboard ${embedded?'rounded-lg':'min-h-screen'} bg-background text-foreground selection:bg-primary/20`}>
    {!embedded&&<div className="pointer-events-none fixed inset-0 rhine-grid"/>}
    {!embedded&&<aside className="relative border-b border-border bg-sidebar p-4 lg:fixed lg:inset-y-0 lg:w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div className="mb-5 flex items-center gap-3 px-2"><div><p className="font-semibold tracking-tight">TrueNAS</p><p className="text-xs text-muted-foreground">Homeio · {t('title')}</p></div></div>
      <nav aria-label={t('title')} className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {[{id:'overview',label:{en:t('overview'),'zh-CN':t('overview')}},...primary].map(r=>{return <button key={r.id} onClick={()=>activate(r.id)} aria-current={active===r.id?'page':undefined} className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition ${active===r.id?'bg-primary/15 text-foreground':'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{r.label[language]}</button>;})}
        <button className="mt-2 rounded-md px-3 py-2 text-left text-xs text-muted-foreground" onClick={()=>setMore(!more)} aria-expanded={more}>{t('more')} {more?'−':'+'}</button>
        {more&&extras.map(r=><button key={r.id} className={`rounded-md px-3 py-2 text-left text-sm ${active===r.id?'bg-primary/15 text-foreground':'text-muted-foreground'}`} onClick={()=>activate(r.id)}>{r.label[language]}</button>)}
        <button onClick={()=>activate('audit')} className={`rounded-md px-3 py-2.5 text-left text-sm ${active==='audit'?'bg-primary/15 text-foreground':'text-muted-foreground'}`}>{t('audit')}</button>
      </nav>
      <div className="mt-5 space-y-3 border-t border-border pt-4"><Link className="block px-3 text-sm text-muted-foreground hover:text-status-green" href="/desktop">{t('desktop')}</Link><a className="block px-3 text-sm text-muted-foreground hover:text-status-green" href={officialUrl} target="_blank" rel="noreferrer">{t('official')} ↗</a><LanguageSelect/><button className="flex items-center gap-2 px-3 text-xs text-muted-foreground" onClick={()=>void fetch('/api/auth/logout',{method:'POST'}).then(()=>{router.replace('/login');router.refresh();})}>{t('logout')}</button></div>
    </aside>}
    <Content className={contentOnly?'nas-resource-content':embedded?"relative p-4":"relative mx-auto max-w-[1800px] p-5 md:p-8 lg:ml-64 lg:p-10"}>
      {!contentOnly && <header className={`${embedded?'mb-4':'mb-8'} flex flex-wrap items-start justify-between gap-4`}><div>{!embedded&&<p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">HOMEIO / CONTROL SYSTEM</p>}<h1 className={`${embedded?'text-lg':'text-3xl'} font-semibold tracking-tight`}>{title}</h1>{!embedded&&<p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>}</div><button className={`${buttonClass} flex items-center gap-2`} disabled={query.isFetching} onClick={()=>void query.refetch()}>{t('refresh')}</button></header>}
      {contentOnly && <div className="nas-resource-toolbar"><span>{query.data?.at ? new Date(query.data.at).toLocaleString(locale) : t('loading')}</span><button className={buttonClass} disabled={query.isFetching} onClick={()=>void query.refetch()}>{t('refresh')}</button></div>}
      {notice&&<div role="status" className="mb-5 rounded-md border border-status-green/30 bg-status-green/5 p-4 text-sm text-status-green">{notice}</div>}
      {query.error&&<div role="alert" className="mb-5 rounded-md border border-status-red/30 bg-status-red/5 p-4 text-sm text-status-red">{query.error.message} · <a href={officialUrl} target="_blank" rel="noreferrer" className="underline">{t('official')}</a></div>}
      {query.isLoading?<p className="py-16 text-center text-muted-foreground">{t('loading')}</p>:active==='overview'?<Overview data={query.data?.data} onNavigate={activate}/>:<>
        {(active==='network'||active==='networkConfig')&&<div className="mb-5 rounded-lg border border-status-amber/30 bg-status-amber/5 p-4 text-sm text-status-amber">{t('networkNotice')}</div>}
        <div className="mb-4 flex flex-wrap gap-3"><input aria-label={t('search')} placeholder={t('search')} className={`${inputClass} ${embedded?'max-w-[12rem]':'max-w-sm'}`} value={search} onChange={e=>setSearch(e.target.value)}/>{resource&&<select aria-label={t('actions')} className={`${inputClass} ${embedded?'max-w-[10rem]':'max-w-xs'}`} value="" onChange={e=>{if(e.target.value)setAction({method:e.target.value as Operation});}}><option value="">{t('actions')}…</option>{resource.actions.map(m=><option key={m} value={m}>{catalog.operations[m as Operation].label[language]}</option>)}</select>}</div>
        <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full text-left text-sm"><thead className="bg-muted text-xs text-muted-foreground"><tr>{(resource?.columns??['at','user','method','target','status','job']).map(k=><th key={k} className="whitespace-nowrap px-5 py-4 font-medium">{fieldLabel(k,t)}</th>)}<th className="px-5 py-4">{t('actions')}</th></tr></thead><tbody>{visible.map((row,i)=><tr key={String(row[resource?.key??'id']??i)} className="border-t border-border hover:bg-muted">{(resource?.columns??['at','user','method','target','status','job']).map(k=><td key={k} className="max-w-xs px-5 py-4"><Cell value={row[k]} name={k} locale={locale}/></td>)}<td className="min-w-40 px-5 py-4"><div className="flex items-center gap-2"><button className={buttonClass} onClick={()=>setDetails(row)}>{t('details')}</button>{resource&&<select aria-label={`${t('actions')} ${String(row.name??row.id??row.username??i)}`} value="" className="max-w-36 rounded-lg border border-border bg-input p-2 text-xs" onChange={e=>{if(e.target.value)setAction({method:e.target.value as Operation,row});}}><option value="">{t('actions')}</option>{resource.actions.filter(m=>!m.endsWith('.create')).map(m=><option value={m} key={m}>{catalog.operations[m as Operation].label[language]}</option>)}</select>}</div></td></tr>)}</tbody></table>{!visible.length&&<p className="py-16 text-center text-sm text-muted-foreground">{t('empty')}</p>}</div>
        {query.data?.limit&&<p className="mt-3 text-xs text-muted-foreground">{t('limit',{count:query.data.limit})}</p>}
        {query.data?.at&&<p className="mt-3 text-xs text-muted-foreground">{new Date(query.data.at).toLocaleString(locale)}</p>}
      </>}
    </Content>
    {details&&<Dialog open onOpenChange={open=>{if(!open)setDetails(null);}}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto nas-dialog border-border bg-popover text-foreground"><DialogTitle>{t('details')}</DialogTitle><DialogDescription>{String(details.name??details.id??details.username??title)}</DialogDescription><DetailTree data={details}/>{active==='datasets'&&typeof details.id==='string'&&<AclView path={`/mnt/${details.id}`}/>}</DialogContent></Dialog>}
    {action&&<OperationDialog key={`${action.method}:${String(action.row?.id??'new')}`} method={action.method} row={action.row} onClose={()=>setAction(null)} onDone={job=>{setNotice(job===null?t('completed'):`${t('submitted')} #${job}`);void queryClient.invalidateQueries({queryKey:['nas']});if(job!==null)activate('jobs');}}/>}
  </div>;
}
function Cell({value,name,locale}:{value:unknown;name:string;locale:string}) {
  const text=['size','allocated','free'].includes(name)?bytes(value,locale):display(value,locale);
  if(['state','status','healthy'].includes(name))return <span className={`inline-block rounded-sm px-2.5 py-1 text-xs ${['RUNNING','ONLINE','SUCCESS','COMPLETED','true','✓'].includes(text)?'bg-status-green/10 text-status-green':['FAILED','CRASHED','FAULTED','DEGRADED'].includes(text)?'bg-status-red/10 text-status-red':'bg-muted text-muted-foreground'}`}>{text}</span>;
  return <span className="line-clamp-3 break-words text-foreground" title={text}>{text}</span>;
}
function DetailTree({data}:{data:unknown}) {
  const t=useTranslations('nas');const locale=useLocale();
  if(Array.isArray(data))return <div className="space-y-2">{data.map((v,i)=><div key={i} className="rounded-lg border border-border p-2"><DetailTree data={v}/></div>)}</div>;
  if(data&&typeof data==='object')return <dl className="space-y-2">{Object.entries(data).map(([k,v])=><div className="border-b border-border py-2" key={k}><dt className="mb-1 text-xs text-muted-foreground">{fieldLabel(k,t)}</dt><dd className="break-words text-sm"><DetailTree data={v}/></dd></div>)}</dl>;
  return <span>{display(data,locale)}</span>;
}
function AclView({path}:{path:string}) {
  const t=useTranslations('nas');const query=useQuery({queryKey:['nas','acl',path],queryFn:async()=>{const r=await fetch(`/api/nas?resource=acl&path=${encodeURIComponent(path)}`);const result=await r.json();if(!r.ok)throw new Error(result.error);return result.data;},retry:false});
  return <details className="mt-4 border-t border-border pt-4"><summary className="cursor-pointer">ACL · {path}</summary>{query.error?<p className="mt-2 text-status-red">{query.error.message}</p>:query.isLoading?<p>{t('loading')}</p>:<DetailTree data={query.data}/>}</details>;
}
function Overview({data,onNavigate}:{data:unknown;onNavigate:(id:string)=>void}) {
  const t=useTranslations('nas');const locale=useLocale();const result=(data??{}) as Record<string,unknown>;const system=(result['system.info']??{}) as Record<string,unknown>;
  const pools=Array.isArray(result['pool.query'])?result['pool.query'] as Row[]:[];const apps=Array.isArray(result['app.query'])?result['app.query'] as Row[]:[];const alerts=Array.isArray(result['alert.list'])?result['alert.list'] as Row[]:[];
  const cards=[{title:t('version'),value:String(system.version??'—'),sub:String(system.hostname??''),id:'system'},{title:t('pools'),value:String(pools.length),sub:pools.map(p=>`${p.name} · ${p.status}`).join(', '),id:'pools'},{title:t('apps'),value:`${apps.filter(a=>a.state==='RUNNING').length} / ${apps.length}`,sub:t('running'),id:'apps'},{title:t('alerts'),value:String(alerts.filter(a=>!a.dismissed).length),sub:t('details'),id:'alerts'}];
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">{cards.map(c=><button key={c.id} onClick={()=>onNavigate(c.id)} className="rounded-lg border border-border bg-card p-6 text-left transition hover:border-primary/40"><p className="text-xs text-muted-foreground">{c.title}</p><p className="mt-4 break-all text-2xl font-semibold tracking-tight">{c.value}</p><p className="mt-3 truncate text-xs text-muted-foreground">{c.sub}</p></button>)}</div>
    {typeof result['interface.checkin_waiting']==='number'&&Number(result['interface.checkin_waiting'])>0&&<button className="w-full rounded-lg border border-status-amber/30 bg-status-amber/5 p-4 text-left text-sm text-status-amber" onClick={()=>onNavigate('network')}>{t('networkPending',{seconds:Number(result['interface.checkin_waiting'])})}</button>}
    <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-lg border border-border bg-card p-6"><h2 className="mb-5 text-lg font-medium">{t('pools')}</h2>{pools.map(p=><div key={String(p.id)} className="mb-4 rounded-md bg-muted p-4"><div className="flex justify-between"><span className="font-medium">{String(p.name)}</span><Cell value={p.status} name="status" locale={locale}/></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-status-green" style={{width:`${Number(p.size)>0?Math.min(100,Number(p.allocated)/Number(p.size)*100):0}%`}}/></div><p className="mt-3 text-xs text-muted-foreground">{bytes(p.allocated,locale)} / {bytes(p.size,locale)} · {bytes(p.free,locale)}</p></div>)}</section><section className="rounded-lg border border-border bg-card p-6"><h2 className="mb-5 text-lg font-medium">TrueNAS</h2><dl className="space-y-4 text-sm">{[[t('cpu'),system.model],[t('memory'),bytes(system.physmem,locale)],[t('uptime'),system.uptime]].map(([k,v])=><div key={String(k)} className="flex justify-between gap-6 border-b border-border pb-3"><dt className="text-muted-foreground">{String(k)}</dt><dd className="text-right text-foreground">{display(v,locale)}</dd></div>)}</dl></section></div>
  </div>;
}
