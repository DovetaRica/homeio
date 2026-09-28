"use client";



import { useI18n } from "@/i18n/use-i18n";
import { InfoBanner, SectionDivider } from "@/modules/settings/components/panel/controls";
import { SETTINGS_PANEL_INSET } from "@/modules/settings/components/panel/surface";
import type { SettingsBackend } from "@/modules/settings/components/panel/types";
import { cn } from "@/lib/utils";

type NetworkSectionProps = {
  data: SettingsBackend["network"];
};

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const intl = useI18n();
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs text-muted-foreground">{intl.text(label)}</span>
      <span className={cn("truncate text-right text-xs font-medium text-foreground", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

export function NetworkSection({ data }: NetworkSectionProps) {
  const intl = useI18n();
  const isEthernet = data.connected && data.ssid === "--";

  return (
    <div className="flex flex-col gap-1">
      {data.warning && (
        <InfoBanner text={data.warning} variant={data.unavailable ? "warning" : "info"} />
      )}

      <SectionDivider title={intl.t("ui.interface")} />
      <div className={cn(SETTINGS_PANEL_INSET, "overflow-hidden")}>
        {/* Status header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "size-2 rounded-full",
              data.connected ? "bg-status-green" : "bg-muted-foreground/40",
            )} />
            <span className="text-sm font-medium text-foreground">{data.iface}</span>
            <span className="text-xs text-muted-foreground">
              {intl.text(data.connected ? "Connected" : "Disconnected")}
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {intl.text(isEthernet ? "Ethernet" : `Signal ${data.signalPercent}`)}
          </span>
        </div>

        {/* Detail rows */}
        <div className="divide-y divide-glass-border/50 border-t border-glass-border/50 px-4">
          <InfoRow label="IPv4 Address" value={data.ipv4} mono />
          {isEthernet ? (
            <InfoRow label={intl.t("ui.connectionType")} value="Wired Ethernet" />
          ) : (
            <>
              <InfoRow label="SSID" value={data.ssid} mono />
              <InfoRow label={intl.t("ui.nearbyNetworks")} value={String(data.wifiCount)} />
              {data.topSsids.length > 0 && (
                <div className="py-2.5">
                  <span className="text-xs text-muted-foreground">{intl.t("ui.nearbySsids")}</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {data.topSsids.map((ssid) => (
                      <span
                        key={ssid}
                        className="rounded-md border border-glass-border bg-background/50 px-2 py-0.5 font-mono text-[11px] text-foreground/80"
                      >
                        {ssid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <SectionDivider title={intl.t("ui.advanced")} />
      <div className={cn(SETTINGS_PANEL_INSET, "px-4 py-3")}>
        <p className="text-xs text-muted-foreground">
          {intl.t("ui.gatewayDnsDhcpIpv6MtuAndWakeOnLanConfigurationIsComing")}
        </p>
      </div>
    </div>
  );
}
