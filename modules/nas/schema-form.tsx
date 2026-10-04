'use client';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {initial,validate,variants,type Schema,type Value} from './schema';

export const inputClass='w-full rounded-md border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20';
export const buttonClass='rounded-md border border-border bg-muted px-3 py-2 text-sm transition hover:bg-secondary disabled:opacity-40';
export function fieldLabel(key:string,t:ReturnType<typeof useTranslations>) {return t.has(`fields.${key}`)?t(`fields.${key}`):key.replaceAll('_',' ');}
function unwrap(value:Value|undefined,schema:Schema):Value|undefined {
  if(value&&typeof value==='object'&&!Array.isArray(value)) {
    if('parsed' in value&&validate(schema,value.parsed).length===0)return value.parsed;
    if('value' in value)return value.value;
  }
  return value;
}

export function SchemaField({schema,value,onChange,name,seed,showOptional=false}:{schema:Schema;value:Value;onChange:(value:Value)=>void;name:string;seed?:Value;showOptional?:boolean}) {
  const t=useTranslations('nas');
  const choices=variants(schema);
  const [variant,setVariant]=useState(()=>Math.max(0,choices.findIndex(s=>validate(s,value).length===0)));
  if(choices.length)return <div className="space-y-3">
    <select aria-label={`${fieldLabel(name,t)} ${t('variant')}`} className={inputClass} value={variant} onChange={e=>{const index=Number(e.target.value);setVariant(index);onChange(initial(choices[index]));}}>
      {choices.map((s,i)=><option key={i} value={i}>{s.title??s.enum?.join(' / ')??s.type??String(i+1)}</option>)}
    </select>
    <SchemaField key={variant} schema={choices[variant]} value={value} onChange={onChange} name={name} seed={seed}/>
  </div>;
  if(schema.const!==undefined)return <div className="text-sm text-muted-foreground">{String(schema.const)}</div>;
  if(schema.enum)return <select aria-label={fieldLabel(name,t)} className={inputClass} value={JSON.stringify(value)} onChange={e=>onChange(JSON.parse(e.target.value))}>{schema.enum.map((v,i)=><option value={JSON.stringify(v)} key={i}>{v===null?'—':String(v)}</option>)}</select>;
  if(schema.type==='object') {
    const record=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    const seedRecord=seed&&typeof seed==='object'&&!Array.isArray(seed)?seed:{};
    const fields=Object.entries(schema.properties??{});
    const required=fields.filter(([k,s])=>schema.required?.includes(k)||s._required_);
    const optional=fields.filter(([k,s])=>!schema.required?.includes(k)&&!s._required_);
    const render=([key,s]:[string,Schema],isRequired:boolean)=>{
      const enabled=record[key]!==undefined;
      return <div key={key} className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-start gap-2">
          {!isRequired&&<input type="checkbox" aria-label={`${t('enableField')} ${fieldLabel(key,t)}`} checked={enabled} onChange={e=>{const next={...record};if(e.target.checked){const stored=unwrap(seedRecord[key],s);next[key]=stored!==undefined&&validate(s,stored).length===0?stored:initial(s);}else delete next[key];onChange(next);}}/>}
          <span className="text-sm font-medium">{fieldLabel(key,t)}{isRequired?' *':''}</span>
        </div>
        {(isRequired||enabled)&&<SchemaField schema={s} name={key} value={record[key]??initial(s)} seed={seedRecord[key]} onChange={v=>onChange({...record,[key]:v})}/>}
        {['memory','quota','refquota'].includes(key)&&<p className="text-xs text-muted-foreground">{t(key==='memory'?'memoryUnitHint':'quotaUnitHint')}</p>}
        {s.description&&<details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t('details')}</summary><p className="mt-1 whitespace-pre-wrap">{s.description}</p></details>}
      </div>;
    };
    return <div className="space-y-3">
      {required.map(f=>render(f,true))}
      {optional.length>0&&(showOptional?<div className="space-y-2">{optional.map(f=>render(f,false))}</div>:<details open={optional.some(([k])=>record[k]!==undefined)}><summary className="cursor-pointer py-2 text-sm text-muted-foreground">{t('optional')} ({optional.length})</summary><div className="space-y-2">{optional.map(f=>render(f,false))}</div></details>)}
      {!fields.length&&<MapFields value={record} onChange={onChange}/>}
    </div>;
  }
  if(schema.type==='array') {
    const items=Array.isArray(value)?value:[];const itemSchema=(Array.isArray(schema.items)?schema.items[0]:schema.items)??{type:'string'};
    return <div className="space-y-2">{items.map((item,i)=><div key={i} className="rounded-md border border-border p-3"><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>{i+1}</span><button type="button" onClick={()=>onChange(items.filter((_,j)=>j!==i))}>{t('remove')}</button></div><SchemaField schema={itemSchema} value={item} name={name} onChange={v=>onChange(items.map((x,j)=>j===i?v:x))}/></div>)}<button type="button" className={buttonClass} onClick={()=>onChange([...items,initial(itemSchema)])}>+ {t('add')}</button></div>;
  }
  if(schema.type==='null')return <span className="text-muted-foreground">—</span>;
  if(schema.type==='boolean')return <input type="checkbox" aria-label={fieldLabel(name,t)} checked={value===true} onChange={e=>onChange(e.target.checked)} className="size-5 accent-teal-400"/>;
  const numeric=schema.type==='number'||schema.type==='integer';
  if(name==='custom_compose_config_string'||name==='command'||name==='sshpubkey')return <textarea aria-label={fieldLabel(name,t)} className={`${inputClass} min-h-36 font-mono`} value={typeof value==='string'?value:''} onChange={e=>onChange(e.target.value)}/>;
  return <input aria-label={fieldLabel(name,t)} className={inputClass} type={numeric?'number':/password|passphrase|^key$/i.test(name)?'password':'text'} autoComplete="off" value={typeof value==='number'||typeof value==='string'?value:''} min={schema.minimum} max={schema.maximum} minLength={schema.minLength} maxLength={schema.maxLength} step={schema.type==='integer'?1:'any'} onChange={e=>onChange(numeric?Number(e.target.value):e.target.value)}/>;
}
function MapFields({value,onChange}:{value:Record<string,Value>;onChange:(value:Value)=>void}) {
  const t=useTranslations('nas');const [key,setKey]=useState('');
  return <div className="space-y-2">{Object.entries(value).map(([k,v])=><div className="flex gap-2" key={k}><span className="w-1/3 truncate py-2 text-sm">{k}</span><input aria-label={k} className={inputClass} value={String(v??'')} onChange={e=>onChange({...value,[k]:e.target.value})}/><button type="button" className={buttonClass} onClick={()=>{const next={...value};delete next[k];onChange(next);}}>{t('remove')}</button></div>)}<div className="flex gap-2"><input aria-label={t('field')} placeholder={t('field')} className={inputClass} value={key} onChange={e=>setKey(e.target.value)}/><button type="button" className={buttonClass} disabled={!key||['__proto__','constructor','prototype'].includes(key)} onClick={()=>{onChange({...value,[key]:''});setKey('');}}>{t('add')}</button></div></div>;
}
