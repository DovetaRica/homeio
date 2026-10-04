import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),password:vi.fn(),call:vi.fn(),batch:vi.fn(),create:vi.fn(),consume:vi.fn(),audit:vi.fn()}));
vi.mock('@/lib/server/modules/auth/api',()=>({requireApiSession:mocks.session}));
vi.mock('@/lib/server/modules/auth/password',()=>({verifyPassword:mocks.password}));
vi.mock('@/lib/server/modules/truenas/client',()=>({nasCall:mocks.call,nasBatch:mocks.batch}));
vi.mock('@/lib/server/modules/truenas/intents',()=>({createIntent:mocks.create,consumeIntent:mocks.consume,audit:mocks.audit,pruneIntents:vi.fn(),recentAudit:vi.fn()}));
import {POST,GET} from './route';
import {preparePreview} from '@/lib/server/modules/truenas/preview';
const origin='http://192.168.31.221:12026';
const rpcError=(message='upstream rejected')=>Object.assign(new Error(message),{name:'NasRpcError',code:'upstream_rejected'});
const transportError=(message='TrueNAS request timed out')=>Object.assign(new Error(message),{name:'NasTransportError',code:'transport_error'});
beforeEach(()=>{for(const mock of Object.values(mocks))mock.mockReset();process.env.TRUENAS_ADMIN_USERS='admin';process.env.HOMEIO_PUBLIC_ORIGIN=origin;process.env.TRUENAS_CONFIG_FILE='/test-only.json';mocks.session.mockResolvedValue({session:{username:'admin',userId:Math.random().toString(),sessionId:'one',passwordHash:'test-only'},response:null});mocks.password.mockResolvedValue(true);mocks.create.mockResolvedValue('token');mocks.consume.mockResolvedValue({method:'app.start',args:['example'],target:'example'});mocks.call.mockResolvedValue(123);mocks.batch.mockResolvedValue([]);});
const post=(body:unknown,from=origin)=>POST(new Request(origin+'/api/nas',{method:'POST',headers:{origin:from},body:JSON.stringify(body)}));
const get=(query='')=>GET(new Request(origin+'/api/nas'+query));
describe('NAS API security',()=>{
  it('rejects non-administrator sessions',async()=>{mocks.session.mockResolvedValue({session:{username:'guest'},response:null});expect((await get()).status).toBe(403);});
  it('rejects cross-origin writes before creating any intent',async()=>{expect((await post({stage:'preview',method:'app.start',args:['example']},'https://evil.example')).status).toBe(403);expect(mocks.create).not.toHaveBeenCalled();});
  it('previews without submitting the mutation',async()=>{expect((await post({stage:'preview',method:'app.start',args:['example']})).status).toBe(200);expect(mocks.call.mock.calls.every(([method])=>method!=='app.start')).toBe(true);});
  it('rejects incorrect passwords and mismatched target confirmation',async()=>{mocks.password.mockResolvedValue(false);expect((await post({stage:'execute',token:'token',password:'wrong',confirmation:'example'})).status).toBe(403);expect(mocks.consume).not.toHaveBeenCalled();mocks.password.mockResolvedValue(true);expect((await post({stage:'execute',token:'token',password:'test',confirmation:'different'})).status).toBe(400);expect(mocks.call).not.toHaveBeenCalled();});
  it('reports job acceptance without claiming completion and audits no passwords',async()=>{const r=await post({stage:'execute',token:'token',password:'private-test-password',confirmation:'example'});expect(await r.json()).toEqual({accepted:true,job:123,result:null});expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('private-test-password');});
});
describe('NAS overview partial failures',()=>{
  it('accepts null for no pending network rollback but rejects null required sections',async()=>{
    mocks.batch.mockResolvedValue([{version:'25.10.6'},[],[],[],null]);
    const response=await get('?resource=overview');const body=await response.json();
    expect(response.status).toBe(200);expect(body.errors).toEqual({});
    expect(body.data['interface.checkin_waiting']).toBeNull();
    mocks.batch.mockResolvedValue([null,[],[],[],null]);
    const partial=await (await get('?resource=overview')).json();
    expect(partial.errors).toEqual({'system.info':'TrueNAS request failed'});
    expect(partial.data['system.info']).toBeUndefined();
  });
  it('rejects missing overview results rather than accepting an empty healthy overview',async()=>{
    mocks.batch.mockResolvedValue([]);expect((await get('?resource=overview')).status).toBe(502);
  });
  it('retains successful sections and names each failed method',async()=>{
    mocks.batch.mockResolvedValue([{version:'25.10.6'},['pool'],[{state:'RUNNING'}],[{dismissed:false}],{nasError:'interface check failed'}]);
    const response=await get('?resource=overview');const body=await response.json();
    expect(response.status).toBe(200);
    expect(body.data['system.info']).toEqual({version:'25.10.6'});
    expect(body.data['pool.query']).toEqual(['pool']);
    expect(body.data['app.query']).toEqual([{state:'RUNNING'}]);
    expect(body.data['interface.checkin_waiting']).toBeUndefined();
    expect(body.errors).toEqual({'interface.checkin_waiting':'TrueNAS request failed'});
    expect(body.at).toBeTypeOf('string');
  });
  it('fails only when every overview method fails',async()=>{
    mocks.batch.mockResolvedValue([{nasError:'one'},{nasError:'two'},{nasError:'three'},{nasError:'four'},{nasError:'five'}]);
    const response=await get('?resource=overview');const body=await response.json();
    expect(response.status).toBe(502);expect(body).toMatchObject({code:'upstream_rejected',outcome:'rejected'});
  });
  it('reports an overview transport failure as a typed transport error',async()=>{
    mocks.batch.mockRejectedValue(transportError());
    const response=await get('?resource=overview');
    expect(response.status).toBe(502);expect((await response.json()).code).toBe('transport_error');
  });
});
describe('NAS list paging',()=>{
  it('pages, searches and orders snapshots using middleware options and a count',async()=>{
    mocks.call.mockResolvedValueOnce(new Array(10).fill({name:'snap'})).mockResolvedValueOnce(250);
    const response=await get('?resource=snapshots&offset=200&limit=50&sort=oldest&search=snap');const body=await response.json();
    expect(response.status).toBe(200);
    expect(mocks.call.mock.calls[0]).toEqual(['pool.snapshot.query',[[['name','rin','snap']],{limit:50,offset:200,order_by:['properties.creation.parsed','name'],extra:{properties:['creation']}}]]);
    expect(mocks.call.mock.calls[1]).toEqual(['pool.snapshot.query',[[['name','rin','snap']],{count:true}]]);
    expect(body).toMatchObject({offset:200,limit:50,total:250,hasMore:true});
    expect(body.data).toHaveLength(10);expect(body.at).toBeTypeOf('string');
  });
  it('pages jobs with the default newest order and limit',async()=>{
    mocks.call.mockResolvedValueOnce([]).mockResolvedValueOnce(0);
    const response=await get('?resource=jobs');const body=await response.json();
    expect(response.status).toBe(200);
    expect(mocks.call.mock.calls[0]).toEqual(['core.get_jobs',[[],{limit:50,offset:0,order_by:['-id']}]]);
    expect(mocks.call.mock.calls[1]).toEqual(['core.get_jobs',[[],{count:true}]]);
    expect(body).toMatchObject({offset:0,limit:50,total:0,hasMore:false});
  });
  it('rejects invalid list queries before any RPC',async()=>{
    for(const value of ['offset=-1','limit=201','sort=sideways',`search=${'a'.repeat(129)}`]){
      const response=await get(`?resource=snapshots&${value}`);
      expect(response.status).toBe(400);expect((await response.json()).code).toBe('invalid_request');
    }
    expect((await get('?resource=jobs&limit=101')).status).toBe(400);
    expect(mocks.call).not.toHaveBeenCalled();
  });
});
describe('NAS single job lookup',()=>{
  it('returns a redacted single job by positive integer id',async()=>{
    mocks.call.mockResolvedValue({id:5,method:'pool.scrub',state:'SUCCESS',password:'private'});
    const response=await get('?resource=job&jobId=5');const body=await response.json();
    expect(response.status).toBe(200);
    expect(mocks.call).toHaveBeenCalledWith('core.get_jobs',[[['id','=',5]],{get:true}]);
    expect(body.data).toEqual({id:5,method:'pool.scrub',state:'SUCCESS'});
    expect(body.at).toBeTypeOf('string');
  });
  it('strips raw_result and secrets from a single job at any depth',async()=>{
    mocks.call.mockResolvedValue({id:5,state:'SUCCESS',password:'private',raw_result:{password:'deep-private'},nested:{raw_result:'raw-nested',keep:true}});
    const body=await (await get('?resource=job&jobId=5')).json();
    expect(body.data).toEqual({id:5,state:'SUCCESS',nested:{keep:true}});
    expect(JSON.stringify(body)).not.toContain('private');
    expect(JSON.stringify(body)).not.toContain('raw_result');
    expect(JSON.stringify(body)).not.toContain('raw-nested');
  });
  it('returns 404 for a missing job and 400 for an invalid id before RPC',async()=>{
    mocks.call.mockResolvedValueOnce(null).mockResolvedValueOnce([]).mockRejectedValueOnce(rpcError('[ENOENT] Job not found'));
    expect((await get('?resource=job&jobId=999')).status).toBe(404);
    expect((await get('?resource=job&jobId=999')).status).toBe(404);
    expect((await get('?resource=job&jobId=999')).status).toBe(404);
    expect((await get('?resource=job&jobId=0')).status).toBe(400);
    expect((await get('?resource=job&jobId=abc')).status).toBe(400);
    expect(mocks.call).toHaveBeenCalledTimes(3);
  });
});
describe('NAS mutation outcome contracts',()=>{
  it('reports an unknown outcome when audit fails after the write, without retrying it',async()=>{
    mocks.audit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('disk full'));
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'example'});
    expect(response.status).toBe(502);expect((await response.json()).code).toBe('unknown_outcome');
    expect(mocks.call).toHaveBeenCalledTimes(1);
  });
  it('rejects an expired or invalid intent without any mutation',async()=>{
    mocks.consume.mockRejectedValue(new Error('Confirmation expired; review the operation again'));
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'example'});const body=await response.json();
    expect(response.status).toBe(400);expect(body.code).toBe('invalid_request');
    expect(mocks.call).not.toHaveBeenCalled();
  });
  it('distinguishes an uncertain timeout from a definitive rejection and never retries',async()=>{
    mocks.call.mockRejectedValue(transportError());
    const uncertain=await post({stage:'execute',token:'token',password:'test',confirmation:'example'});
    expect(uncertain.status).toBe(502);expect(await uncertain.json()).toMatchObject({code:'unknown_outcome',outcome:'unknown'});
    expect(mocks.call.mock.calls.filter(([method])=>method==='app.start')).toHaveLength(1);
    mocks.call.mockReset();mocks.call.mockRejectedValue(rpcError('app.start refused'));
    const rejected=await post({stage:'execute',token:'token',password:'test',confirmation:'example'});
    expect(rejected.status).toBe(502);expect(await rejected.json()).toMatchObject({code:'upstream_rejected',outcome:'rejected'});
  });
  it('reports an unknown outcome when the audit after a successful mutation fails',async()=>{
    mocks.audit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('audit disk full'));
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'example'});
    expect(response.status).toBe(502);expect(await response.json()).toMatchObject({code:'unknown_outcome',outcome:'unknown'});
    expect(mocks.call).toHaveBeenCalledWith('app.start',['example']);
  });
  it('treats unexpected execute-stage errors as unknown and never retries or echoes them',async()=>{
    mocks.call.mockRejectedValue(new Error('private config value leaked'));
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'example'});
    const body=await response.json();
    expect(response.status).toBe(502);expect(body).toMatchObject({code:'unknown_outcome',outcome:'unknown'});
    expect(JSON.stringify(body)).not.toContain('private config value');
    expect(mocks.call.mock.calls.filter(([method])=>method==='app.start')).toHaveLength(1);
  });
  it('never echoes credential-bearing rejection text',async()=>{
    mocks.call.mockRejectedValue(rpcError('app.start password=super-secret'));
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'example'});
    const body=await response.json();
    expect(body).toMatchObject({code:'upstream_rejected',outcome:'rejected'});
    expect(JSON.stringify(body)).not.toContain('super-secret');
  });
});
describe('NAS preview before/after contracts',()=>{
  it('previews an approved update diff and binds the baseline to the encrypted intent',async()=>{
    mocks.call.mockResolvedValue({id:'maindata/example',compression:{parsed:'LZ4'}});
    const response=await post({stage:'preview',method:'pool.dataset.update',args:['maindata/example',{compression:'ZSTD'}]});const body=await response.json();
    expect(response.status).toBe(200);
    expect(body.diff).toEqual([{path:'compression',before:'LZ4',after:'ZSTD',beforeAvailable:true}]);
    expect(body.previewComplete).toBe(true);
    expect(body.changes).toEqual(['maindata/example',{compression:'ZSTD'}]);
    expect(body.baseline).toBeUndefined();
    const intent=mocks.create.mock.calls[0][0];
    expect(intent).toMatchObject({method:'pool.dataset.update',args:['maindata/example',{compression:'ZSTD'}],userId:expect.any(String),sessionId:'one'});
    expect(typeof intent.baseline).toBe('string');
  });
  it('treats a baseline re-read transport failure as unknown without submitting',async()=>{
    mocks.consume.mockResolvedValue({method:'pool.dataset.update',args:['maindata/example',{compression:'ZSTD'}],target:'maindata/example',baseline:'abc'});
    mocks.call.mockRejectedValue(transportError());
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'maindata/example'});
    expect(response.status).toBe(502);expect(await response.json()).toMatchObject({code:'unknown_outcome',outcome:'unknown'});
    expect(mocks.call.mock.calls.every(([method])=>method!=='pool.dataset.update')).toBe(true);
  });
  it('blocks a changed baseline with 409 and never submits the mutation',async()=>{
    mocks.consume.mockResolvedValue({method:'pool.dataset.update',args:['maindata/example',{compression:'ZSTD'}],target:'maindata/example',baseline:'stale-baseline'});
    mocks.call.mockResolvedValue({id:'maindata/example',compression:{parsed:'GZIP'}});
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'maindata/example'});const body=await response.json();
    expect(response.status).toBe(409);expect(body.code).toBe('stale_preview');
    expect(mocks.call.mock.calls.every(([method])=>method!=='pool.dataset.update')).toBe(true);
  });
  it('submits when the baseline is unchanged',async()=>{
    mocks.call.mockImplementation(async(method:string)=>method==='pool.dataset.query'?{id:'maindata/example',compression:{parsed:'LZ4'}}:'updated');
    const preview=await preparePreview('pool.dataset.update',['maindata/example',{compression:'ZSTD'}]);
    mocks.consume.mockResolvedValue({method:'pool.dataset.update',args:['maindata/example',{compression:'ZSTD'}],target:'maindata/example',baseline:preview.baseline});
    const response=await post({stage:'execute',token:'token',password:'test',confirmation:'maindata/example'});
    expect(response.status).toBe(200);
    expect(mocks.call).toHaveBeenCalledWith('pool.dataset.update',['maindata/example',{compression:'ZSTD'}]);
    expect(await response.json()).toEqual({accepted:true,job:null,result:'updated'});
  });
});
