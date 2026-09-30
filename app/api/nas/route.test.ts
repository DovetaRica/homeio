import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),password:vi.fn(),call:vi.fn(),create:vi.fn(),consume:vi.fn(),audit:vi.fn()}));
vi.mock('@/lib/server/modules/auth/api',()=>({requireApiSession:mocks.session}));
vi.mock('@/lib/server/modules/auth/password',()=>({verifyPassword:mocks.password}));
vi.mock('@/lib/server/modules/truenas/client',()=>({nasCall:mocks.call,nasBatch:vi.fn()}));
vi.mock('@/lib/server/modules/truenas/intents',()=>({createIntent:mocks.create,consumeIntent:mocks.consume,audit:mocks.audit,pruneIntents:vi.fn(),recentAudit:vi.fn()}));
import {POST,GET} from './route';
const origin='http://192.168.31.221:12026';
beforeEach(()=>{process.env.TRUENAS_ADMIN_USERS='admin';process.env.HOMEIO_PUBLIC_ORIGIN=origin;process.env.TRUENAS_CONFIG_FILE='/test-only.json';mocks.session.mockResolvedValue({session:{username:'admin',userId:Math.random().toString(),sessionId:'one',passwordHash:'test-only'},response:null});mocks.password.mockResolvedValue(true);mocks.create.mockResolvedValue('token');mocks.consume.mockResolvedValue({method:'app.start',args:['example'],target:'example'});mocks.call.mockResolvedValue(123);});
const post=(body:unknown,from=origin)=>POST(new Request(origin+'/api/nas',{method:'POST',headers:{origin:from},body:JSON.stringify(body)}));
describe('NAS API security',()=>{
  it('rejects non-administrator sessions',async()=>{mocks.session.mockResolvedValue({session:{username:'guest'},response:null});expect((await GET(new Request(origin+'/api/nas'))).status).toBe(403);});
  it('rejects cross-origin writes before creating any intent',async()=>{expect((await post({stage:'preview',method:'app.start',args:['example']},'https://evil.example')).status).toBe(403);expect(mocks.create).not.toHaveBeenCalled();});
  it('previews without submitting any mutation',async()=>{expect((await post({stage:'preview',method:'app.start',args:['example']})).status).toBe(200);expect(mocks.call).not.toHaveBeenCalled();});
  it('rejects incorrect passwords and mismatched target confirmation',async()=>{mocks.password.mockResolvedValue(false);expect((await post({stage:'execute',token:'token',password:'wrong',confirmation:'example'})).status).toBe(403);expect(mocks.consume).not.toHaveBeenCalled();mocks.password.mockResolvedValue(true);expect((await post({stage:'execute',token:'token',password:'test',confirmation:'different'})).status).toBe(400);expect(mocks.call).not.toHaveBeenCalled();});
  it('reports job acceptance without claiming completion and audits no passwords',async()=>{const r=await post({stage:'execute',token:'token',password:'private-test-password',confirmation:'example'});expect(await r.json()).toEqual({accepted:true,job:123,result:null});expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('private-test-password');});
});
