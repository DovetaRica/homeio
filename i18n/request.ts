import {cookies, headers} from 'next/headers';
import {getRequestConfig} from 'next-intl/server';
import {localeCookie, resolveLocale} from './config';
import en from '@/messages/en.json';
import zhCN from '@/messages/zh-CN.json';

export default getRequestConfig(async () => {
  const [store, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(store.get(localeCookie)?.value, requestHeaders.get('accept-language'));
  return {
    locale,
    // Explicit per-message English fallback; no mutable process-wide locale.
    messages: locale === 'zh-CN' ? {ui: {...en.ui, ...zhCN.ui}, dynamic: {...en.dynamic, ...zhCN.dynamic}, nas: {...en.nas, ...zhCN.nas, fields: {...en.nas.fields, ...zhCN.nas.fields}}} : en,
    timeZone: process.env.TZ || 'UTC',
  };
});
