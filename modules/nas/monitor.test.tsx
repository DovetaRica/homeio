// @vitest-environment jsdom
import {beforeEach, afterEach, describe, expect, it, vi} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {NextIntlClientProvider} from 'next-intl';
import zh from '@/messages/zh-CN.json';
import {NasMonitor} from './monitor';
const fetcher = vi.fn();
const now = Math.floor(Date.now() / 1000);
const response = (graphs: unknown[], errors: string[] = []) => new Response(JSON.stringify({data: {system: {physmem: 8 * 1024 ** 3}, graphs, errors}}));
function show(active = true) {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}><NextIntlClientProvider locale="zh-CN" messages={zh}><NasMonitor active={active}/></NextIntlClientProvider></QueryClientProvider>);
}
beforeEach(() => {fetcher.mockReset(); vi.stubGlobal('fetch', fetcher);});
afterEach(() => vi.unstubAllGlobals());
describe('Dedicated NAS monitor', () => {
  it('reads monitoring data and converts middleware network kilobits and disk KiB to bytes per second', async () => {
    fetcher.mockResolvedValue(response([
      {name: 'cpu', identifier: 'cpu', legend: ['time', 'cpu'], data: [[now, 12]]},
      {name: 'interface', identifier: 'bond0', legend: ['time', 'received', 'sent'], data: [[now, 8192, 4096]]},
      {name: 'disk', identifier: 'sda | Model: private', legend: ['time', 'reads', 'writes'], data: [[now, 1024, 512]]},
    ])); show();
    await waitFor(() => expect(screen.getByText('12%')).toBeTruthy());
    expect(screen.getByRole('heading', {name: '性能监控'})).toBeTruthy();
    expect(screen.getByText('1000 KiB/s')).toBeTruthy();
    expect(screen.getByText('1 MiB/s')).toBeTruthy();
    expect(screen.queryByText('Model: private')).toBeNull();
    expect(fetcher.mock.calls[0][0]).toBe('/api/nas?resource=monitor');
    expect(screen.queryByText('系统设置')).toBeNull();
  });
  it('marks a failed refresh as stale while retaining the last successful sample', async () => {
    fetcher.mockResolvedValueOnce(response([{name: 'cpu', identifier: 'cpu', legend: ['time', 'cpu'], data: [[now, 12]]}])).mockRejectedValue(new Error('unreachable'));
    show(); await waitFor(() => expect(screen.getByText('12%')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', {name: '刷新'}));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('上次采样'));
    expect(screen.getByText('12%')).toBeTruthy();
  });
  it('does not display missing CPU readings as zero', async () => {
    fetcher.mockResolvedValue(response([], ['cpu'])); show();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText('0%')).toBeNull();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
  it('does not start a request for a minimized window', () => {
    show(false); expect(fetcher).not.toHaveBeenCalled();
  });
});
