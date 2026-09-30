'use client';
import Link from 'next/link';
import {Bell} from '@/components/icons/platform-icons';
import {DatePickerPopover} from '@/modules/system/components/status-bar/date-picker-popover';
import {useEffect,useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import {useQuery} from '@tanstack/react-query';
import {useCurrentUser} from '@/hooks/useCurrentUser';
import {LanguageSelect} from '@/i18n/language-select';
type Overview={
  'system.info':{hostname:string;version:string;model:string;physmem:number;uptime:string};
  'pool.query':{name:string;status:string;size:number;allocated:number}[];
  'app.query':{state:string}[];
  'alert.list':{dismissed:boolean}[];
};
function useOverview() {
  return useQuery({queryKey:['nas','overview'],queryFn:async()=>{
    const response=await fetch('/api/nas?resource=overview',{cache:'no-store'});const body=await response.json();
    if(!response.ok)throw new Error(body.error??'TrueNAS unavailable');return body as {data:Overview};
  },refetchInterval:30000,retry:false});
}
export function NasDesktopStatusBar({onOpenNotifications}:{onOpenNotifications?:()=>void}) {
  const locale=useLocale();const t=useTranslations('dynamic');const ui=useTranslations('ui');
  const [calendar,setCalendar]=useState(false);const [date,setDate]=useState(new Date());const {data:user}=useCurrentUser();
  const [now,setNow]=useState<Date|null>(null);
  useEffect(()=>{setNow(new Date());const timer=setInterval(()=>setNow(new Date()),1000);return()=>clearInterval(timer);},[]);
  return <header className="fixed left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-6 rounded-2xl border border-white/10 bg-black/40 px-5 py-3 text-xs text-white backdrop-blur-xl">
    <span>{t('greeting',{value0:user?.username??'—'})}</span><button aria-label={ui('notifications')} onClick={onOpenNotifications}><Bell className="size-4"/></button><div className="relative"><button aria-label={ui('openDatePicker')} onClick={()=>setCalendar(!calendar)}>{now?.toLocaleString(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})??'—'}</button>{calendar&&<DatePickerPopover selectedDate={date} onSelectDate={setDate} onClose={()=>setCalendar(false)}/>}</div>
  </header>;
}
export function NasDesktopWidgets() {
  const t=useTranslations('nas');const query=useOverview();const data=query.data?.data;
  return <aside className="hidden w-72 shrink-0 space-y-3 overflow-y-auto p-4 xl:block">
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white backdrop-blur"><p className="mb-3 font-medium">TrueNAS {data?.['system.info']?.version??'—'}</p>
      {query.error?<p role="alert" className="text-red-300">{query.error.message}</p>:data?<>
        {data['pool.query'].map(p=><p key={p.name} className="mb-3">{p.name} · {p.status}</p>)}
        <p className="mb-3">{t('apps')} · {data['app.query'].filter(a=>a.state==='RUNNING').length} / {data['app.query'].length}</p>
        <p>{t('alerts')} · {data['alert.list'].filter(a=>!a.dismissed).length}</p>
      </>:<p>{t('loading')}</p>}
      <Link href="/" className="mt-4 block text-teal-200">{t('title')} ↗</Link>
    </div>
  </aside>;
}
export function NasDesktopGeneral() {
  const t=useTranslations('nas');const query=useOverview();const info=query.data?.data['system.info'];
  return <div className="space-y-5 text-sm">
    {query.error&&<p role="alert" className="text-status-red">{query.error.message}</p>}
    <dl className="space-y-3">{[[t('version'),info?.version],[t('fields.hostname'),info?.hostname],[t('cpu'),info?.model],[t('memory'),info?`${(info.physmem/1024**3).toFixed(1)} GiB`:'—']].map(([k,v])=><div key={k} className="flex justify-between gap-4 border-b border-glass-border py-2"><dt className="text-muted-foreground">{k}</dt><dd>{v??'—'}</dd></div>)}</dl>
    <LanguageSelect/><Link href="/" className="block text-primary">{t('title')} ↗</Link>
  </div>;
}
