import {describe, expect, it} from 'vitest';
import {createTranslator} from 'next-intl';
import {parse} from '@formatjs/icu-messageformat-parser';
import {resolveLocale} from './config';
import en from '../messages/en.json';
import zh from '../messages/zh-CN.json';
import {translateKnownText} from './use-i18n';

describe('internationalization', () => {
  it('respects the saved locale, browser priorities and English fallback', () => {
    expect(resolveLocale('zh-CN', 'en-US')).toBe('zh-CN');
    expect(resolveLocale(undefined, 'fr,zh-CN;q=0.8,en;q=0.5')).toBe('zh-CN');
    expect(resolveLocale('invalid', 'zh-CN;q=0,en-US;q=0.8')).toBe('en');
    expect(resolveLocale(undefined, 'zh-Hans-SG')).toBe('zh-CN');
    expect(resolveLocale(undefined, 'de')).toBe('en');
  });
  it('provides matching keys and valid ICU messages in both languages', () => {
    for (const ns of ['ui', 'dynamic'] as const) {
      expect(Object.keys(zh[ns]).sort()).toEqual(Object.keys(en[ns]).sort());
      for (const messages of [en, zh]) for (const [key,value] of Object.entries(messages[ns])) {
        expect(() => parse(value), `${ns}.${key}: ${value}`).not.toThrow();
      }
    }
  });
  it('formats plurals and preserves interpolated user content', () => {
    const english=createTranslator({locale:'en', messages:en});
    const chinese=createTranslator({locale:'zh-CN', messages:zh});
    expect(english('dynamic.files',{count:1})).toBe('1 file');
    expect(english('dynamic.files',{count:2})).toBe('2 files');
    expect(chinese('dynamic.files',{count:2})).toContain('2');
    expect(chinese('dynamic.openFile',{value0:'Settings <私人>.txt'})).toContain('Settings <私人>.txt');
    expect(translateKnownText('unknown user filename.txt',chinese)).toBe('unknown user filename.txt');
    expect(translateKnownText('Settings',chinese)).toBe('设置');
  });
});
