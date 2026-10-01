import {describe,expect,it} from 'vitest';
import {getAppVisualState,type AppItem} from './app-grid-presenters';
describe('status signals',()=>{
  it('does not present missing runtime information as a failure',()=>{
    const state=getAppVisualState({status:'unknown'} as AppItem);
    expect(state.badgeIcon).toBeNull();
    expect(state.dotInnerClass).toBe('');
    expect(state.title).toBe('Status unknown');
  });
  it('retains an alert for a known stopped service',()=>{
    expect(getAppVisualState({status:'stopped'} as AppItem).badgeIcon).not.toBeNull();
  });
});
