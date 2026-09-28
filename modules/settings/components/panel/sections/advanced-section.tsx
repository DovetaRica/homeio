"use client";

import { SectionDivider } from "@/modules/settings/components/panel/controls";
import { LogsSection } from "@/modules/settings/components/panel/sections/logs-section";
import { ServerInfoSection } from "@/modules/settings/components/panel/sections/server-info-section";
import { TelemetrySection } from "@/modules/settings/components/panel/sections/telemetry-section";

export function AdvancedSection() {
  return (
    <div className="flex flex-col gap-1">
      <SectionDivider title="服务器硬件" />
      <ServerInfoSection />

      <div className="mt-2">
        <SectionDivider title="日志" />
        <LogsSection />
      </div>

      <div className="mt-2">
        <SectionDivider title="使用统计" />
        <TelemetrySection />
      </div>
    </div>
  );
}
