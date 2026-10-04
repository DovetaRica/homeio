import {describe,it,expect,vi} from 'vitest';
import {EventEmitter} from 'node:events';
import {createHash} from 'node:crypto';
const state=vi.hoisted(()=>({instances:[] as {emit:(event:string,...args:unknown[])=>boolean;send:ReturnType<typeof vi.fn>}[],config:''}));
vi.mock('node:fs/promises',()=>({readFile:vi.fn(async()=>state.config)}));
vi.mock('ws',()=>({default:class extends EventEmitter {send=vi.fn();close=vi.fn();terminate=vi.fn();constructor(){super();state.instances.push(this);}}}));
import {nasBatch,nasCall} from './client';
const cert=Buffer.from('test-only-certificate');
function configure(){process.env.TRUENAS_CONFIG_FILE='/test.json';state.config=JSON.stringify({url:'wss://nas/api/current',key:'private-test-key',fingerprint:createHash('sha256').update(cert).digest('hex')});}
describe('TLS pin before TrueNAS credentials',()=>{
  it('never sends a key when the certificate pin mismatches',async()=>{
    configure();const promise=nasBatch([{method:'system.info'}]);await Promise.resolve();await Promise.resolve();const socket=state.instances.at(-1)!;
    const failed=expect(promise).rejects.toThrow('certificate changed');
    socket.emit('upgrade',{socket:{getPeerCertificate:()=>({raw:Buffer.from('different')})}});socket.emit('open');await failed;expect(socket.send).not.toHaveBeenCalled();
  });
  it('authenticates only after the pin matches and correlates out-of-order replies',async()=>{
    configure();const promise=nasBatch([{method:'system.info'},{method:'pool.query'}]);await Promise.resolve();await Promise.resolve();const socket=state.instances.at(-1)!;
    socket.emit('upgrade',{socket:{getPeerCertificate:()=>({raw:cert})}});socket.emit('open');
    expect(JSON.parse(socket.send.mock.calls[0][0]).method).toBe('auth.login_with_api_key');
    socket.emit('message',Buffer.from(JSON.stringify({id:0,result:true})));await Promise.resolve();await Promise.resolve();
    socket.emit('message',Buffer.from(JSON.stringify({id:2,result:['pool']})));
    socket.emit('message',Buffer.from(JSON.stringify({id:1,result:{version:'25.10.6'}})));
    expect(await promise).toEqual([{version:'25.10.6'},['pool']]);
    const concurrent=nasBatch([{method:'vm.query'}]);await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(state.instances.at(-1)).toBe(socket);
    expect(socket.send.mock.calls.filter(c=>JSON.parse(c[0]).method==='auth.login_with_api_key')).toHaveLength(1);
    socket.emit('message',Buffer.from(JSON.stringify({id:3,result:[]})));
    expect(await concurrent).toEqual([[]]);socket.emit('close');
  });
  it('reports a definite middleware rejection per method without failing the batch',async()=>{
    state.instances.at(-1)?.emit('close');await Promise.resolve();
    configure();const promise=nasBatch([{method:'user.update'},{method:'pool.query'}]);await Promise.resolve();await Promise.resolve();const socket=state.instances.at(-1)!;
    socket.emit('upgrade',{socket:{getPeerCertificate:()=>({raw:cert})}});socket.emit('open');
    socket.emit('message',Buffer.from(JSON.stringify({id:0,result:true})));await Promise.resolve();await Promise.resolve();await Promise.resolve();
    socket.emit('message',Buffer.from(JSON.stringify({id:1,error:{message:'[ENOENT] not found',data:{reason:'[ENOENT] not found'}}})));
    socket.emit('message',Buffer.from(JSON.stringify({id:2,result:['pool']})));
    expect(await promise).toEqual([{nasError:'[ENOENT] not found'},['pool']]);
  });
  it('throws a typed rejection error for a middleware error response',async()=>{
    state.instances.at(-1)?.emit('close');await Promise.resolve();
    configure();const call=nasCall('user.update',[1,{}]);await Promise.resolve();await Promise.resolve();const socket=state.instances.at(-1)!;
    socket.emit('upgrade',{socket:{getPeerCertificate:()=>({raw:cert})}});socket.emit('open');
    socket.emit('message',Buffer.from(JSON.stringify({id:0,result:true})));await Promise.resolve();await Promise.resolve();await Promise.resolve();
    socket.emit('message',Buffer.from(JSON.stringify({id:1,error:{message:'upstream rejected',data:{reason:'upstream rejected'}}})));
    await expect(call).rejects.toMatchObject({name:'NasRpcError',code:'upstream_rejected'});
  });
  it('throws a typed transport error when the connection fails',async()=>{
    state.instances.at(-1)?.emit('close');await Promise.resolve();
    configure();const call=nasCall('system.info');await Promise.resolve();await Promise.resolve();const socket=state.instances.at(-1)!;
    socket.emit('upgrade',{socket:{getPeerCertificate:()=>({raw:cert})}});socket.emit('open');
    socket.emit('message',Buffer.from(JSON.stringify({id:0,result:true})));await Promise.resolve();await Promise.resolve();await Promise.resolve();
    socket.emit('error',new Error('socket failure'));
    await expect(call).rejects.toMatchObject({name:'NasTransportError',code:'transport_error'});
  });
});
