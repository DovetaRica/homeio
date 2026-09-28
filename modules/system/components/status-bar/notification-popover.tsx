"use client";



import {formatDistanceToNow} from "date-fns";
import {zhCN, enUS} from "date-fns/locale";
import { useI18n } from "@/i18n/use-i18n";
import { PopoverShell } from "@/modules/system/components/status-bar/popover-shell";
import type { Notification } from "@/modules/system/components/status-bar/types";

type NotificationPopoverProps = {
  onClose: () => void;
  notifications: Notification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onViewAll?: () => void;
};

export function NotificationPopover({
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onViewAll,
}: NotificationPopoverProps) {
  const intl = useI18n();
  return (
    <PopoverShell onClose={onClose} className="w-80">
      <div className="flex items-center justify-between p-3 border-b border-glass-border">
        <span className="text-sm font-semibold text-foreground">
          {intl.t("ui.notifications")}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={onMarkAllRead}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            {intl.t("ui.markAllRead")}
          </button>
          <button
            onClick={onClearAll}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            {intl.t("ui.clearAll")}
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {intl.t("ui.noAlertsRightNow")}
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 px-3 py-3 border-b border-glass-border/50 last:border-0 hover:bg-secondary/40 transition-colors ${
                !item.read ? "bg-primary/5" : ""
              }`}
            >
              {!item.read && (
                <span className="size-2 rounded-[var(--radius)] bg-primary shrink-0 mt-1.5" />
              )}
              <div className={`flex-1 min-w-0 ${item.read ? "ml-5" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground truncate">
                    {intl.text(item.title)}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.createdAt), {addSuffix: true, locale: intl.locale === "zh-CN" ? zhCN : enUS})}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {intl.text(item.message)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-glass-border px-3 py-2">
        <button onClick={onViewAll} className="text-xs text-primary hover:underline cursor-pointer">
          {intl.t("ui.viewAllNotifications")}
        </button>
      </div>
    </PopoverShell>
  );
}
