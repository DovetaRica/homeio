
import { useI18n } from "@/i18n/use-i18n";
import { Activity } from "@/components/icons/platform-icons";
import { ResourceItem } from "@/modules/system/components/system-widgets/resource-item";
import type { ResourceWidgetItem } from "@/modules/system/components/system-widgets/types";
import { WidgetCard } from "@/modules/system/components/system-widgets/widget-card";

type ResourcesCardProps = {
  items: ResourceWidgetItem[];
};

export function ResourcesCard({ items }: ResourcesCardProps) {
  const intl = useI18n();
  return (
    <WidgetCard title={intl.t("ui.resources")} icon={Activity}>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <ResourceItem key={item.label} {...item} />
        ))}
      </div>
    </WidgetCard>
  );
}
