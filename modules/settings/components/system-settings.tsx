'use client';

import {useRef, useState} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import {NasResourcePanel} from '@/modules/nas/dashboard';
import {LanguageSelect} from '@/i18n/language-select';
import {TwoFactorCard} from './panel/sections/two-factor-card';
import {Toggle} from './panel/controls';
import type {SettingsPanelProps, SettingsSectionDefinition, SettingsBackend} from './panel/types';
import {PINNED_SYSTEM_SECTIONS, SYSTEM_GROUPS, resolveSystemSection, systemSectionLabel} from '../system-navigation';

type Props = Pick<SettingsPanelProps, 'selectedSection' | 'selectionRequestKey' | 'onSectionChange' | 'appearance' | 'onAppearanceChange'> & {
  definitions: SettingsSectionDefinition[];
  backend: SettingsBackend;
};

export function SystemSettings({selectedSection, selectionRequestKey, onSectionChange, definitions, backend, appearance, onAppearanceChange}: Props) {
  const t = useTranslations('systemSettings');
  const locale = useLocale();
  const [requested, setRequested] = useState({section: selectedSection, key: selectionRequestKey});
  const [active, setActive] = useState(() => resolveSystemSection(selectedSection));
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  // Honor launch requests without resetting navigation on every parent render.
  if (requested.section !== selectedSection || requested.key !== selectionRequestKey) {
    if (requested.key !== selectionRequestKey) {setFilter(''); setCollapsed([]);}
    setRequested({section: selectedSection, key: selectionRequestKey});
    setActive(resolveSystemSection(selectedSection));
  }
  const content = useRef<HTMLDivElement>(null);
  const label = (id: string) => systemSectionLabel(id, locale, t);
  const query = filter.trim().toLocaleLowerCase(locale);
  const matches = (id: string) => !query || `${id} ${label(id)}`.toLocaleLowerCase(locale).includes(query);
  const activate = (id: string) => {const section = resolveSystemSection(id); setActive(section); onSectionChange?.(section); setCollapsed([]); content.current?.scrollTo?.({top: 0});};
  const group = SYSTEM_GROUPS.find(item => (item.sections as readonly string[]).includes(active));
  const preference = group?.id === 'preferences';
  const definition = preference ? definitions.find(item => item.id === active) : undefined;
  const navButton = (id: string) => <button key={id} type="button" aria-current={active === id ? 'page' : undefined} onClick={() => activate(id)} className="system-settings-nav-item"><span>{label(id)}</span>{active === id && <span aria-hidden="true">—</span>}</button>;

  return <div className="system-settings" data-system-settings>
    <aside className="system-settings-sidebar">
      <div className="system-settings-brand"><span className="system-settings-eyebrow">HOMEIO / SYSTEM</span><strong>{t('shortTitle')}</strong></div>
      <div className="system-settings-filter"><input aria-label={t('filter')} placeholder={t('filter')} value={filter} onChange={event => setFilter(event.target.value)}/></div>
      <nav aria-label={t('navigation')}>
        <div className="system-settings-pinned">{PINNED_SYSTEM_SECTIONS.filter(matches).map(navButton)}</div>
        {SYSTEM_GROUPS.map(item => {
          const sections = item.sections.filter(matches);
          if (!sections.length) return null;
          const open = !!query || (!collapsed.includes(item.id) && (item.id === group?.id || expanded.includes(item.id)));
          return <div className="system-settings-group" key={item.id}>
            <button className="system-settings-group-label" type="button" aria-expanded={open} aria-controls={`system-nav-${item.id}`} onClick={() => {if(open) {setExpanded(previous => previous.filter(id => id !== item.id)); setCollapsed(previous => [...previous, item.id]);} else {setExpanded(previous => [...previous, item.id]); setCollapsed(previous => previous.filter(id => id !== item.id));}}}><span>{t(`groups.${item.id}`)}</span><span aria-hidden="true">{open ? '−' : '+'}</span></button>
            <div id={`system-nav-${item.id}`} hidden={!open}>{sections.map(navButton)}</div>
          </div>;
        })}
        {query && !SYSTEM_GROUPS.some(item => item.sections.some(matches)) && !PINNED_SYSTEM_SECTIONS.some(matches) && <p className="system-settings-no-results">{t('noResults')}</p>}
      </nav>
      <footer><span>TrueNAS · Homeio</span><a href="https://truenas.doveta.uk" target="_blank" rel="noreferrer">{t('official')} ↗</a></footer>
    </aside>
    <div className="system-settings-content" ref={content}>
      <header className="system-settings-heading">
        <div><p className="system-settings-eyebrow">{preference ? 'PERSONAL PREFERENCES' : 'SYSTEM MANAGEMENT'}</p><h1>{label(active)}</h1><p className="system-settings-description">{t(`descriptions.${group?.id ?? 'overview'}`)}</p></div>
        {definition?.save && !definition.liveApply && <button className="system-settings-save" disabled={!definition.save.canSave} title={definition.save.title} onClick={() => void definition.save?.onSave?.()}>{t(definition.save.pending ? 'saving' : 'save')}</button>}
      </header>
      <div className={preference ? 'system-preferences-body' : 'system-management-body'}>
        {active === 'appearance' ? <div className="system-preference-rows">
          <div><span>{t('appearance.style')}</span><strong>{t('appearance.rhine')}</strong></div>
          <div><label htmlFor="system-dock">{t('appearance.dock')}</label><select id="system-dock" value={appearance.dockPosition} onChange={event => onAppearanceChange({dockPosition: event.target.value as typeof appearance.dockPosition})}>{(['bottom', 'left', 'right'] as const).map(value => <option key={value} value={value}>{t(`appearance.${value}`)}</option>)}</select></div>
          <div><label htmlFor="system-icons">{t('appearance.icons')}</label><select id="system-icons" value={appearance.iconSize} onChange={event => onAppearanceChange({iconSize: event.target.value as typeof appearance.iconSize})}>{(['small', 'medium', 'large'] as const).map(value => <option key={value} value={value}>{t(`appearance.${value}`)}</option>)}</select></div>
          <div><label htmlFor="system-font">{t('appearance.font')}</label><select id="system-font" value={appearance.fontSize} onChange={event => onAppearanceChange({fontSize: event.target.value as typeof appearance.fontSize})}>{(['compact', 'default', 'large', 'extra-large'] as const).map(value => <option key={value} value={value}>{t(`appearance.${value}`)}</option>)}</select></div>
          <Toggle enabled={appearance.animationsEnabled} onToggle={() => onAppearanceChange({animationsEnabled: !appearance.animationsEnabled})} label={t('appearance.animation')}/>
          <p className="system-settings-description">{t('appearance.applies')}</p>
        </div> : active === 'language' ? <div className="system-preference-rows"><div><span>{t('sections.language')}</span><LanguageSelect/></div><p className="system-settings-description">{t('languageNotice')}</p></div>
        : active === 'desktop-account' ? <><div className="system-preference-rows"><div><span>{t('session')}</span><strong>{backend.general.username}</strong></div></div><TwoFactorCard status={backend.general.twoFactor} isDemoMode={backend.general.isDemoMode}/></>
        : preference && definition ? definition.render()
        : <NasResourcePanel key={active} resource={active} onNavigate={activate} officialUrl="https://truenas.doveta.uk"/>}
      </div>
    </div>
  </div>;
}
