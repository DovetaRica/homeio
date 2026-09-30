import catalog from '@/modules/nas/catalog.json';
import schemas from '@/modules/nas/schemas.json';
import {validate, type Schema} from '@/modules/nas/schema';

export function operation(method: string) {
  if (!Object.hasOwn(catalog.operations,method)) throw new Error('Operation is not available in this panel');
  return catalog.operations[method as keyof typeof catalog.operations];
}
export function validateOperation(method: string, args: unknown[]) {
  operation(method);
  const definition = schemas[method as keyof typeof schemas] as Schema[];
  if(args.length > definition.length) throw new Error('Too many operation arguments');
  const errors=definition.flatMap((s,i)=>validate(s,args[i],s._name_ ?? String(i)));
  if(errors.length)throw new Error(errors.slice(0,6).join('; '));
  if(method==='interface.commit' && JSON.stringify(args)!==JSON.stringify([{rollback:true,checkin_timeout:60}])) throw new Error('Network changes require a 60-second rollback window');
  // Homeio cannot stop or overwrite the control plane it is running in.
  if(/^app\.(stop|delete|update|upgrade|redeploy)$/.test(method) && args[0]==='homeio') throw new Error('Manage Homeio itself from the original TrueNAS interface');
  return definition;
}
export function targetOf(args: unknown[], method = ''): string {
  if (method==='service.control') return String(args[1]??'TrueNAS');
  if (method.startsWith('system.') || ['interface.commit','interface.checkin','interface.rollback'].includes(method)) return 'TrueNAS';
  const first=args[0];
  if(typeof first==='string'||typeof first==='number')return String(first);
  if(first && typeof first==='object') {
    const obj=first as Record<string,unknown>;
    return String(obj.path??obj.name??obj.app_name??obj.username??obj.dataset??obj.group??'TrueNAS');
  }
  return 'TrueNAS';
}
export function sameOrigin(request: Request) {
  const origin=request.headers.get('origin');
  const expected=process.env.HOMEIO_PUBLIC_ORIGIN;
  // A fixed deployment origin prevents spoofed Host headers from bypassing CSRF.
  return Boolean(expected && origin===expected && request.headers.get('sec-fetch-site')!=='cross-site');
}
