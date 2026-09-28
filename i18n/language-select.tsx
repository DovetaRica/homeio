'use client';

import {useLocale} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useState, useTransition} from 'react';
import {setUserLocale} from './actions';
import {useI18n} from './use-i18n';

export function LanguageSelect({className = ""}: {className?: string}) {
  const locale = useLocale();
  const intl = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  return <div className={`flex flex-col items-center gap-1 ${className}`}>
    <select aria-label={intl.t('ui.language')} value={locale} disabled={pending}
      className="rounded-md border border-glass-border bg-background/70 px-2 py-1 text-sm text-foreground"
      onChange={(event) => {
        const next = event.target.value;
        setFailed(false);
        startTransition(async () => {
          try {await setUserLocale(next); router.refresh();}
          catch {setFailed(true);}
        });
      }}>
      <option value="en">English</option>
      <option value="zh-CN">简体中文</option>
    </select>
    {failed && <span role="alert">{intl.t('dynamic.languageSaveFailed')}</span>}
  </div>;
}

