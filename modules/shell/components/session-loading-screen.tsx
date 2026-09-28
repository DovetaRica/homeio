"use client";


import { useI18n } from "@/i18n/use-i18n";
import { StatusScreen } from "./status-screen";

export function SessionLoadingScreen() {
  const intl = useI18n();
  return (
    <StatusScreen
      title={intl.t("ui.loadingSession")}
      body="Preparing your desktop, restoring preferences, and reconnecting Homeio services now."
    />
  );
}
