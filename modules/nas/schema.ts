export type Value = null | boolean | number | string | Value[] | {[key: string]: Value};
export type Schema = {type?: string; format?: string; title?: string; description?: string; _name_?: string; _required_?: boolean; default?: Value; const?: Value; enum?: Value[]; anyOf?: Schema[]; oneOf?: Schema[]; properties?: Record<string, Schema>; required?: string[]; items?: Schema | Schema[]; additionalProperties?: boolean | Schema; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; pattern?: string};
export function variants(s: Schema) {return s.anyOf ?? s.oneOf ?? [];}
export function initial(s: Schema): Value {
  if (s.default !== undefined) return structuredClone(s.default);
  if (s.const !== undefined) return s.const;
  if (s.enum?.length) return s.enum[0];
  if (variants(s).length) return initial(variants(s)[0]);
  if (s.type === 'object') return Object.fromEntries(Object.entries(s.properties ?? {}).filter(([k,v]) => s.required?.includes(k) || v._required_).map(([k,v]) => [k, initial(v)]));
  if (s.type === 'array') return [];
  if (s.type === 'boolean') return false;
  if (s.type === 'integer' || s.type === 'number') return s.minimum ?? 0;
  if (s.type === 'null') return null;
  return '';
}
export function validate(s: Schema, value: unknown, path = 'value'): string[] {
  if (value === undefined) return s._required_ ? [`${path}: required`] : [];
  if (variants(s).length) return variants(s).some(v => validate(v,value,path).length === 0) ? [] : [`${path}: invalid choice or missing fields`];
  if (s.const !== undefined && value !== s.const) return [`${path}: invalid constant`];
  if (s.enum && !s.enum.includes(value as Value)) return [`${path}: invalid choice`];
  if (s.type === 'null') return value === null ? [] : [`${path}: expected null`];
  if (s.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [`${path}: expected object`];
    const record = value as Record<string,unknown>;
    const errors = (s.required ?? []).filter(k => record[k] === undefined).map(k => `${path}.${k}: required`);
    for (const [key,v] of Object.entries(record)) {
      if (['__proto__','constructor','prototype'].includes(key)) errors.push(`${path}: forbidden field`);
      else if (s.properties?.[key]) errors.push(...validate(s.properties[key],v,`${path}.${key}`));
      else if (s.additionalProperties === false) errors.push(`${path}.${key}: unknown field`);
    }
    return errors;
  }
  if (s.type === 'array') {
    if (!Array.isArray(value)) return [`${path}: expected list`];
    const item = Array.isArray(s.items) ? s.items[0] : s.items;
    return item ? value.flatMap((v,i) => validate(item,v,`${path}[${i}]`)) : [];
  }
  if (s.type === 'integer' || s.type === 'number') return typeof value !== 'number' || !Number.isFinite(value) || (s.type === 'integer' && !Number.isInteger(value)) || (s.minimum !== undefined && value < s.minimum) || (s.maximum !== undefined && value > s.maximum) ? [`${path}: invalid number`] : [];
  if (s.type === 'boolean') return typeof value === 'boolean' ? [] : [`${path}: expected boolean`];
  if (s.type === 'string') return typeof value !== 'string' || (s.minLength !== undefined && value.length < s.minLength) || (s.maxLength !== undefined && value.length > s.maxLength) || (s.pattern && !new RegExp(s.pattern).test(value)) ? [`${path}: invalid text`] : [];
  return [];
}
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !/password|passwd|secret|token|keyhash|privatekey|private_key|passphrase|^key$|^hash$|^args$|^arguments$|^env$|^environment$|^values$|^custom_compose/i.test(k)).map(([k,v]) => [k,redact(v)]));
  return value;
}
