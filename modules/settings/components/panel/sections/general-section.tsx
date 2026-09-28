"use client";
import { zh } from "@/lib/i18n/zh";


import { Cpu, MemoryStick, MonitorSpeaker, Thermometer } from "@/components/icons/platform-icons";
import {
  InfoBanner,
  SectionDivider,
} from "@/modules/settings/components/panel/controls";
import {
  SETTINGS_BADGE_SURFACE,
  SETTINGS_PANEL_INSET,
} from "@/modules/settings/components/panel/surface";
import type { SettingsBackend } from "@/modules/settings/components/panel/types";
import { cn } from "@/lib/utils";

type GeneralSectionProps = {
  data: SettingsBackend["general"];
  preferences: SettingsBackend["generalPreferences"] & {
    hostname: string;
    timezone: string;
  };
  capabilities: SettingsBackend["capabilities"]["general"];
  languageValue: string;
  languageOptions: string[];
  onHostnameChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
};

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs text-muted-foreground">{zh(label)}</span>
      <span className={cn("truncate text-right text-xs font-medium text-foreground", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

function HardwareRow({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border border-glass-border bg-background/55", iconClass)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">{zh(label)}</div>
        <div className="truncate text-xs font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function PreferenceRow({
  label,
  description,
  disabled,
  children,
}: {
  label: string;
  description?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(SETTINGS_PANEL_INSET, "flex items-center justify-between gap-4 px-4 py-3", disabled && "opacity-50")}>
      <div className="min-w-0">
        <div className="text-sm text-foreground">{zh(label)}</div>
        {description && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{zh(description)}</div>}
      </div>
      {children}
    </div>
  );
}

export function GeneralSection({
  data,
  preferences,
  capabilities,
  languageValue,
  languageOptions,
  onHostnameChange,
  onTimezoneChange,
  onLanguageChange,
}: GeneralSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      {data.warning ? (
        <InfoBanner text={data.warning} variant={data.unavailable ? "warning" : "info"} />
      ) : null}

      {/* ── System Info ── */}
      <SectionDivider title="系统信息" />
      <div className={cn(SETTINGS_PANEL_INSET, "divide-y divide-glass-border/50 px-4")}>
        <InfoRow label="主机名" value={data.hostname} />
        <InfoRow label="操作系统" value={data.platform} />
        <InfoRow label="内核" value={data.kernel} mono />
        <InfoRow label="架构" value={data.architecture} />
        <InfoRow label="运行时间" value={data.uptime} />
        <InfoRow label="Homeio 版本" value={data.appVersion} />
      </div>

      {/* ── Hardware ── */}
      <SectionDivider title="硬件" />
      <div className={cn(SETTINGS_PANEL_INSET, "divide-y divide-glass-border/50 px-4")}>
        <HardwareRow
          icon={<Cpu className="size-3.5 text-primary" />}
          label="处理器"
          value={data.cpuSummary}
        />
        <HardwareRow
          icon={<MemoryStick className="size-3.5 text-primary" />}
          label="内存"
          value={data.memorySummary}
        />
        <HardwareRow
          icon={<Thermometer className="size-3.5 text-status-amber" />}
          label="处理器温度"
          value={data.temperatureSummary}
        />
        <HardwareRow
          icon={<MonitorSpeaker className="size-3.5 text-primary" />}
          label="用户"
          value={`${data.username} (${data.processUptime})`}
        />
      </div>

      {/* ── Preferences ── */}
      <SectionDivider title="偏好设置" />
      {preferences.error ? (
        <InfoBanner text={preferences.error} variant="warning" />
      ) : null}

      <div className="flex flex-col gap-1.5">
        <PreferenceRow
          label="主机名"
          description="Applies immediately with hostnamectl."
          disabled={capabilities.hostname.disabled}
        >
          <input
            value={preferences.hostname}
            onChange={(e) => onHostnameChange(e.target.value)}
            disabled={capabilities.hostname.disabled}
            className="h-8 w-44 rounded-lg border border-glass-border bg-background/55 px-3 text-xs text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary/40 focus:outline-none disabled:cursor-not-allowed"
          />
        </PreferenceRow>

        <PreferenceRow
          label="时区"
          description="Applies immediately with timedatectl."
          disabled={capabilities.timezone.disabled}
        >
          <select
            value={preferences.timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            disabled={capabilities.timezone.disabled}
            className="h-8 w-44 cursor-pointer appearance-none rounded-lg border border-glass-border bg-background/55 px-3 text-xs text-foreground transition-all focus:border-primary/40 focus:outline-none disabled:cursor-not-allowed"
          >
            {preferences.timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </PreferenceRow>

        <PreferenceRow
          label="语言"
          description="仅保存为当前浏览器的 Homeio 界面偏好。"
          disabled={capabilities.language.disabled}
        >
          <select
            value={languageValue}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={capabilities.language.disabled}
            className="h-8 w-44 cursor-pointer appearance-none rounded-lg border border-glass-border bg-background/55 px-3 text-xs text-foreground transition-all focus:border-primary/40 focus:outline-none disabled:cursor-not-allowed"
          >
            {languageOptions.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </PreferenceRow>
      </div>
    </div>
  );
}
