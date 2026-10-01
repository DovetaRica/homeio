import type {AbstractIntlMessages} from 'next-intl';
import en from '@/messages/en.json';
import zhCN from '@/messages/zh-CN.json';

function mergeMessages(base: AbstractIntlMessages, translated: AbstractIntlMessages): AbstractIntlMessages {
  const merged = {...base};
  for (const [key, value] of Object.entries(translated)) {
    const fallback = base[key];
    merged[key] = typeof value === 'object' && typeof fallback === 'object'
      ? mergeMessages(fallback, value) : value;
  }
  return merged;
}

const chinese = mergeMessages(en, zhCN);
export function messagesForLocale(locale: string) {
  return locale === 'zh-CN' ? chinese : en;
}
