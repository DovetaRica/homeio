
import { useI18n } from "@/i18n/use-i18n";

import { ArrowDown, ArrowUp, Network } from "@/components/icons/platform-icons";
import type { NetworkWidgetData } from "@/modules/system/components/system-widgets/types";
import { WidgetCard } from "@/modules/system/components/system-widgets/widget-card";

type NetworkCardProps = {
  network: NetworkWidgetData;
};

export function NetworkCard({ network }: NetworkCardProps) {
  const intl = useI18n();
  return (
    <WidgetCard title={intl.t("ui.network")} icon={Network}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-4 items-center justify-center rounded-md bg-status-green/15">
              <ArrowDown className="size-2.5 text-status-green" />
            </div>
            <span className="text-xs text-muted-foreground">{intl.t("ui.download")}</span>
          </div>
          <span className="text-sm font-mono font-semibold text-status-green">
            {network.downloadText}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-4 items-center justify-center rounded-md bg-primary/12">
              <ArrowUp className="size-2.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">{intl.t("ui.upload")}</span>
          </div>
          <span className="text-sm font-mono font-semibold text-primary">
            {network.uploadText}
          </span>
        </div>

        <div className="h-px bg-white/[0.07]" />

        <DetailRow label="SSID" value={network.ssid} />
        <DetailRow label={intl.t("ui.interface")} value={network.interfaceName} />
        {!network.isDemoMode && (
          <DetailRow label={intl.t("ui.localIp")} value={network.ipAddress} />
        )}
        <DetailRow label={intl.t("ui.hostname")} value={network.hostname} />
      </div>
    </WidgetCard>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const intl = useI18n();
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground/70">{intl.text(label)}</span>
      <span className="text-xs font-mono text-foreground/80">{value}</span>
    </div>
  );
}
