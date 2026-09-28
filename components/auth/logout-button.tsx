"use client";


import { useI18n } from "@/i18n/use-i18n";
import { LogOut } from "@/components/icons/platform-icons";

type LogoutButtonProps = {
  onLogout: () => void;
  isPending?: boolean;
};

export function LogoutButton({
  onLogout,
  isPending = false,
}: LogoutButtonProps) {
  const intl = useI18n();
  return (
    <button
      onClick={onLogout}
      disabled={isPending}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={intl.t("ui.logout")}
      title={intl.t("ui.logout")}
    >
      <LogOut className="size-3.5" />
      {/* <span>Logout</span> */}
    </button>
  );
}
