"use client";



import { useI18n } from "@/i18n/use-i18n";
import { SectionDivider, Toggle } from "@/modules/settings/components/panel/controls";
import { SETTINGS_PANEL_INSET } from "@/modules/settings/components/panel/surface";
import type { NotificationSettingsDraft } from "@/modules/settings/components/panel/types";
import { cn } from "@/lib/utils";

type NotificationsSectionProps = {
  draft: NotificationSettingsDraft;
  onChange: (patch: Partial<NotificationSettingsDraft>) => void;
};

function ThresholdRow({
  label,
  description,
  value,
  unit,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
}) {
  const intl = useI18n();
  return (
    <div className={cn(SETTINGS_PANEL_INSET, "flex items-center justify-between gap-4 px-4 py-3")}>
      <div className="min-w-0">
        <div className="text-sm text-foreground">{intl.text(label)}</div>
        {description && (
          <div className="mt-0.5 text-[11px] text-muted-foreground/70">{intl.text(description)}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="number"
          min={1}
          className="h-8 w-20 rounded-lg border border-glass-border bg-background/55 px-3 text-right text-xs text-foreground focus:border-primary/40 focus:outline-none"
        />
        <span className="w-6 text-[11px] text-muted-foreground/60">{unit}</span>
      </div>
    </div>
  );
}

export function NotificationsSection({ draft, onChange }: NotificationsSectionProps) {
  const intl = useI18n();
  return (
    <div className="flex flex-col gap-1">
      <SectionDivider title={intl.t("ui.alertTypes")} />
      <div className="flex flex-col gap-1.5">
        {[
          {
            label: "System alerts",
            description: "CPU overload, high temperature, low disk space",
            key: "systemAlertsEnabled" as const,
          },
          {
            label: "Update notifications",
            description: "Homeio update availability in the desktop alert center",
            key: "updateNotificationsEnabled" as const,
          },
          {
            label: "Backup reports",
            description: "Backup success and failure notifications",
            key: "backupReportsEnabled" as const,
          },
        ].map(({ label, description, key }) => (
          <div key={key} className={cn(SETTINGS_PANEL_INSET, "px-4 py-1")}>
            <Toggle
              label={intl.text(label)}
              description={intl.text(description)}
              enabled={draft[key]}
              onToggle={() => onChange({ [key]: !draft[key] })}
            />
          </div>
        ))}

        <div className={cn(SETTINGS_PANEL_INSET, "px-4 py-1")}>
          <Toggle
            label={intl.t("ui.securityEvents")}
            description={intl.t("ui.failedLoginsFirewallBlocksCertificateExpiry")}
            enabled={draft.securityEventsEnabled}
            onToggle={() => undefined}
            disabled
            disabledReason={intl.t("ui.comingSoon")}
          />
        </div>
      </div>

      <SectionDivider title={intl.t("ui.thresholds")} />
      <div className="flex flex-col gap-1.5">
        <ThresholdRow
          label={intl.t("ui.cpuUsage")}
          description={intl.t("ui.alertWhenCpuExceedsThisLevel")}
          value={draft.cpuAlertThresholdPercent}
          unit="%"
          onChange={(v) => onChange({ cpuAlertThresholdPercent: v })}
        />
        <ThresholdRow
          label={intl.t("ui.memoryUsage")}
          description={intl.t("ui.alertWhenRamExceedsThisLevel")}
          value={draft.memoryAlertThresholdPercent}
          unit="%"
          onChange={(v) => onChange({ memoryAlertThresholdPercent: v })}
        />
        <ThresholdRow
          label={intl.t("ui.diskSpace")}
          description={intl.t("ui.alertWhenDiskUsageExceedsThisLevel")}
          value={draft.diskAlertThresholdPercent}
          unit="%"
          onChange={(v) => onChange({ diskAlertThresholdPercent: v })}
        />
        <ThresholdRow
          label={intl.t("ui.temperature")}
          description={intl.t("ui.alertWhenCpuTemperatureExceedsThisLevel")}
          value={draft.temperatureAlertThresholdCelsius}
          unit="°C"
          onChange={(v) => onChange({ temperatureAlertThresholdCelsius: v })}
        />
      </div>
    </div>
  );
}
