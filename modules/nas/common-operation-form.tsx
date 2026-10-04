'use client';

import {useTranslations} from 'next-intl';
import {SchemaField} from './schema-form';
import type {Schema, Value} from './schema';

const commonFields: Record<string, string[]> = {
  'pool.dataset.create': ['name', 'type', 'compression', 'quota', 'readonly'],
  'pool.dataset.update': ['comments', 'compression', 'quota', 'readonly'],
  'sharing.smb.create': ['name', 'path', 'enabled', 'readonly', 'comment'],
  'sharing.smb.update': ['name', 'path', 'enabled', 'readonly', 'comment'],
  'vm.create': ['name', 'description', 'memory', 'vcpus', 'autostart', 'bootloader'],
  'vm.update': ['name', 'description', 'memory', 'vcpus', 'autostart'],
};

function subset(schema: Schema, names: Set<string>): Schema {
  return {...schema, properties: Object.fromEntries(Object.entries(schema.properties ?? {}).filter(([name]) => names.has(name))), required: schema.required?.filter(name => names.has(name))};
}

export function CommonOperationForm({method, schema, value, onChange, name, seed}: {
  method: string; schema: Schema; value: Value; onChange: (value: Value) => void; name: string; seed?: Value;
}) {
  const t = useTranslations('nas');
  const names = commonFields[method];
  if (!names || schema.type !== 'object') return <SchemaField {...{schema, value, onChange, name, seed}}/>;
  const primary = new Set([...names, ...(schema.required ?? [])]);
  const advanced = new Set(Object.keys(schema.properties ?? {}).filter(key => !primary.has(key)));
  return <div className="nas-common-form">
    <p className="text-sm text-muted-foreground">{t(method.startsWith('vm.') ? 'vmFormHint' : method.startsWith('sharing.') ? 'shareFormHint' : 'datasetFormHint')}</p>
    <SchemaField {...{value, onChange, name, seed}} schema={subset(schema, primary)} showOptional/>
    {advanced.size > 0 && <details className="nas-advanced-fields"><summary>{t('advancedFields', {count: advanced.size})}</summary><SchemaField {...{value, onChange, name, seed}} schema={subset(schema, advanced)}/></details>}
  </div>;
}
