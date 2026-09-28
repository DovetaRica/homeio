"use client";
import { zh } from "@/lib/i18n/zh";


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DAY_OF_WEEK_OPTIONS,
  SCHEDULE_TIME_OPTIONS,
  type ScheduledRebootInput,
  type SettingsBackend,
} from "@/modules/settings/components/panel/types";
import { InfoBanner, SectionDivider, Toggle } from "@/modules/settings/components/panel/controls";
import { SETTINGS_PANEL_INSET } from "@/modules/settings/components/panel/surface";
import { AlertTriangle, Loader2, Power, RefreshCw } from "@/components/icons/platform-icons";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PowerSectionProps = {
  power: SettingsBackend["power"];
  onRebootNow: () => Promise<void>;
  onShutdownNow: () => Promise<void>;
  onSaveScheduledReboot: (input: ScheduledRebootInput) => Promise<void>;
  onFactoryReset: () => Promise<void>;
};

const selectCls =
  "h-8 w-36 cursor-pointer appearance-none rounded-lg border border-glass-border bg-background/55 px-3 text-xs text-foreground focus:border-primary/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function PreferenceRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(SETTINGS_PANEL_INSET, "flex items-center justify-between gap-4 px-4 py-3")}>
      <div className="min-w-0">
        <div className="text-sm text-foreground">{zh(label)}</div>
        {description && (
          <div className="mt-0.5 text-[11px] text-muted-foreground/70">{zh(description)}</div>
        )}
      </div>
      {children}
    </div>
  );
}

export function PowerSection({
  power,
  onRebootNow,
  onShutdownNow,
  onSaveScheduledReboot,
  onFactoryReset,
}: PowerSectionProps) {
  const rebooting = power.reboot.isPending;
  const shuttingDown = power.shutdown.isPending;
  const resetting = power.factoryReset.isPending;
  const scheduledReboot = power.scheduledReboot;

  const [scheduleEnabled, setScheduleEnabled] = useState(scheduledReboot.enabled);
  const [scheduleFrequency, setScheduleFrequency] = useState(scheduledReboot.frequency);
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(scheduledReboot.dayOfWeek);
  const [scheduleTime, setScheduleTime] = useState(scheduledReboot.time);

  useEffect(() => {
    setScheduleEnabled(scheduledReboot.enabled);
    setScheduleFrequency(scheduledReboot.frequency);
    setScheduleDayOfWeek(scheduledReboot.dayOfWeek);
    setScheduleTime(scheduledReboot.time);
  }, [scheduledReboot.dayOfWeek, scheduledReboot.enabled, scheduledReboot.frequency, scheduledReboot.time]);

  const scheduleDirty =
    scheduleEnabled !== scheduledReboot.enabled ||
    scheduleFrequency !== scheduledReboot.frequency ||
    scheduleDayOfWeek !== scheduledReboot.dayOfWeek ||
    scheduleTime !== scheduledReboot.time;

  const scheduleDisabled = scheduledReboot.isLoading || scheduledReboot.isPending;

  return (
    <div className="flex flex-col gap-1">
      {/* ── Power Management ── */}
      <SectionDivider title="电源管理" />
      <InfoBanner
        text="These actions will affect all running services. Make sure to save your work before proceeding."
        variant="warning"
      />
      {power.reboot.error && <InfoBanner text={power.reboot.error} variant="warning" />}
      {power.shutdown.error && <InfoBanner text={power.shutdown.error} variant="warning" />}

      <div className="grid grid-cols-2 gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={rebooting || !power.reboot.available}
              className={cn(
                SETTINGS_PANEL_INSET,
                "group flex flex-col items-center gap-2 px-4 py-5 transition-colors hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <RefreshCw className="size-5 text-status-amber group-hover:animate-spin" />
              <span className="text-xs font-medium text-foreground">重启</span>
              <span className="text-[11px] text-muted-foreground/60">重启所有服务</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>要重启服务器吗？</AlertDialogTitle>
              <AlertDialogDescription>
                所有运行中的 Docker 容器和服务会暂时停止并重启，约需 30～60 秒。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-status-amber text-white hover:bg-status-amber/90"
                onClick={() => void onRebootNow()}
                disabled={rebooting}
              >
                {rebooting ? <><Loader2 className="size-4 animate-spin" />正在重启…</> : "Reboot now"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={shuttingDown || !power.shutdown.available}
              className={cn(
                SETTINGS_PANEL_INSET,
                "group flex flex-col items-center gap-2 px-4 py-5 transition-colors hover:bg-background/70 disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              <Power className="size-5 text-status-red" />
              <span className="text-xs font-medium text-foreground">关机</span>
              <span className="text-[11px] text-muted-foreground/60">关闭服务器电源</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>要关闭服务器吗？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将完全关闭服务器，需要手动开机后才能再次访问 Homeio。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => void onShutdownNow()}
                disabled={shuttingDown}
              >
                {shuttingDown ? <><Loader2 className="size-4 animate-spin" />正在关机…</> : "Shutdown now"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ── Scheduled Reboot ── */}
      <SectionDivider title="定时重启" />
      {scheduledReboot.error && <InfoBanner text={scheduledReboot.error} variant="warning" />}
      <div className="flex flex-col gap-1.5">
        <div className={cn(SETTINGS_PANEL_INSET, "px-4 py-1")}>
          <Toggle
            label="定时重启"
            description="Automatically reboot the server on a set schedule"
            enabled={scheduleEnabled}
            onToggle={() => setScheduleEnabled((v) => !v)}
            disabled={scheduleDisabled}
          />
        </div>

        <PreferenceRow label="频率">
          <select
            value={scheduleFrequency}
            onChange={(e) => setScheduleFrequency(e.target.value as "daily" | "weekly")}
            disabled={!scheduleEnabled || scheduleDisabled}
            className={selectCls}
          >
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
          </select>
        </PreferenceRow>

        {scheduleFrequency === "weekly" && (
          <PreferenceRow label="星期">
            <select
              value={scheduleDayOfWeek}
              onChange={(e) => setScheduleDayOfWeek(e.target.value as ScheduledRebootInput["dayOfWeek"])}
              disabled={!scheduleEnabled || scheduleDisabled}
              className={selectCls}
            >
              {DAY_OF_WEEK_OPTIONS.map((d) => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </PreferenceRow>
        )}

        <PreferenceRow label="时间" description="24-hour server local time">
          <select
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            disabled={!scheduleEnabled || scheduleDisabled}
            className={cn(selectCls, "font-mono")}
          >
            {SCHEDULE_TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </PreferenceRow>

        <div className={cn(SETTINGS_PANEL_INSET, "flex items-center justify-between gap-4 px-4 py-3")}>
          <span className="text-[11px] text-muted-foreground/70">
            {zh(scheduleEnabled
              ? `Reboot will run ${scheduleFrequency === "daily" ? "daily" : `every ${scheduleDayOfWeek}`} at ${scheduleTime}.`
              : "Scheduled reboot is disabled.")}
          </span>
          <button
            disabled={!scheduleDirty || scheduleDisabled}
            onClick={() => void onSaveScheduledReboot({ enabled: scheduleEnabled, frequency: scheduleFrequency, dayOfWeek: scheduleDayOfWeek, time: scheduleTime })}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scheduledReboot.isPending ? <><Loader2 className="size-3 animate-spin" />正在保存…</> : "Save schedule"}
          </button>
        </div>
      </div>

      {/* ── Factory Reset ── */}
      <SectionDivider title="恢复出厂设置" />
      {power.factoryReset.error && <InfoBanner text={power.factoryReset.error} variant="warning" />}
      <InfoBanner
        text="Factory reset will stop all containers, remove Docker images, custom networks, and volumes, reset the database, delete everything under /DATA, recreate the default directories, and then reboot the machine."
        variant="warning"
      />
      <div className={cn(SETTINGS_PANEL_INSET, "flex items-center justify-between gap-4 px-4 py-3")}>
        <div className="min-w-0">
          <div className="text-sm text-foreground">重置服务器</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground/70">清除所有数据并重置 Homeio</div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={resetting || !power.factoryReset.available}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <AlertTriangle className="size-3" />
              {zh(resetting ? "Resetting…" : "Factory Reset")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>要重置服务器吗？</AlertDialogTitle>
              <AlertDialogDescription>
                危险操作：将删除 Docker 容器、镜像、卷和自定义网络，重置数据库并清空 /DATA，然后重新创建数据目录并重启。重置后需要重新注册。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => void onFactoryReset()}
                disabled={resetting}
              >
                {resetting ? <><Loader2 className="size-4 animate-spin" />正在重置…</> : "Factory reset"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
