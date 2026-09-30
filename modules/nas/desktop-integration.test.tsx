// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest';
import {render,renderHook,screen,fireEvent,waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import type {ReactNode} from 'react';
import zh from '@/messages/zh-CN.json';
import {DesktopModeProvider,desktopSectionEnabled} from '@/modules/shell/desktop-mode';
import {useNetworkStatus} from '@/modules/system/hooks/useNetworkStatus';
import {useGoogleDriveConnections} from '@/modules/files/hooks/useGoogleDrive';
import {useUsbDrives} from '@/modules/files/hooks/useUsbDrives';
import {NasInfrastructurePanel} from './infrastructure-panel';
import {validateOperation} from '@/lib/server/modules/truenas/policy';
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/i18n/language-select',()=>({LanguageSelect:()=>null}));
function wrapper({children}:{children:ReactNode}) {
  return <QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><NextIntlClientProvider locale="zh-CN" messages={zh}><DesktopModeProvider nasMode>{children}</DesktopModeProvider></NextIntlClientProvider></QueryClientProvider>;
}
describe('NAS desktop integration',()=>{
  it('retains Infrastructure while removing unwanted desktop operations',()=>{
    for(const id of ['network','storage','docker'])expect(desktopSectionEnabled(id,true)).toBe(true);
    for(const id of ['updates','backup','power'])expect(desktopSectionEnabled(id,true)).toBe(false);
    expect(()=>validateOperation('system.shutdown',[])).toThrow();
    expect(()=>validateOperation('system.reboot',[])).toThrow();
  });
  it('loads actual NAS resource endpoints when switching Infrastructure tabs',async()=>{
    const fetcher=vi.fn(async(url:unknown)=>new Response(JSON.stringify({data:String(url).includes('networkConfig')?{ipv4gateway:'192.168.31.1',nameserver1:'192.168.31.1'}:[{id:'bond0',name:'bond0',type:'LINK_AGGREGATION'}]})));
    vi.stubGlobal('fetch',fetcher);
    render(<NasInfrastructurePanel section="network"/>,{wrapper});
    await waitFor(()=>expect(screen.getByText('bond0')).toBeTruthy());
    fireEvent.click(screen.getByRole('button',{name:'网关与 DNS',exact:true}));
    await waitFor(()=>expect(screen.getAllByText('192.168.31.1').length).toBeGreaterThan(0));
    expect(fetcher.mock.calls.every(([url])=>String(url).startsWith('/api/nas?resource='))).toBe(true);
    vi.unstubAllGlobals();
  });
  it('does not request disabled host network, USB or Google Drive APIs',()=>{
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    renderHook(()=>{useNetworkStatus();useGoogleDriveConnections();useUsbDrives();},{wrapper});
    expect(fetcher).not.toHaveBeenCalled();vi.unstubAllGlobals();
  });
});
