import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({call:vi.fn()}));
vi.mock('./client',()=>({nasCall:mocks.call,nasBatch:vi.fn()}));
import {assertUnchanged,preparePreview,StalePreviewError} from './preview';
beforeEach(()=>{mocks.call.mockReset();});
describe('approved preview before-state mappings',()=>{
  it('diffs only submitted dataset fields and unwraps parsed values',async()=>{
    mocks.call.mockResolvedValue({id:'maindata/example',compression:{value:'LZ4',parsed:'LZ4',source:'LOCAL'},quota:{value:0,parsed:0}});
    const preview=await preparePreview('pool.dataset.update',['maindata/example',{compression:'ZSTD'}]);
    expect(mocks.call).toHaveBeenCalledWith('pool.dataset.query',[[['id','=','maindata/example']],{get:true}]);
    expect(preview.diff).toEqual([{path:'compression',before:'LZ4',after:'ZSTD',beforeAvailable:true}]);
    expect(preview.previewComplete).toBe(true);
    expect(typeof preview.baseline).toBe('string');
  });
  it('does not pretend an unavailable before value is known',async()=>{
    mocks.call.mockResolvedValue({id:7});
    const preview=await preparePreview('vm.update',[7,{name:'renamed',vcpus:4}]);
    expect(preview.diff).toEqual([{path:'name',before:null,after:'renamed',beforeAvailable:false},{path:'vcpus',before:null,after:4,beforeAvailable:false}]);
    expect(preview.previewComplete).toBe(false);
  });
  it('compares app start/stop state without submitting a mutation',async()=>{
    mocks.call.mockResolvedValue({id:'plex',state:'STOPPED'});
    const preview=await preparePreview('app.start',['plex']);
    expect(mocks.call).toHaveBeenCalledWith('app.query',[[['id','=','plex']],{get:true}]);
    expect(preview.diff).toEqual([{path:'state',before:'STOPPED',after:'RUNNING',beforeAvailable:true}]);
    expect(preview.previewComplete).toBe(true);
  });
  it('shows submitted create fields with a known absent before value',async()=>{
    const preview=await preparePreview('user.create',[{username:'example',full_name:'Example'}]);
    expect(preview.diff).toEqual([{path:'username',before:null,after:'example',beforeAvailable:true},{path:'full_name',before:null,after:'Example',beforeAvailable:true}]);
    expect(preview.previewComplete).toBe(true);
    expect(preview.baseline).toBeUndefined();
  });
  it('masks secret fields instead of returning or hashing them',async()=>{
    const preview=await preparePreview('user.create',[{username:'example',password:'private-value'}]);
    const password=preview.diff.find(entry=>entry.path==='password');
    expect(password).toEqual({path:'password',before:null,after:'***',beforeAvailable:true,sensitive:true});
    expect(JSON.stringify(preview)).not.toContain('private-value');
    mocks.call.mockResolvedValue({id:'user-1',password:{value:'old-private'}});
    const update=await preparePreview('sharing.smb.update',[1,{password:'new-private',comment:'changed'}]);
    expect(update.diff).toEqual([
      {path:'password',before:'***',after:'***',beforeAvailable:true,sensitive:true},
      {path:'comment',before:null,after:'changed',beforeAvailable:false},
    ]);
    expect(JSON.stringify(update)).not.toContain('private');
  });
  it('leaves other operations incomplete instead of guessing before values',async()=>{
    const preview=await preparePreview('interface.commit',[{rollback:true,checkin_timeout:60}]);
    expect(preview.previewComplete).toBe(false);
    expect(preview.baseline).toBeUndefined();
    expect(preview.diff[0]).toMatchObject({path:'rollback',before:null,after:true,beforeAvailable:false});
    const single=await preparePreview('vm.delete',[7]);
    expect(single).toEqual({diff:[{path:'args',before:null,after:[7],beforeAvailable:false}],previewComplete:false});
  });
  it('hashes a canonical baseline that is stable across record key order',async()=>{
    mocks.call.mockResolvedValueOnce({compression:{parsed:'LZ4'},quota:{parsed:0},id:'maindata/example'});
    const first=await preparePreview('pool.dataset.update',['maindata/example',{quota:5,compression:'ZSTD'}]);
    mocks.call.mockResolvedValueOnce({quota:{parsed:0},id:'maindata/example',compression:{parsed:'LZ4'}});
    const second=await preparePreview('pool.dataset.update',['maindata/example',{compression:'ZSTD',quota:5}]);
    expect(first.baseline).toBe(second.baseline);
    expect(first.baseline).toMatch(/^[a-f0-9]{64}$/);
  });
  it('passes an unchanged baseline and rejects a changed one before any write',async()=>{
    mocks.call.mockResolvedValue({id:'maindata/example',compression:{parsed:'LZ4'}});
    const baseline=(await preparePreview('pool.dataset.update',['maindata/example',{compression:'ZSTD'}])).baseline!;
    await expect(assertUnchanged('pool.dataset.update',['maindata/example',{compression:'ZSTD'}],baseline)).resolves.toBeUndefined();
    mocks.call.mockResolvedValue({id:'maindata/example',compression:{parsed:'GZIP'}});
    await expect(assertUnchanged('pool.dataset.update',['maindata/example',{compression:'ZSTD'}],baseline)).rejects.toBeInstanceOf(StalePreviewError);
    mocks.call.mockResolvedValue(null);
    await expect(assertUnchanged('pool.dataset.update',['maindata/example',{compression:'ZSTD'}],baseline)).rejects.toBeInstanceOf(StalePreviewError);
  });
  it('masks a user.update password instead of returning it',async()=>{
    const preview=await preparePreview('user.update',[33,{password:'private-value',full_name:'x'}]);
    expect(JSON.stringify(preview)).not.toContain('private-value');
    const patch=(preview.diff[0].after as unknown[])[1] as Record<string,unknown>;
    expect(patch.password).toBeUndefined();
    expect(patch.full_name).toBe('x');
  });
  it('redacts nested credentials in submitted args without echoing them',async()=>{
    const preview=await preparePreview('interface.update',[1,{options:{password:'nested-secret'},aliases:['x']}]);
    expect(JSON.stringify(preview)).not.toContain('nested-secret');
    expect(preview.previewComplete).toBe(false);
  });
  it('drops protected create fields and never echoes their values',async()=>{
    const preview=await preparePreview('app.create',[{custom_app:true,values:{secret:'value-secret'},custom_compose:{password:'compose-secret'},name:'app'}]);
    expect(JSON.stringify(preview)).not.toContain('value-secret');
    expect(JSON.stringify(preview)).not.toContain('compose-secret');
    expect(preview.diff.map(entry=>entry.path)).toEqual(['custom_app','name']);
    expect(preview.previewComplete).toBe(true);
  });
  it('redacts nested secrets inside an approved update diff value',async()=>{
    mocks.call.mockResolvedValue({id:7,options:{password:'old-secret'}});
    const preview=await preparePreview('sharing.smb.update',[7,{options:{password:'new-secret'},comment:'ok'}]);
    expect(JSON.stringify(preview)).not.toContain('secret');
    expect(preview.diff).toEqual([
      {path:'options',before:{},after:{},beforeAvailable:true},
      {path:'comment',before:null,after:'ok',beforeAvailable:false},
    ]);
    expect(preview.previewComplete).toBe(false);
  });
});
