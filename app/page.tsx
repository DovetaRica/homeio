import { DesktopShell } from "@/modules/shell/components/desktop-shell";
import { RealtimeBootstrap } from "@/components/providers/realtime-bootstrap";
import { NasDashboard } from "@/modules/nas/dashboard";

export default function HomePage() {
  if (process.env.HOMEIO_NAS_MODE === 'true') return <NasDashboard officialUrl={process.env.TRUENAS_UI_URL ?? 'https://192.168.31.221'}/>;
  return (
    <>
      <RealtimeBootstrap />
      <DesktopShell />
    </>
  );
}
