// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import zh from '@/messages/zh-CN.json';
import {NasDashboard} from './dashboard';
import {JobProgress,trackNasJob} from './job-progress';
import {OperationDialog} from './operation-dialog';
vi.mock('next/navigation',()=>({useRouter:()=>({replace:vi.fn(),refresh:vi.fn()})}));
vi.mock('@/i18n/language-select',()=>({LanguageSelect:()=>null}));
function mount(element:React.ReactNode,client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})) {
  render(<QueryClientProvider client={client}><NextIntlClientProvider locale="zh-CN" messages={zh} timeZone="Asia/Shanghai">{element}</NextIntlClientProvider></QueryClientProvider>);
  return client;
}
afterEach(()=>{cleanup();sessionStorage.clear();vi.unstubAllGlobals();});
describe('NAS failure, pagination and operation feedback',()=>{
  it('does not display a failed pool read as zero healthy pools',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({data:{'system.info':{version:'25.10.6'},'app.query':[],'alert.list':[]},errors:{'pool.query':'read failed'},at:'2026-10-04T00:00:00Z'})));
    mount(<NasDashboard officialUrl="https://example.test"/>);
    await screen.findByText('25.10.6');
    const card=screen.getAllByRole('button',{name:/存储池/}).find(button=>button.textContent?.includes('读取失败'))!;
    expect(card.textContent).toContain('—');expect(card.textContent).toContain('读取失败');
  });
  it('keeps last successful values explicitly marked stale on partial refresh',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({data:{'pool.query':[{id:1,name:'maindata',status:'ONLINE'}],'system.info':{version:'25.10.6'},'app.query':[],'alert.list':[]}})).mockResolvedValue(Response.json({data:{'system.info':{version:'25.10.6'},'app.query':[],'alert.list':[]},errors:{'pool.query':'unavailable'}}));
    vi.stubGlobal('fetch',fetcher);mount(<NasDashboard officialUrl="https://example.test"/>);
    await screen.findByText('25.10.6');fireEvent.click(screen.getByRole('button',{name:'刷新',exact:true}));
    await screen.findByText('更新失败，显示上次读取的数据');
    expect(screen.getAllByRole('button',{name:/存储池/}).find(button=>button.textContent?.includes('更新失败'))!.textContent).toContain('1');
  });
  it('requests the next page and searches on the server beyond the first page',async()=>{
    const fetcher=vi.fn(async(input:unknown)=>{const url=new URL(String(input),'https://example.test');const offset=Number(url.searchParams.get('offset')??0);return Response.json({data:[{id:offset+1,method:'app.start',state:'SUCCESS'}],offset,limit:50,total:101,hasMore:offset===0});});
    vi.stubGlobal('fetch',fetcher);mount(<NasDashboard initialResource="jobs" officialUrl="https://example.test"/>);
    await waitFor(()=>expect(screen.getByRole('button',{name:'下一页'}).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button',{name:'下一页'}));
    await waitFor(()=>expect(fetcher.mock.calls.some(([url])=>String(url).includes('offset=50'))).toBe(true));
    fireEvent.change(await screen.findByRole('textbox',{name:zh.nas.search}),{target:{value:'vm'}});
    await waitFor(()=>expect(fetcher.mock.calls.some(([url])=>String(url).includes('search=vm')&&String(url).includes('offset=0'))).toBe(true));
  });
  it('tracks a specific completed job across navigation and does not poll it forever',async()=>{
    const fetcher=vi.fn(async()=>Response.json({data:{id:42,state:'FAILED',error:'job failed'},at:'2026-10-04T00:00:00Z'}));vi.stubGlobal('fetch',fetcher);
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});trackNasJob(client,{id:42,method:'app.start',target:'example',at:new Date().toISOString()});
    mount(<JobProgress onNavigate={vi.fn()}/>,client);await screen.findByText(/失败 · #42/);
    expect(fetcher.mock.calls[0][0]).toContain('jobId=42');expect(sessionStorage.getItem('homeio.nas.active-operation')).toContain('example');
  });
  it('shows current and proposed app state and blocks resubmission after an uncertain outcome',async()=>{
    const uncertain=vi.fn();const done=vi.fn();
    const fetcher=vi.fn().mockResolvedValueOnce(Response.json({token:'token',target:'example',changes:['example'],previewComplete:true,diff:[{path:'state',before:'STOPPED',after:'RUNNING',beforeAvailable:true}]})).mockResolvedValueOnce(Response.json({error:'timeout',code:'unknown_outcome',outcome:'unknown'},{status:502}));vi.stubGlobal('fetch',fetcher);
    mount(<OperationDialog method="app.start" row={{id:'example'}} onClose={vi.fn()} onDone={done} onUncertain={uncertain}/>);
    fireEvent.click(screen.getByRole('button',{name:zh.nas.review}));await screen.findByText('当前值');expect(screen.getByText('STOPPED')).toBeTruthy();
    const inputs=screen.getAllByRole('textbox');fireEvent.change(inputs[0],{target:{value:'example'}});
    fireEvent.change(document.querySelector('input[type=password]')!,{target:{value:'test-password'}});
    fireEvent.click(screen.getByRole('button',{name:zh.nas.confirm}));
    await screen.findByRole('button',{name:'关闭并核实状态'});expect(uncertain).toHaveBeenCalledWith('example');expect(done).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:zh.nas.confirm})).toBeNull();
  });
});
