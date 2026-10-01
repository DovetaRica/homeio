// @vitest-environment jsdom
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {NextIntlClientProvider} from 'next-intl';
import {messagesForLocale} from '@/i18n/messages';
import catalog from '@/modules/nas/catalog.json';
import {DEFAULT_APPEARANCE_SETTINGS} from '@/lib/desktop/appearance';
import type {SettingsBackend} from './panel/types';
import {SystemSettings} from './system-settings';
import {SYSTEM_SECTION_IDS, resolveSystemSection} from '../system-navigation';

vi.mock('next/navigation', () => ({useRouter: () => ({replace: vi.fn(), refresh: vi.fn()})}));
vi.mock('@/i18n/language-select', () => ({LanguageSelect: () => <span>Language selector</span>}));
vi.mock('./panel/sections/two-factor-card', () => ({TwoFactorCard: () => <span>Two factor</span>}));
afterEach(() => {cleanup(); vi.unstubAllGlobals();});

const backend = {general: {username: 'admin', twoFactor: {enabled: false, enrolledAt: null}}} as SettingsBackend;
function setup(selectedSection = 'overview', locale = 'zh-CN') {
  const fetcher = vi.fn(async (url: unknown) => new Response(JSON.stringify({data: String(url).includes('overview') ? {'system.info': {version: '25.10.6'}, 'pool.query': [], 'app.query': [], 'alert.list': []} : String(url).includes('networkConfig') ? {ipv4gateway: '192.168.31.1'} : []})));
  vi.stubGlobal('fetch', fetcher);
  const client = new QueryClient({defaultOptions: {queries: {retry: false, gcTime: 0}}});
  const view = (section: string, key = 0) => <QueryClientProvider client={client}><NextIntlClientProvider locale={locale} messages={messagesForLocale(locale)} timeZone="Asia/Shanghai"><SystemSettings backend={backend} definitions={[]} selectedSection={section} selectionRequestKey={key} appearance={DEFAULT_APPEARANCE_SETTINGS} onAppearanceChange={vi.fn()}/></NextIntlClientProvider></QueryClientProvider>;
  return {fetcher, view, ...render(view(selectedSection))};
}

describe('Unified system settings', () => {
  it('retains every NAS resource and maps the previous Infrastructure shortcuts', () => {
    expect(catalog.resources.every(resource => SYSTEM_SECTION_IDS.includes(resource.id))).toBe(true);
    expect(resolveSystemSection('general')).toBe('overview');
    expect(resolveSystemSection('storage')).toBe('pools');
    expect(resolveSystemSection('docker')).toBe('apps');
    expect(SYSTEM_SECTION_IDS).not.toContain('power');
    expect(SYSTEM_SECTION_IDS).not.toContain('updates');
    expect(SYSTEM_SECTION_IDS).not.toContain('backup');
  });
  it('uses one navigation and one heading when accessing real gateway data', async () => {
    const {fetcher} = setup('networkConfig');
    await waitFor(() => expect(screen.getByText('192.168.31.1')).toBeTruthy());
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);
    expect(screen.getByRole('heading', {name: '网关与 DNS'})).toBeTruthy();
    expect(fetcher.mock.calls.some(([url]) => String(url) === '/api/nas?resource=networkConfig')).toBe(true);
  });
  it('keeps VMs visible and opens a creation dialog without any NAS mutation', async () => {
    const {fetcher} = setup();
    fireEvent.click(screen.getByRole('button', {name: '虚拟机', exact: true}));
    await waitFor(() => expect(screen.getByRole('combobox', {name: '操作', exact: true})).toBeTruthy());
    fireEvent.change(screen.getByRole('combobox', {name: '操作', exact: true}), {target: {value: 'vm.create'}});
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('textbox', {name: '名称', exact: true})).toBeTruthy();
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith('/api/nas?resource='))).toBe(true);
  });
  it('lets a repeated desktop shortcut reopen its target after internal navigation', async () => {
    const {view, rerender} = setup();
    fireEvent.click(screen.getByRole('button', {name: '虚拟机', exact: true}));
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('虚拟机');
    rerender(view('overview', 1));
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('总览');
    fireEvent.click(screen.getByRole('button', {name: '桌面偏好', exact: true}));
    fireEvent.click(screen.getByRole('button', {name: '外观', exact: true}));
    expect(screen.getByLabelText('程序坞位置')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });
  it('finds English settings and resources across collapsed categories', () => {
    setup('overview', 'en');
    fireEvent.change(screen.getByRole('textbox', {name: 'Find a setting…'}), {target: {value: 'DNS'}});
    const nav = within(screen.getByRole('navigation'));
    fireEvent.click(nav.getByRole('button', {name: 'Gateway and DNS', exact: true}));
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('Gateway and DNS');
  });
});
