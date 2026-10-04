// Server-owned paging/filter/order translation for the TrueNAS query middleware.
// Request data never reaches filter/order_by directly: only allowlisted,
// bounded values are translated into middleware filters and options.
export type Sort='newest'|'oldest'|'name';
export type Page={offset:number;limit:number;search:string;sort:Sort};
export class InvalidQueryError extends Error {
  readonly code='invalid_request';
  constructor(message:string){super(message);this.name='InvalidQueryError';}
}
const SORTS:readonly Sort[]=['newest','oldest','name'];
// Verified against TrueNAS 25.10 snapshot/job schemas: dataset creation is a
// parsed datetime and snapshot/job names are unique enough for stable paging.
export const SNAPSHOT_ORDER:Record<Sort,string[]>={newest:['-properties.creation.parsed','-name'],oldest:['properties.creation.parsed','name'],name:['name']};
export const JOB_ORDER:Record<Sort,string[]>={newest:['-id'],oldest:['id'],name:['method','-id']};
function integer(raw:string|null,fallback:number,min:number,max:number,name:string) {
  if(raw===null)return fallback;
  if(!/^\d+$/.test(raw))throw new InvalidQueryError(`Invalid ${name}`);
  const value=Number(raw);
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new InvalidQueryError(`Invalid ${name}`);
  return value;
}
export function parsePage(params:URLSearchParams,maxLimit:number):Page {
  const offset=integer(params.get('offset'),0,0,Number.MAX_SAFE_INTEGER,'offset');
  const limit=integer(params.get('limit'),50,1,maxLimit,'limit');
  const search=params.get('search')??'';
  if(search.length>128)throw new InvalidQueryError('Search must be 128 characters or fewer');
  const raw=params.get('sort')??'newest';
  if(!SORTS.includes(raw as Sort))throw new InvalidQueryError('Sort must be newest, oldest or name');
  return {offset,limit,search,sort:raw as Sort};
}
export function snapshotFilters(search:string){return search?[['name','rin',search]]:[];}
export function jobFilters(search:string){return search?[['method','rin',search]]:[];}
export function snapshotPageParams(page:Page){return [snapshotFilters(page.search),{limit:page.limit,offset:page.offset,order_by:SNAPSHOT_ORDER[page.sort],extra:{properties:['creation']}}];}
export function snapshotCountParams(page:Page){return [snapshotFilters(page.search),{count:true}];}
export function jobPageParams(page:Page){return [jobFilters(page.search),{limit:page.limit,offset:page.offset,order_by:JOB_ORDER[page.sort]}];}
export function jobCountParams(page:Page){return [jobFilters(page.search),{count:true}];}
export function pageResult(data:unknown,total:unknown,page:Page) {
  const rows=Array.isArray(data)?data:[];
  const numeric=typeof total==='number'?total:typeof total==='string'&&total.trim()!==''?Number(total):NaN;
  const count=Number.isFinite(numeric)?numeric:rows.length;
  return {data:rows,at:new Date().toISOString(),offset:page.offset,limit:page.limit,total:count,hasMore:page.offset+rows.length<count};
}
