"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setUserLocale } from "@/i18n/actions";
import { isLocale, defaultLocale } from "@/i18n/config";
import { toast } from "sonner";
import {
  DEFAULT_DESKTOP_PREFERENCES,
  DESKTOP_LANGUAGE_OPTIONS,
  readDesktopPreferences,
  writeDesktopPreferences,
  type DesktopNotificationPreferences,
} from "@/lib/desktop/preferences";

export function useDesktopPreferences() {
  const resolvedLocale = useLocale();
  const language = isLocale(resolvedLocale) ? resolvedLocale : defaultLocale;
  const router = useRouter();
  const t = useTranslations();
  const [preferences, setPreferences] = useState(DEFAULT_DESKTOP_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPreferences({...readDesktopPreferences(window.localStorage), language});
    setIsHydrated(true);
  }, [language]);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    writeDesktopPreferences(window.localStorage, preferences);
  }, [isHydrated, preferences]);

  const languageLabel = useMemo(
    () =>
      DESKTOP_LANGUAGE_OPTIONS.find((option) => option.code === preferences.language)?.label ??
      DESKTOP_LANGUAGE_OPTIONS[0].label,
    [preferences.language],
  );

  return {
    preferences,
    isHydrated,
    languageLabel,
    languageOptions: DESKTOP_LANGUAGE_OPTIONS,
    setLanguage(nextLanguage: (typeof DESKTOP_LANGUAGE_OPTIONS)[number]["code"]) {
      void setUserLocale(nextLanguage).then(() => {
        setPreferences((current) => ({...current, language: nextLanguage}));
        router.refresh();
      }).catch(() => toast.error(t('dynamic.languageSaveFailed')));
    },
    setAutoCheckUpdates(autoCheckUpdates: boolean) {
      setPreferences((current) => ({
        ...current,
        autoCheckUpdates,
      }));
    },
    notificationPreferences: preferences.notifications,
    setSystemAlertsEnabled(systemAlertsEnabled: boolean) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          systemAlertsEnabled,
        },
      }));
    },
    setUpdateNotificationsEnabled(updateNotificationsEnabled: boolean) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          updateNotificationsEnabled,
        },
      }));
    },
    setBackupReportsEnabled(backupReportsEnabled: boolean) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          backupReportsEnabled,
        },
      }));
    },
    setSecurityEventsEnabled(securityEventsEnabled: boolean) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          securityEventsEnabled,
        },
      }));
    },
    setCpuAlertThresholdPercent(cpuAlertThresholdPercent: number) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          cpuAlertThresholdPercent,
        },
      }));
    },
    setMemoryAlertThresholdPercent(memoryAlertThresholdPercent: number) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          memoryAlertThresholdPercent,
        },
      }));
    },
    setDiskAlertThresholdPercent(diskAlertThresholdPercent: number) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          diskAlertThresholdPercent,
        },
      }));
    },
    setTemperatureAlertThresholdCelsius(temperatureAlertThresholdCelsius: number) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          temperatureAlertThresholdCelsius,
        },
      }));
    },
    setNotificationPreferences(
      notifications:
        | DesktopNotificationPreferences
        | ((current: DesktopNotificationPreferences) => DesktopNotificationPreferences),
    ) {
      setPreferences((current) => ({
        ...current,
        notifications:
          typeof notifications === "function"
            ? notifications(current.notifications)
            : notifications,
      }));
    },
  };
}
