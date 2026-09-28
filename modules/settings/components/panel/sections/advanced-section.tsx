"use client";


import { useI18n } from "@/i18n/use-i18n";
import { SectionDivider } from "@/modules/settings/components/panel/controls";
import { LogsSection } from "@/modules/settings/components/panel/sections/logs-section";
import { ServerInfoSection } from "@/modules/settings/components/panel/sections/server-info-section";
import { TelemetrySection } from "@/modules/settings/components/panel/sections/telemetry-section";

export function AdvancedSection() {
  const intl = useI18n();
  return (
    <div className="flex flex-col gap-1">
      <SectionDivider title={intl.t("ui.serverHardware")} />
      <ServerInfoSection />

      <div className="mt-2">
        <SectionDivider title={intl.t("ui.logs")} />
        <LogsSection />
      </div>

      <div className="mt-2">
        <SectionDivider title={intl.t("ui.usageStats")} />
        <TelemetrySection />
      </div>
    </div>
  );
}
