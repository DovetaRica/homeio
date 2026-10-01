import {cookies, headers} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';
import {localeCookie, resolveLocale} from './config';
import {messagesForLocale} from './messages';

export default getRequestConfig(async () => {
  const [store, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(store.get(localeCookie)?.value, requestHeaders.get('accept-language'));
  return {
    locale,
    // Explicit per-message English fallback; no mutable process-wide locale.
    messages: messagesForLocale(locale),
    timeZone: process.env.TZ || 'UTC',
  };
});
