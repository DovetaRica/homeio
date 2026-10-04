import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
const batch = vi.hoisted(() => vi.fn());
vi.mock('./client', () => ({nasBatch: batch}));
import {readNasMonitor} from './monitor';
const now = 1_791_129_600;
const definitions = [{name: 'cpu'}, {name: 'memory'}, {name: 'load'}, {name: 'arcsize'}, {name: 'interface', identifiers: ['bond0']}, {name: 'disk', identifiers: ['sda | Model: test']}];
const metric = (legend: string[] = ['time', 'cpu'], data: unknown[][] = [[now - 1, 10]]) => [{legend, data, password: 'private'}];
beforeEach(() => {batch.mockReset(); vi.useFakeTimers(); vi.setSystemTime(now * 1000);});
afterEach(() => vi.useRealTimers());
describe('NAS reporting boundary', () => {
  it('selects bounded read-only graphs with a fixed five-minute period and projects system fields', async () => {
    batch.mockResolvedValueOnce([{model: 'CPU', physmem: 8e9, password: 'private'}, definitions]).mockResolvedValueOnce([metric(), metric(), metric(), metric(), metric(), metric()]);
    const result = await readNasMonitor();
    expect(result.system).toEqual({model: 'CPU', physmem: 8e9});
    expect(result.graphs).toHaveLength(6); expect(result.errors).toEqual([]);
    expect(batch.mock.calls[1][0][0]).toEqual({method: 'reporting.netdata_get_data', params: [[{name: 'cpu'}], {start: now - 300, end: now, aggregate: false}]});
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('retains successful metrics while reporting missing series instead of manufacturing zeros', async () => {
    batch.mockResolvedValueOnce([{model: 'CPU'}, definitions]).mockResolvedValueOnce([metric(), {nasError: 'private'}, metric(), metric(), metric(), metric()]);
    const result = await readNasMonitor();
    expect(result.errors).toContain('memory'); expect(result.graphs.find(graph => graph.name === 'memory')).toBeUndefined();
    expect(result.graphs.find(graph => graph.name === 'cpu')?.data).toEqual([[now - 1, 10]]);
  });
  it('caps identifiers and samples, excludes arbitrary graphs and preserves missing readings as null', async () => {
    const many = [{name: 'cpu'}, {name: 'credentials'}, {name: 'interface', identifiers: Array.from({length: 100}, (_, i) => `net${i}`)}, {name: 'disk', identifiers: Array.from({length: 100}, (_, i) => `disk${i}`)}];
    const rows = Array.from({length: 600}, (_, i) => [now - 300 + i / 2, i === 599 ? null : 5, 'unexpected']);
    batch.mockResolvedValueOnce([{}, many]).mockResolvedValueOnce(Array.from({length: 25}, () => metric(['time', 'cpu'], rows)));
    const result = await readNasMonitor();
    expect(batch.mock.calls[1][0]).toHaveLength(25);
    expect(result.graphs[0].data).toHaveLength(301); expect(result.graphs[0].data.at(-1)).toEqual([now + 0.5 - 1, null]);
    expect(JSON.stringify(batch.mock.calls[1])).not.toContain('credentials');
  });
  it('rejects an entirely unavailable monitoring response', async () => {
    batch.mockResolvedValueOnce([{nasError: 'private'}, {nasError: 'private'}]);
    await expect(readNasMonitor()).rejects.toThrow('monitoring data is unavailable');
    expect(batch).toHaveBeenCalledTimes(1);
  });
});
