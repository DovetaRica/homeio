import catalog from '@/modules/nas/catalog.json';

export const SYSTEM_GROUPS = [
  {id: 'system', sections: ['system', 'services', 'alerts', 'jobs', 'audit']},
  {id: 'storage', sections: ['pools', 'datasets', 'disks', 'snapshots', 'smb', 'scrub']},
  {id: 'network', sections: ['network', 'networkConfig']},
  {id: 'access', sections: ['users', 'groups', 'privileges']},
  {id: 'automation', sections: ['snapshotTasks', 'cron', 'vmDevices']},
  {id: 'preferences', sections: ['appearance', 'language', 'desktop-account', 'notifications']},
  {id: 'more', sections: ['nfs', 'replication', 'cloud']},
] as const;

export const PINNED_SYSTEM_SECTIONS = ['overview', 'apps', 'vms'];
export const SYSTEM_SECTION_IDS = [...PINNED_SYSTEM_SECTIONS, ...SYSTEM_GROUPS.flatMap(group => [...group.sections])];

export function resolveSystemSection(id?: string | null) {
  const aliases: Record<string, string> = {general: 'overview', storage: 'pools', docker: 'apps', security: 'desktop-account', 'scheduled-tasks': 'cron'};
  const resolved = id ? aliases[id] ?? id : 'overview';
  return SYSTEM_SECTION_IDS.includes(resolved) ? resolved : 'overview';
}

export function systemSectionLabel(id: string, locale: string, translate: (key: string) => string) {
  const resource = catalog.resources.find(item => item.id === id);
  return resource ? resource.label[locale === 'zh-CN' ? 'zh-CN' : 'en'] : translate(`sections.${id}`);
}
