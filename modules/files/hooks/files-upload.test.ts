// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {MAX_UPLOAD_BYTES,uploadFilesToPath} from './files-api';
class Xhr extends EventTarget {
  upload=new EventTarget();status=200;responseText='';
  static instance:Xhr;
  constructor(){super();Xhr.instance=this;}
  open=vi.fn();send=vi.fn();abort=vi.fn();
}
afterEach(()=>vi.unstubAllGlobals());
describe('upload limits and broken proxy responses',()=>{
  it('rejects an oversized batch before issuing a request',async()=>{
    const xhr=vi.fn();vi.stubGlobal('XMLHttpRequest',xhr);
    await expect(uploadFilesToPath({destinationPath:'',files:[{size:MAX_UPLOAD_BYTES},{size:1}] as File[]})).rejects.toMatchObject({code:'upload_too_large'});
    expect(xhr).not.toHaveBeenCalled();
  });
  it('maps an HTML gateway 413 to the readable upload limit code',async()=>{
    vi.stubGlobal('XMLHttpRequest',Xhr);const pending=uploadFilesToPath({destinationPath:'',files:[new File(['abc'],'中文.txt')]});
    Xhr.instance.status=413;Xhr.instance.responseText='<html>too large</html>';Xhr.instance.dispatchEvent(new Event('load'));
    await expect(pending).rejects.toMatchObject({code:'upload_too_large'});
  });
  it('settles malformed successful JSON instead of leaving upload stuck',async()=>{
    vi.stubGlobal('XMLHttpRequest',Xhr);const pending=uploadFilesToPath({destinationPath:'',files:[]});
    Xhr.instance.responseText='invalid';Xhr.instance.dispatchEvent(new Event('load'));
    await expect(pending).rejects.toMatchObject({code:'upload_invalid_response'});
  });
  it('rejects valid JSON with a missing upload result',async()=>{
    vi.stubGlobal('XMLHttpRequest',Xhr);const pending=uploadFilesToPath({destinationPath:'',files:[]});
    Xhr.instance.responseText='{}';Xhr.instance.dispatchEvent(new Event('load'));
    await expect(pending).rejects.toMatchObject({code:'upload_invalid_response'});
  });
});
