import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {NextIntlClientProvider} from 'next-intl';
import {describe,expect,it} from 'vitest';
import {useI18n} from './use-i18n';
import en from '../messages/en.json';
import zh from '../messages/zh-CN.json';
function Sample(){const intl=useI18n();return createElement('div',null,intl.t('ui.settings'),intl.t('dynamic.openFile',{value0:'<Settings>.txt'}));}
describe('server/client provider contract',()=>{it('renders both locales and safely escapes user content',()=>{for(const [locale,messages,label] of [['en',en,'Settings'],['zh-CN',zh,'设置']] as const){const html=renderToStaticMarkup(createElement(NextIntlClientProvider,{locale,messages,timeZone:'UTC'},createElement(Sample)));expect(html).toContain(label);expect(html).toContain('&lt;Settings&gt;.txt');}});});
