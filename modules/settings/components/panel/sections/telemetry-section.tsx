"use client";
import { zh } from "@/lib/i18n/zh";


import { Toggle } from "@/modules/settings/components/panel/controls";
import { useTelemetrySettings } from "@/modules/settings/hooks/useTelemetrySettings";
import { TELEMETRY_STATS_PAGE_URL } from "@/lib/shared/contracts/telemetry";

export function TelemetrySection() {
  const { settings, isLoading, isSaving, setEnabled } = useTelemetrySettings();
  const enabled = settings?.enabled ?? false;

  return (
    <div className="flex flex-col">
      <Toggle
        label="匿名使用统计"
        description="Twice a day, send a random ID, the Homeio version, CPU architecture and OS. No IP address, usernames, file paths or app names are stored."
        enabled={enabled}
        onToggle={() => setEnabled(!enabled)}
        disabled={isLoading || isSaving || settings?.disabledByEnv}
        disabledReason={
          zh(settings?.disabledByEnv
            ? "Turned off by HOMEIO_TELEMETRY=false in the server environment."
            : undefined)
        }
      />
      <a
        href={TELEMETRY_STATS_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs text-primary hover:underline"
      >
        在 homeio.app/stats 查看公开汇总统计
      </a>
    </div>
  );
}
