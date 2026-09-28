"use client";



import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/utils";
import { FILES_BADGE_SURFACE } from "@/modules/files/components/file-manager-surface";
import { Trash2 } from "@/components/icons/platform-icons";

type StatusBarProps = {
  clipboardName: string | null;
  clipboardOperation: "copy" | "move" | null;
  currentPathForDisplay: string[];
  fileCount: number;
  folderCount: number;
  isStarredView: boolean;
  isTrashView: boolean;
  rootLabel: string;
  selectedFilesCount: number;
  statusNotice: string | null;
  onTrashSelected: () => void;
};

export function FileManagerStatusBar({
  clipboardName,
  clipboardOperation,
  currentPathForDisplay,
  fileCount,
  folderCount,
  isStarredView,
  isTrashView,
  rootLabel,
  selectedFilesCount,
  statusNotice,
  onTrashSelected,
}: StatusBarProps) {
  const intl = useI18n();
  return (
    <div className="flex items-center justify-between border-t border-glass-border/60 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-3">
        <span>
          {folderCount > 0 && intl.t('dynamic.folders', {count: folderCount})}
          {intl.text(folderCount > 0 && fileCount > 0 ? ", " : "")}
          {fileCount > 0 && intl.t('dynamic.files', {count: fileCount})}
        </span>
        {selectedFilesCount > 1 && (
          <span className="flex items-center gap-1.5 text-primary">
            <span>{intl.t('dynamic.selected', {count: selectedFilesCount})}</span>
            {!isTrashView && !isStarredView && (
              <button
                onClick={onTrashSelected}
                title={intl.t("ui.moveSelectedToTrash")}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 text-status-red transition-colors hover:bg-status-red/15",
                  FILES_BADGE_SURFACE,
                )}
              >
                <Trash2 className="size-3" />
                <span>{intl.t("ui.moveToTrash")}</span>
              </button>
            )}
          </span>
        )}
      </span>

      <div className="flex items-center gap-3">
        {statusNotice && (
          <span className="max-w-72 truncate text-status-amber">{intl.text(statusNotice)}</span>
        )}
        {clipboardName && clipboardOperation && (
          <span className="max-w-56 truncate text-muted-foreground/60">
            {intl.text(clipboardOperation === "copy" ? "Clipboard" : "Cut")}: {clipboardName}
          </span>
        )}
        <span className="font-mono text-muted-foreground/50">
          {rootLabel}
          {intl.text(currentPathForDisplay.length > 0 ? `/${currentPathForDisplay.join("/")}` : "")}
        </span>
      </div>
    </div>
  );
}
