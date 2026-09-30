import {DesktopShell} from '@/modules/shell/components/desktop-shell';
import {RealtimeBootstrap} from '@/components/providers/realtime-bootstrap';
import {DesktopModeProvider} from '@/modules/shell/desktop-mode';
import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
export default async function DesktopPage() {
  const t=await getTranslations('nas');
  return <><RealtimeBootstrap/><DesktopModeProvider nasMode={process.env.HOMEIO_NAS_MODE==='true'}><DesktopShell/></DesktopModeProvider><Link href="/" className="fixed left-4 top-4 z-[100] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white backdrop-blur">← {t('title')}</Link></>;
}
