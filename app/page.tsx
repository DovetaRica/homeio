import { DesktopShell } from "@/modules/shell/components/desktop-shell";
import { RealtimeBootstrap } from "@/components/providers/realtime-bootstrap";
import { DesktopModeProvider } from "@/modules/shell/desktop-mode";

export default function HomePage() {
  const nasMode = process.env.HOMEIO_NAS_MODE === 'true';
  return (
    <>
      <RealtimeBootstrap />
      <DesktopModeProvider nasMode={nasMode}><DesktopShell initialSettingsSection={nasMode ? 'overview' : undefined}/></DesktopModeProvider>
    </>
  );
}
