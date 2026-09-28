export const locales = ['en', 'zh-CN'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'en';
export const localeCookie = 'homeio.locale';

export function isLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'zh-CN';
}

export function resolveLocale(cookie: string | undefined, acceptLanguage: string | null): AppLocale {
  if (isLocale(cookie)) return cookie;
  const languages = (acceptLanguage ?? '').split(',').map((entry, index) => {
    const [tag, ...options] = entry.trim().split(';');
    const quality = options.find((option) => option.trim().startsWith('q='));
    return {tag: tag.toLowerCase(), quality: quality ? Number(quality.trim().slice(2)) : 1, index};
  }).filter((entry) => Number.isFinite(entry.quality) && entry.quality > 0 && entry.quality <= 1)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  for (const {tag} of languages) {
    if (tag === 'zh' || tag === 'zh-cn' || tag.startsWith('zh-hans')) return 'zh-CN';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return defaultLocale;
}
