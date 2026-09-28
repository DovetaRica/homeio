'use server';

import {cookies, headers} from 'next/headers';
import {isLocale, localeCookie} from './config';

export async function setUserLocale(locale: string) {
  if (!isLocale(locale)) throw new Error('Unsupported locale');
  const [store, requestHeaders] = await Promise.all([cookies(), headers()]);
  store.set(localeCookie, locale, {
    httpOnly: true,
    sameSite: 'lax',
    secure: requestHeaders.get('x-forwarded-proto') === 'https',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}
