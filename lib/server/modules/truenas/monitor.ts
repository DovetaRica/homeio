import {nasBatch} from './client';
import type {NasMetric, NasMonitorData} from '@/lib/shared/contracts/nas-monitor';

const SCALARS = ['cpu', 'memory', 'load', 'arcsize'];
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const failed = (value: unknown) => value === undefined || value === null || !!record(value)?.nasError;

// Fixed read-only graph selection: clients cannot supply middleware methods,
// identifiers, arbitrary periods or unbounded series.
export async function readNasMonitor(): Promise<NasMonitorData> {
  const [systemResult, definitions] = await nasBatch([{method: 'system.info'}, {method: 'reporting.netdata_graphs'}]);
  const errors: string[] = [];
  const system = record(systemResult);
  if (failed(systemResult)) errors.push('system.info');
  if (!Array.isArray(definitions)) errors.push('reporting.netdata_graphs');
  const selection: {name: string; identifier?: string}[] = [];
  for (const name of SCALARS) {
    if (Array.isArray(definitions) && definitions.some(value => record(value)?.name === name)) selection.push({name});
    else errors.push(name);
  }
  for (const [name, limit] of [['interface', 8], ['disk', 16]] as const) {
    const definition = Array.isArray(definitions) ? definitions.map(record).find(value => value?.name === name) : null;
    const identifiers = definition?.identifiers;
    if (Array.isArray(identifiers)) {
      for (const identifier of [...new Set(identifiers.filter((value): value is string => typeof value === 'string' && value.length <= 512))].slice(0, limit)) selection.push({name, identifier});
    }
  }
  const end = Math.floor(Date.now() / 1000);
  const results = selection.length ? await nasBatch(selection.map(graph => ({method: 'reporting.netdata_get_data', params: [[graph], {start: end - 300, end, aggregate: false}]}))) : [];
  const graphs: NasMetric[] = [];
  selection.forEach((selected, index) => {
    const result = Array.isArray(results[index]) ? record(results[index][0]) : null;
    const key = selected.identifier ? `${selected.name}:${selected.identifier}` : selected.name;
    if (!result || !Array.isArray(result.legend) || !Array.isArray(result.data)) {errors.push(key); return;}
    const legend = result.legend.slice(0, 20);
    if (!legend.every(value => typeof value === 'string') || legend[0] !== 'time') {errors.push(key); return;}
    const rows = result.data.filter((row): row is unknown[] => Array.isArray(row) && typeof row[0] === 'number' && Number.isFinite(row[0]) && row[0] >= end - 300 && row[0] <= end).slice(-301);
    const data = rows.map(row => legend.map((_, column) => typeof row[column] === 'number' && Number.isFinite(row[column]) ? row[column] as number : null)).sort((a, b) => Number(a[0]) - Number(b[0]));
    if (!data.length) {errors.push(key); return;}
    graphs.push({name: selected.name, identifier: selected.identifier ?? selected.name, legend: legend as string[], data});
  });
  if (!graphs.length) throw new Error('TrueNAS monitoring data is unavailable');
  return {
    system: {
      ...(typeof system?.model === 'string' ? {model: system.model} : {}),
      ...(typeof system?.physmem === 'number' && Number.isFinite(system.physmem) ? {physmem: system.physmem} : {}),
      ...(typeof system?.uptime === 'string' ? {uptime: system.uptime} : {}),
    },
    graphs,
    errors,
  };
}
