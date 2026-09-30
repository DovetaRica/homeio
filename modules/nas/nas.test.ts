import {describe,it,expect} from 'vitest';
import schemas from './schemas.json';
import catalog from './catalog.json';
import {initial,redact,validate,type Schema} from './schema';
import {validateOperation,targetOf,sameOrigin} from '@/lib/server/modules/truenas/policy';
describe('TrueNAS operation boundary',()=>{
  it('rejects arbitrary RPC, unknown fields and disabling network rollback',()=>{
    expect(()=>validateOperation('core.bulk',[])).toThrow();
    expect(()=>validateOperation('user.update',[33,{unexpected:true}])).toThrow();
    expect(()=>validateOperation('interface.commit',[{rollback:false,checkin_timeout:60}])).toThrow();
    expect(()=>validateOperation('interface.commit',[{rollback:true,checkin_timeout:60}])).not.toThrow();
    expect(()=>validateOperation('app.stop',['homeio'])).toThrow();
  });
  it('validates user and storage creation without sending any request',()=>{
    expect(()=>validateOperation('pool.dataset.create',[{name:'maindata/example',type:'FILESYSTEM',compression:'LZ4'}])).not.toThrow();
    expect(()=>validateOperation('pool.snapshot.create',[{dataset:'maindata/example',name:'example-snapshot',recursive:false}])).not.toThrow();
    expect(()=>validateOperation('user.create',[{username:'example',full_name:'Example',group_create:true,password:'test-only-password'}])).not.toThrow();
    expect(()=>validateOperation('disk.wipe',['sda','invalid',false])).toThrow();
  });
  it('requires the configured origin and identifies service targets correctly',()=>{
    process.env.HOMEIO_PUBLIC_ORIGIN='http://192.168.31.221:12026';
    expect(sameOrigin(new Request('http://localhost/api/nas',{headers:{origin:'https://evil.example'}}))).toBe(false);
    expect(sameOrigin(new Request('http://localhost/api/nas',{headers:{origin:process.env.HOMEIO_PUBLIC_ORIGIN}}))).toBe(true);
    expect(targetOf(['STOP','ssh'],'service.control')).toBe('ssh');
  });
  it('preserves secrets out of API results and operation previews',()=>{
    expect(redact({name:'user',password:'private',nested:{key:'private',privatekey:'private',args:['private']},values:{secret:'private'},roles:['FULL_ADMIN']})).toEqual({name:'user',nested:{},roles:['FULL_ADMIN']});
  });
  it('keeps VMs visible and every operation paired with an actual schema',()=>{
    expect(catalog.resources.find(r=>r.id==='vms')?.extra).toBe(false);
    for(const method of Object.keys(catalog.operations))expect(Object.hasOwn(schemas,method)).toBe(true);
    const data=(schemas['pool.dataset.update'] as Schema[])[1];
    expect(initial(data)).toEqual({});
    expect(validate(data,{quota:-1}).length).toBeGreaterThan(0);
  });
});
