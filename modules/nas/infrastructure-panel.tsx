'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useLocale,useTranslations} from 'next-intl';
import catalog from './catalog.json';
import {NasDashboard} from './dashboard';
const resources={network:['network','networkConfig'],storage:['pools','datasets','disks','snapshots','smb','scrub'],docker:['apps']} as const;
export function NasInfrastructurePanel({section}:{section:keyof typeof resources}) {
  const language=useLocale()==='zh-CN'?'zh-CN':'en';const t=useTranslations('nas');
  const [resource,setResource]=useState<string>(resources[section][0]);
  return <div>
    <div className="mb-4 flex flex-wrap gap-2">{resources[section].map(id=><button key={id} onClick={()=>setResource(id)} className={`rounded-lg border px-3 py-2 text-xs ${resource===id?'border-primary/30 bg-primary/10 text-foreground':'border-glass-border text-muted-foreground'}`}>{catalog.resources.find(r=>r.id===id)!.label[language]}</button>)}</div>
    <Link href="/" className="mb-4 inline-block text-xs text-primary">{t('title')} ↗</Link>
    <NasDashboard key={resource} initialResource={resource} embedded officialUrl="http://192.168.31.221"/>
  </div>;
}
