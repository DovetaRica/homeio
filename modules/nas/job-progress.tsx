'use client';

import {useEffect, useRef} from 'react';
import {useQuery, useQueryClient, type QueryClient} from '@tanstack/react-query';
import {useLocale, useTranslations} from 'next-intl';
import catalog from './catalog.json';
import {fetchNasResource, formatNasTime} from './resource-query';
import {buttonClass} from './schema-form';

export type TrackedJob = {id: number | null; method: string; target: string; at: string};
const trackerKey = ['nas-active-operation'];
const storageKey = 'homeio.nas.active-operation';
const terminal = new Set(['SUCCESS', 'FAILED', 'ABORTED']);

export function trackNasJob(client: QueryClient, job: TrackedJob) {
  client.setQueryData(trackerKey, job);
  try { sessionStorage.setItem(storageKey, JSON.stringify(job)); } catch { /* memory cache remains available */ }
}

export function JobProgress({onNavigate}: {onNavigate: (resource: string) => void}) {
  const t = useTranslations('nas');
  const locale = useLocale();
  const client = useQueryClient();
  const completed = useRef<string | null>(null);
  const tracker = useQuery<TrackedJob | null>({queryKey: trackerKey, queryFn: () => null, initialData: null, enabled: false, gcTime: Infinity});
  useEffect(() => {
    if (client.getQueryData(trackerKey)) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (saved && (saved.id === null || (Number.isSafeInteger(saved.id) && saved.id > 0)) &&
        typeof saved.method === 'string' && Object.hasOwn(catalog.operations, saved.method) &&
        typeof saved.target === 'string' && saved.target.length <= 1024 &&
        typeof saved.at === 'string' && Number.isFinite(Date.parse(saved.at))) {
        client.setQueryData(trackerKey, saved);
      }
    } catch { /* ignore invalid or unavailable browser storage */ }
  }, [client]);
  const tracked = tracker.data;
  const query = useQuery({
    queryKey: ['nas', 'job', tracked?.id],
    enabled: tracked?.id != null,
    queryFn: ({signal}) => fetchNasResource('job', {jobId: tracked!.id!}, signal),
    retry: false,
    refetchInterval: state => terminal.has(String((state.state.data?.data as {state?: string} | undefined)?.state)) ? false : 5000,
  });
  const job = query.data?.data as {state?: string; progress?: {percent?: number; description?: string}; error?: string} | undefined;
  const state = job?.state ?? 'WAITING';
  useEffect(() => {
    if (tracked?.id == null || !terminal.has(state)) return;
    const key = `${tracked.id}:${state}`;
    if (completed.current === key) return;
    completed.current = key;
    void client.invalidateQueries({queryKey: ['nas'], predicate: item => item.queryKey[1] !== 'job'});
  }, [client, state, tracked?.id]);
  if (!tracked) return null;
  const operation = catalog.operations[tracked.method as keyof typeof catalog.operations];
  const title = operation?.label[locale === 'zh-CN' ? 'zh-CN' : 'en'] ?? tracked.method;
  const unknown = tracked.id === null;
  const failed = state === 'FAILED' || state === 'ABORTED';
  const status = unknown ? t('unknownOutcome') : query.error ? t('jobReadFailed') : t.has(`states.${state}`) ? t(`states.${state}`) : state;
  function dismiss() {
    client.setQueryData(trackerKey, null);
    try { sessionStorage.removeItem(storageKey); } catch { /* cache already cleared */ }
  }
  const percent = Math.min(100, Math.max(0, Number(job?.progress?.percent) || 0));
  return <section className={`nas-operation-status ${unknown || failed || query.error ? 'nas-operation-attention' : ''}`} aria-label={t('currentOperation')} role="status">
    <div className="nas-operation-heading"><strong>{title} · {tracked.target}</strong><span>{status}{tracked.id != null && ` · #${tracked.id}`}</span></div>
    <p className="text-xs text-muted-foreground">{t('submittedAt', {time: formatNasTime(tracked.at, locale)})}</p>
    {unknown ? <p className="text-sm">{t('unknownOutcomeHint')}</p> : !terminal.has(state) && !query.error ? <div className="nas-job-meter" aria-label={t('progress')} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width: `${percent}%`}}/></div> : null}
    {job?.error && <p className="text-sm text-status-red">{t('jobFailedHint')}</p>}
    {(job?.error || job?.progress?.description || query.error) && <details className="text-xs text-muted-foreground"><summary>{t('technicalDetails')}</summary><p className="break-words">{job?.error ?? query.error?.message ?? job?.progress?.description}</p></details>}
    <div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={() => onNavigate('jobs')}>{t('viewJobs')}</button>{!unknown && <button className={buttonClass} disabled={query.isFetching} onClick={() => void query.refetch()}>{t('refresh')}</button>}<button className={buttonClass} onClick={dismiss}>{t(unknown || !terminal.has(state) ? 'hideTracking' : 'dismissResult')}</button></div>
  </section>;
}
