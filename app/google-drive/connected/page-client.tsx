"use client";


import { useI18n } from "@/i18n/use-i18n";
import { useEffect } from "react";

type GoogleDriveConnectedClientProps = {
  error?: string;
  success?: string;
};

export default function GoogleDriveConnectedClient({
  error,
  success,
}: GoogleDriveConnectedClientProps) {
  const intl = useI18n();
  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        { type: "gd-oauth-complete", success: Boolean(success), error: error ?? null },
        window.location.origin,
      );
      window.close();
    }
  }, [success, error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        {success ? (
          <>
            <p className="text-lg font-semibold">{intl.t("ui.googleDriveConnected")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{intl.t("ui.youCanCloseThisWindow")}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-destructive">{intl.t("ui.connectionFailed")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error ?? "Unknown error"}{intl.t("ui.youCanCloseThisWindow2")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
