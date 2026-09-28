"use client";

import { StatusScreen } from "./status-screen";

export function SessionLoadingScreen() {
  return (
    <StatusScreen
      title="正在加载会话…"
      body="Preparing your desktop, restoring preferences, and reconnecting Homeio services now."
    />
  );
}
