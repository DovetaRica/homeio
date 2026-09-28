export const DESKTOP_PREFERENCES_STORAGE_KEY = "desktop.preferences.v1";

export const DESKTOP_LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
] as const;

export type DesktopLanguageCode = (typeof DESKTOP_LANGUAGE_OPTIONS)[number]["code"];

export type DesktopPreferences = {
  language: DesktopLanguageCode;
  autoCheckUpdates: boolean;
  notifications: DesktopNotificationPreferences;
};

export type DesktopNotificationPreferences = {
  systemAlertsEnabled: boolean;
  updateNotificationsEnabled: boolean;
  backupReportsEnabled: boolean;
  securityEventsEnabled: boolean;
  cpuAlertThresholdPercent: number;
  memoryAlertThresholdPercent: number;
  diskAlertThresholdPercent: number;
  temperatureAlertThresholdCelsius: number;
};

export const DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES: DesktopNotificationPreferences = {
  systemAlertsEnabled: true,
  updateNotificationsEnabled: true,
  backupReportsEnabled: true,
  securityEventsEnabled: false,
  cpuAlertThresholdPercent: 85,
  memoryAlertThresholdPercent: 85,
  diskAlertThresholdPercent: 90,
  temperatureAlertThresholdCelsius: 80,
};

export const DEFAULT_DESKTOP_PREFERENCES: DesktopPreferences = {
  language: "en",
  autoCheckUpdates: true,
  notifications: DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES,
};

function parseThreshold(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

function parseNotificationPreferences(
  value: unknown,
): DesktopNotificationPreferences {
  const parsed = value && typeof value === "object"
    ? (value as Partial<DesktopNotificationPreferences>)
    : {};

  return {
    systemAlertsEnabled:
      typeof parsed.systemAlertsEnabled === "boolean"
        ? parsed.systemAlertsEnabled
        : DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.systemAlertsEnabled,
    updateNotificationsEnabled:
      typeof parsed.updateNotificationsEnabled === "boolean"
        ? parsed.updateNotificationsEnabled
        : DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.updateNotificationsEnabled,
    backupReportsEnabled:
      typeof parsed.backupReportsEnabled === "boolean"
        ? parsed.backupReportsEnabled
        : DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.backupReportsEnabled,
    securityEventsEnabled:
      typeof parsed.securityEventsEnabled === "boolean"
        ? parsed.securityEventsEnabled
        : DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.securityEventsEnabled,
    cpuAlertThresholdPercent: parseThreshold(
      parsed.cpuAlertThresholdPercent,
      DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.cpuAlertThresholdPercent,
      1,
      100,
    ),
    memoryAlertThresholdPercent: parseThreshold(
      parsed.memoryAlertThresholdPercent,
      DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.memoryAlertThresholdPercent,
      1,
      100,
    ),
    diskAlertThresholdPercent: parseThreshold(
      parsed.diskAlertThresholdPercent,
      DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.diskAlertThresholdPercent,
      1,
      100,
    ),
    temperatureAlertThresholdCelsius: parseThreshold(
      parsed.temperatureAlertThresholdCelsius,
      DEFAULT_DESKTOP_NOTIFICATION_PREFERENCES.temperatureAlertThresholdCelsius,
      1,
      150,
    ),
  };
}

export function isDesktopLanguageCode(value: unknown): value is DesktopLanguageCode {
  return DESKTOP_LANGUAGE_OPTIONS.some((option) => option.code === value);
}

export function readDesktopPreferences(storage: Storage | undefined) {
  if (!storage) return DEFAULT_DESKTOP_PREFERENCES;

  try {
    const raw = storage.getItem(DESKTOP_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_DESKTOP_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<DesktopPreferences>;
    return {
      // Old language options were cosmetic. Preserve all other saved preferences.
      language: isDesktopLanguageCode(parsed.language) ? parsed.language : DEFAULT_DESKTOP_PREFERENCES.language,
      autoCheckUpdates:
        typeof parsed.autoCheckUpdates === "boolean"
          ? parsed.autoCheckUpdates
          : DEFAULT_DESKTOP_PREFERENCES.autoCheckUpdates,
      notifications: parseNotificationPreferences(parsed.notifications),
    } satisfies DesktopPreferences;
  } catch {
    return DEFAULT_DESKTOP_PREFERENCES;
  }
}

export function writeDesktopPreferences(
  storage: Storage | undefined,
  preferences: DesktopPreferences,
) {
  if (!storage) return;

  try {
    storage.setItem(DESKTOP_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Best effort only.
  }
}
