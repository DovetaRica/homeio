// @vitest-environment jsdom
import {describe,expect,it,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import zh from '@/messages/zh-CN.json';
import {NasDashboard} from './dashboard';
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/i18n/language-select',()=>({LanguageSelect:()=>null}));
describe('TrueNAS panel navigation',()=>{
  it('keeps VMs on the primary navigation and opens creation without mutating the NAS',async()=>{
    const fetcher=vi.fn(async(input:unknown)=>new Response(JSON.stringify({data:String(input).includes('resource=overview')?{'system.info':{version:'25.10.6'},'pool.query':[],'app.query':[],'alert.list':[]}:[]})));
    vi.stubGlobal('fetch',fetcher);
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><NextIntlClientProvider locale="zh-CN" messages={zh} timeZone="Asia/Shanghai"><NasDashboard officialUrl="https://192.168.31.221"/></NextIntlClientProvider></QueryClientProvider>);
    const vm=screen.getByRole('button',{name:'虚拟机',exact:true});expect(vm).toBeTruthy();
    fireEvent.click(vm);await waitFor(()=>expect(screen.getByRole('combobox',{name:'操作',exact:true})).toBeTruthy());
    fireEvent.change(screen.getByRole('combobox',{name:'操作',exact:true}),{target:{value:'vm.create'}});
    await waitFor(()=>expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByRole('textbox',{name:'名称',exact:true})).toBeTruthy();
    expect(fetcher.mock.calls.every(([url])=>String(url).startsWith('/api/nas?'))).toBe(true);
    vi.unstubAllGlobals();
  });
});
