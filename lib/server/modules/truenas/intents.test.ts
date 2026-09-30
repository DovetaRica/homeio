import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createIntent,consumeIntent} from './intents';
let directory='';
beforeEach(async()=>{directory=await mkdtemp(path.join(os.tmpdir(),'homeio-intents-test-'));process.env.HOMEIO_STATE_DIR=directory;process.env.AUTH_SESSION_SECRET='test-only-session-secret-abcdefghijklmnopqrstuvwxyz';});
afterEach(async()=>{if(directory.startsWith(path.join(os.tmpdir(),'homeio-intents-test-')))await rm(directory,{recursive:true,force:true});});
describe('one-use operation confirmation',()=>{
  it('encrypts passwords and binds the intent to the user and session',async()=>{
    const token=await createIntent({method:'user.create',args:[{password:'private-value'}],userId:'one',sessionId:'session',target:'new-user'});
    const raw=await readFile(path.join(directory,'nas-operations',token+'.json'),'utf8');expect(raw).not.toContain('private-value');
    await expect(consumeIntent(token,'two','session')).rejects.toThrow();
    await expect(consumeIntent(token,'one','different')).rejects.toThrow();
    expect((await consumeIntent(token,'one','session')).method).toBe('user.create');
    await expect(consumeIntent(token,'one','session')).rejects.toThrow();
  });
  it('allows exactly one concurrent consumption and rejects path traversal',async()=>{
    const token=await createIntent({method:'app.start',args:['example'],userId:'one',sessionId:'session',target:'example'});
    const results=await Promise.allSettled([consumeIntent(token,'one','session'),consumeIntent(token,'one','session')]);
    expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);
    await expect(consumeIntent('../audit','one','session')).rejects.toThrow();
    expect((await readdir(path.join(directory,'nas-operations'))).filter(x=>x.endsWith('.used'))).toHaveLength(1);
  });
});
