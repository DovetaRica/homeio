'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useQuery} from '@tanstack/react-query';
import type {NasMetric, NasMonitorData} from '@/lib/shared/contracts/nas-monitor';
import {fetchNasResource, formatNasTime} from './resource-query';

function latest(graph: NasMetric | undefined, dimension: string): number | null {
  const index = graph?.legend.indexOf(dimension) ?? -1;
  const value = graph?.data.at(-1)?.[index];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function samples(graph: NasMetric | undefined, dimension: string): (number | null)[] {
  const index = graph?.legend.indexOf(dimension) ?? -1;
  return graph?.data.map(row => row[index] ?? null) ?? [];
}
function bytes(value: number | null | undefined, locale: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '—';
  const power = value > 0 ? Math.min(4, Math.max(0, Math.floor(Math.log(value) / Math.log(1024)))) : 0;
  return `${(value / 1024 ** power).toLocaleString(locale, {maximumFractionDigits: 2, useGrouping: false})} ${['B', 'KiB', 'MiB', 'GiB', 'TiB'][power]}`;
}

function Trend({series, label, ceiling}: {series: (number | null)[][]; label: string; ceiling?: number}) {
  const values = series.flat().filter((value): value is number => typeof value === 'number');
  const maximum = ceiling ?? Math.max(1, ...values.map(Math.abs));
  if (!values.length) return <div className="nas-monitor-trend nas-monitor-no-data">—</div>;
  return <svg className="nas-monitor-trend" viewBox="0 0 500 90" role="img" aria-label={label} preserveAspectRatio="none">
    {[15, 45, 75].map(y => <line key={y} x1="0" x2="500" y1={y} y2={y} className="nas-monitor-gridline"/>)}
    {series.map((values, index) => {
      let pen = false;
      const path = values.map((value, point) => {
        if (value === null) {pen = false; return '';}
        const x = values.length > 1 ? point / (values.length - 1) * 500 : 250;
        const y = 85 - Math.min(1, Math.abs(value) / maximum) * 80;
        const segment = `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
        pen = true;
        return segment;
      }).join(' ');
      return <path key={index} d={path} className={`nas-monitor-series nas-monitor-series-${index}`} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke"/>;
    })}
  </svg>;
}

export function NasMonitor({active = true}: {active?: boolean}) {
  const t = useTranslations('nasMonitor');
  const locale = useLocale();
  const size = (value: number | null | undefined) => bytes(value, locale);
  const query = useQuery({queryKey: ['nas-monitor'], queryFn: ({signal}) => fetchNasResource('monitor', {}, signal), enabled: active, refetchInterval: 10_000, retry: false});
  const data = query.data?.data as NasMonitorData | undefined;
  const graph = (name: string) => data?.graphs.find(item => item.name === name);
  const cpu = graph('cpu');
  const memory = graph('memory');
  const load = graph('load');
  const arc = graph('arcsize');
  const cpuValue = latest(cpu, 'cpu');
  const available = latest(memory, 'available');
  const loadValue = latest(load, 'shortterm');
  const percentage = (value: number | null) => value === null ? '—' : `${value.toLocaleString(locale, {maximumFractionDigits: 1})}%`;
  const cards = [
    {label: t('cpu'), value: percentage(cpuValue), sub: data?.system.model ?? '', series: [samples(cpu, 'cpu')], ceiling: 100},
    {label: t('memory'), value: size(available), sub: t('totalMemory', {value: size(data?.system.physmem)}), series: [samples(memory, 'available')], ceiling: data?.system.physmem},
    {label: t('load'), value: loadValue === null ? '—' : loadValue.toLocaleString(locale, {maximumFractionDigits: 2}), sub: t('loadPeriod'), series: [samples(load, 'shortterm')]},
    {label: t('arc'), value: size(latest(arc, 'size')), sub: t('arcHint'), series: [samples(arc, 'size')]},
  ];
  const group = (name: string) => data?.graphs.filter(item => item.name === name) ?? [];
  const lastSample = Math.max(0, ...(data?.graphs.flatMap(item => item.data.slice(-1).map(row => Number(row[0]))) ?? []));
  const stale = query.isError || (!!lastSample && Date.now() / 1000 - lastSample > 30);
  return <div className="nas-monitor">
    <header className="nas-monitor-heading"><div><h1>{t('title')}</h1><p>{t('description')}</p></div><button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>{t('refresh')}</button></header>
    {query.isError && <div className="nas-read-error" role="alert">{t(data ? 'stale' : 'failed')}</div>}
    {!!data?.errors.length && <div className="nas-read-error" role="alert"><p>{t('partial')}</p><details><summary>{t('details')}</summary>{data.errors.map(error => <p key={error}>{error}</p>)}</details></div>}
    {query.isLoading ? <p className="nas-monitor-loading">{t('loading')}</p> : <>
      <div className="nas-monitor-cards">{cards.map(card => <section key={card.label} className="nas-monitor-card"><h2>{card.label}</h2><strong>{card.value}</strong><p>{card.sub}</p><Trend series={card.series} label={t('trend', {name: card.label})} ceiling={card.ceiling}/></section>)}</div>
      <div className="nas-monitor-io">{(['interface', 'disk'] as const).map(name => <section key={name}><h2>{t(name === 'interface' ? 'network' : 'disks')}</h2><p className="nas-monitor-caption">{t(name === 'interface' ? 'networkUnits' : 'diskUnits')}</p>{!group(name).length && <p>{t('unavailable')}</p>}{group(name).map(item => {
        const first = name === 'interface' ? 'received' : 'reads';
        const second = name === 'interface' ? 'sent' : 'writes';
        const label = item.identifier.split('|')[0].trim();
        const format = (value: number | null) => value === null ? '—' : `${size(Math.abs(value) * (name === 'interface' ? 1000 / 8 : 1024))}/s`;
        return <article key={item.identifier} className="nas-monitor-device"><h3>{label}</h3><div className="nas-monitor-rates"><span>{t(first)} <b>{format(latest(item, first))}</b></span><span>{t(second)} <b>{format(latest(item, second))}</b></span></div><Trend series={[samples(item, first), samples(item, second)]} label={t('trend', {name: label})}/></article>;
      })}</section>)}</div>
      <footer className={stale ? 'nas-monitor-stale' : ''}>{stale ? t('stale') : t('source')}{lastSample > 0 && <span> · {t('sampleAt', {time: formatNasTime(lastSample * 1000, locale)})}</span>}</footer>
    </>}
  </div>;
}
