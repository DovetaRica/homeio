import {useMemo} from 'react';
import {useLocale, useTranslations} from 'next-intl';
import sourceKeys from './source-keys.json';

/** Adapter only for existing enum labels and server error text. New UI uses t(key, values).
 * Unknown strings pass through; never use this on filenames or user content.
 * There is deliberately no regex replacement or case-insensitive matching.
 */
export function translateKnownText<T>(value: T, translate: (key: string) => string): T {
  if (typeof value !== 'string') return value;
  const key = Object.hasOwn(sourceKeys, value) ? sourceKeys[value as keyof typeof sourceKeys] : undefined;
  return (key ? translate(key) : value) as T;
}

export function useI18n() {
  const t = useTranslations();
  const locale = useLocale();
  return useMemo(() => ({t, locale, text: <T,>(value: T): T => translateKnownText(value, t)}), [t, locale]);
}
