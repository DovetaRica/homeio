import {describe,expect,it} from 'vitest';
import {InvalidQueryError,jobCountParams,jobPageParams,pageResult,parsePage,snapshotCountParams,snapshotPageParams} from './pagination';
const query=(value:string)=>new URLSearchParams(value);
describe('NAS list query translation',()=>{
  it('defaults to offset 0, limit 50 and newest order',()=>{
    expect(parsePage(query(''),200)).toEqual({offset:0,limit:50,search:'',sort:'newest'});
  });
  it('rejects invalid offsets, limits, sorts and oversized search before any RPC',()=>{
    for(const value of ['offset=-1','offset=1.5','offset=abc','limit=0','limit=201','limit=-1','sort=sideways',`search=${'a'.repeat(129)}`])
      expect(()=>parsePage(query(value),200)).toThrow(InvalidQueryError);
    expect(parsePage(query('offset=0&limit=200&sort=name&search=snap'),200)).toEqual({offset:0,limit:200,search:'snap',sort:'name'});
  });
  it('translates only allowlisted snapshot filters, ordering and extras',()=>{
    const page=parsePage(query('offset=40&limit=20&sort=name&search=snap'),200);
    expect(snapshotPageParams(page)).toEqual([[['name','rin','snap']],{limit:20,offset:40,order_by:['name'],extra:{properties:['creation']}}]);
    expect(snapshotCountParams(page)).toEqual([[['name','rin','snap']],{count:true}]);
    expect(snapshotPageParams(parsePage(query('sort=newest'),200))[1]).toEqual({limit:50,offset:0,order_by:['-properties.creation.parsed','-name'],extra:{properties:['creation']}});
    expect(snapshotPageParams(parsePage(query('sort=oldest'),200))[1]).toEqual({limit:50,offset:0,order_by:['properties.creation.parsed','name'],extra:{properties:['creation']}});
    expect(snapshotCountParams(parsePage(query(''),200))).toEqual([[ ],{count:true}]);
  });
  it('translates only allowlisted job filters and ordering and never raw methods',()=>{
    const page=parsePage(query('sort=name&search=scrub'),100);
    expect(jobPageParams(page)).toEqual([[['method','rin','scrub']],{limit:50,offset:0,order_by:['method','-id']}]);
    expect(jobCountParams(page)).toEqual([[['method','rin','scrub']],{count:true}]);
    expect(jobPageParams(parsePage(query('sort=oldest'),100))[1]).toEqual({limit:50,offset:0,order_by:['id']});
    expect(jobPageParams(parsePage(query('order_by=evil&filter=evil'),100))[1]).toEqual({limit:50,offset:0,order_by:['-id']});
  });
  it('computes total and hasMore from the middleware count',()=>{
    const page=parsePage(query('offset=200&limit=50'),200);
    expect(pageResult(new Array(10).fill(0),205,page)).toMatchObject({offset:200,limit:50,total:205,hasMore:false});
    expect(pageResult(new Array(50).fill(0),251,page)).toMatchObject({offset:200,limit:50,total:251,hasMore:true});
  });
});
