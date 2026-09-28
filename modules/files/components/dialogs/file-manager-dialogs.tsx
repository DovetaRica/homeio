"use client";



import { useI18n } from "@/i18n/use-i18n";
import { getFileIcon, type FileEntry } from "@/modules/files/components/file-manager-presenters";
import {
  FILES_MENU_SHELL,
  FILES_PANEL_INSET,
} from "@/modules/files/components/file-manager-surface";
import { cn } from "@/lib/utils";
import { formatBytesCompact } from "@/lib/client/format";
import type { FileInfoResponse } from "@/lib/shared/contracts/files";
import { File, FileArchive, Folder, Trash2, Upload, X } from "@/components/icons/platform-icons";

const cancelBtn = "rounded-lg px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50";
const inputField = "mt-1 h-8 w-full rounded-lg border border-glass-border bg-background/55 px-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/40 focus:bg-background/70";
const overlay = "absolute inset-0 z-[205] flex items-center justify-center bg-background/35 px-4 backdrop-blur-[1px]";

export function CreateEntryDialog({
  dialog,
  isCreatePending,
  onClose,
  onDialogChange,
  onSubmit,
}: {
  dialog: { kind: "file" | "folder"; name: string; error: string | null };
  isCreatePending: boolean;
  onClose: () => void;
  onDialogChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const intl = useI18n();
  return (
    <div className={overlay} onClick={onClose}>
      <div
        className={cn("w-full max-w-xs p-3", FILES_MENU_SHELL)}
        role="dialog"
        aria-modal="true"
        aria-label={intl.text(dialog.kind === "folder" ? "Create new folder" : "Create new file")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          {dialog.kind === "folder" ? (
            <Folder className="size-4 text-sky-400" />
          ) : (
            <File className="size-4 text-emerald-400" />
          )}
          <span>{intl.text(dialog.kind === "folder" ? "Create New Folder" : "Create New File")}</span>
        </div>

        <label className="mb-2 block text-xs text-muted-foreground">
          {intl.text(dialog.kind === "folder" ? "Folder name" : "File name")}
          <input
            autoFocus
            type="text"
            value={dialog.name}
            onChange={(e) => onDialogChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
              else if (e.key === "Escape") { e.preventDefault(); onClose(); }
            }}
            className={inputField}
            placeholder={intl.text(dialog.kind === "folder" ? "my-folder" : "notes.txt")}
          />
        </label>

        {dialog.error && <div className="mb-2 text-xs text-status-red">{intl.text(dialog.error)}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isCreatePending} className={cancelBtn}>
            {intl.t("ui.cancel")}
          </button>
          <button
            onClick={onSubmit}
            disabled={dialog.name.trim().length === 0 || Boolean(dialog.error) || isCreatePending}
            className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {intl.t("ui.create")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RenameEntryDialog({
  dialog,
  isRenamePending,
  onClose,
  onDialogChange,
  onSubmit,
}: {
  dialog: { entry: FileEntry; name: string; error: string | null };
  isRenamePending: boolean;
  onClose: () => void;
  onDialogChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const intl = useI18n();
  return (
    <div className={overlay} onClick={onClose}>
      <div
        className={cn("w-full max-w-xs p-3", FILES_MENU_SHELL)}
        role="dialog"
        aria-modal="true"
        aria-label={intl.t("ui.renameItem")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          {dialog.entry.type === "folder" ? (
            <Folder className="size-4 text-sky-400" />
          ) : (
            <File className="size-4 text-emerald-400" />
          )}
          <span>{intl.t("ui.rename")}</span>
        </div>

        <label className="mb-2 block text-xs text-muted-foreground">
          {intl.t("ui.newName")}
          <input
            autoFocus
            type="text"
            value={dialog.name}
            onChange={(e) => onDialogChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
              else if (e.key === "Escape") { e.preventDefault(); onClose(); }
            }}
            className={inputField}
            placeholder={dialog.entry.name}
          />
        </label>

        {dialog.error && <div className="mb-2 text-xs text-status-red">{intl.text(dialog.error)}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={isRenamePending} className={cancelBtn}>
            {intl.t("ui.cancel")}
          </button>
          <button
            onClick={onSubmit}
            disabled={
              dialog.name.trim().length === 0 ||
              dialog.name.trim() === dialog.entry.name ||
              Boolean(dialog.error) ||
              isRenamePending
            }
            className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {intl.text(isRenamePending ? "Renaming…" : "Rename")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmptyTrashConfirmDialog({
  itemCount,
  onCancel,
  onConfirm,
}: {
  itemCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const intl = useI18n();
  return (
    <div className={overlay} onClick={onCancel}>
      <div
        className={cn("w-full max-w-xs p-4", FILES_MENU_SHELL)}
        role="dialog"
        aria-modal="true"
        aria-label={intl.t("ui.emptyTrash")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Trash2 className="size-4 shrink-0 text-status-red" />
          <span>{intl.t("ui.emptyTrash")}</span>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          {intl.t("ui.deletePermanently")}{intl.text(" ")}
          <span className="font-semibold text-foreground">
            {itemCount} {intl.t("ui.item")}{intl.text(itemCount !== 1 ? "s" : "")}
          </span>{intl.text(" ")}
          {intl.t("ui.fromTrashThisCannotBeUndone")}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className={cancelBtn}>
            {intl.t("ui.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-status-red/15 px-2.5 py-1 text-xs font-medium text-status-red transition-colors hover:bg-status-red/20"
          >
            {intl.t("ui.emptyTrash")}
          </button>
        </div>
      </div>
    </div>
  );
}

function getUploadPercent(progress: { loaded: number; total: number } | null) {
  if (!progress || progress.total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((progress.loaded / progress.total) * 100)));
}

export function UploadProgressDialog({
  operation = "upload",
  progress,
  onCancel,
}: {
  operation?: "upload" | "unzip";
  progress: { loaded: number; total: number } | null;
  onCancel?: () => void;
}) {
  const intl = useI18n();
  const isUpload = operation === "upload";
  const progressPercent = getUploadPercent(progress);
  const progressText = progress
    ? intl.t('dynamic.progress', {loaded: formatBytesCompact(progress.loaded), total: formatBytesCompact(progress.total)})
    : isUpload
      ? "Preparing upload"
      : "Extracting archive";
  const title = isUpload ? "Uploading files" : "Unzipping file";
  const status = isUpload ? "Uploading" : "Unzipping";
  const progressLabel = isUpload ? "Upload progress" : "Unzip progress";

  return (
    <div className={overlay}>
      <div
        className={cn("w-full max-w-sm overflow-hidden p-0", FILES_MENU_SHELL)}
        role="dialog"
        aria-modal="true"
        aria-label={intl.text(progressLabel)}
      >
        <div className="flex h-11 shrink-0 select-none items-center border-b border-glass-border/50 bg-popover/70 backdrop-blur-2xl">
          <div className="flex items-center gap-1.5 px-4">
            {onCancel ? (
              <button
                onClick={onCancel}
                aria-label={intl.t('dynamic.cancelOperation', {value0: intl.text(operation)})}
                title={intl.t('dynamic.cancelOperation', {value0: intl.text(operation)})}
                className="group flex size-3 cursor-pointer items-center justify-center rounded-full bg-[#ff5f57] ring-1 ring-inset ring-black/10"
              >
                <X className="size-[7px] text-[#6a0002] opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ) : (
              <span className="size-3 rounded-full bg-white/10" />
            )}
            <span className="size-3 rounded-full bg-white/10" />
            <span className="size-3 rounded-full bg-white/10" />
          </div>
          <div className="flex flex-1 items-center justify-center gap-1.5">
            {isUpload ? (
              <Upload className="size-3.5 text-primary/70" />
            ) : (
              <FileArchive className="size-3.5 text-primary/70" />
            )}
            <span className="text-xs font-medium text-foreground/80">{intl.text(title)}</span>
          </div>
          <div className="w-[76px]" />
        </div>

        <div className="p-4">
          <div className="mb-3 text-xs tabular-nums text-muted-foreground">{progressText}</div>
          <div
            className="overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label={intl.text(progressLabel)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ? progressPercent : undefined}
          >
            <div
              className={cn(
                "h-2 rounded-full bg-primary transition-all duration-150",
                !progress && !isUpload && "w-1/2 animate-pulse",
              )}
              style={progress || isUpload ? { width: `${progressPercent}%` } : undefined}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{status}</span>
            <span className="tabular-nums">{intl.text(progress ? `${progressPercent}%` : isUpload ? "0%" : "Working")}</span>
          </div>
          {onCancel ? (
            <div className="mt-4 flex justify-end">
              <button onClick={onCancel} className={cancelBtn}>
                {intl.t("ui.cancel")} {operation}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FileInfoDialogOverlay({
  fileInfo,
  onClose,
}: {
  fileInfo: FileInfoResponse;
  onClose: () => void;
}) {
  const intl = useI18n();
  const rows = [
    {
      label: "Type",
      value:
        fileInfo.type === "folder"
          ? "Folder"
          : fileInfo.ext
            ? `${fileInfo.ext.toUpperCase()} file`
            : "File",
    },
    { label: "Size", value: fileInfo.type === "folder" ? "—" : formatBytesCompact(fileInfo.sizeBytes) },
    {
      label: "Modified",
      value: new Date(fileInfo.modifiedAt).toLocaleString(intl.locale, {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
      }),
    },
    {
      label: "Created",
      value: new Date(fileInfo.createdAt).toLocaleString(intl.locale, {
        month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
      }),
    },
    { label: "Path", value: fileInfo.path },
    { label: "Permissions", value: fileInfo.permissions },
    { label: "Starred", value: fileInfo.starred ? "Yes" : "No" },
  ];

  return (
    <div className={overlay} onClick={onClose}>
      <div
        className={cn("w-full max-w-sm p-4", FILES_MENU_SHELL)}
        role="dialog"
        aria-modal="true"
        aria-label={intl.t("ui.fileInfo")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon({ ...fileInfo, modified: "", modifiedAt: "", mtimeMs: 0 } as FileEntry)}
            <span className="max-w-56 truncate text-sm font-semibold text-foreground">
              {fileInfo.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          {rows.map(({ label, value }) => (
            <div key={label} className={cn("flex items-start gap-2 px-2.5 py-1.5", FILES_PANEL_INSET)}>
              <span className="w-24 shrink-0 text-muted-foreground/70">{intl.text(label)}</span>
              <span className="break-all font-mono text-foreground">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-end">
          <button onClick={onClose} className={cancelBtn}>
            {intl.t("ui.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PasteConflictDialog({
  conflictName,
  onReplace,
  onKeepBoth,
  onSkip,
  onSkipAll,
}: {
  conflictName: string;
  onReplace: () => void;
  onKeepBoth: () => void;
  onSkip: () => void;
  onSkipAll: () => void;
}) {
  const intl = useI18n();
  return (
    <div className="absolute inset-0 z-[205] flex items-center justify-center bg-background/35 px-4 backdrop-blur-[1px]">
      <div
        className={cn("w-full max-w-sm p-4", FILES_MENU_SHELL)}
        role="dialog"
        aria-modal="true"
        aria-label={intl.t("ui.fileConflict")}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <File className="size-4 shrink-0 text-status-amber" />
          <span>{intl.t("ui.itemAlreadyExists")}</span>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{conflictName}</span> {intl.t("ui.alreadyExistsInTheDestinationWhatWouldYouLikeToDo")}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onReplace}
            className="rounded-lg bg-status-red/15 px-3 py-2 text-left text-xs font-medium text-status-red transition-colors hover:bg-status-red/20"
          >
            {intl.t("ui.replaceOverwriteTheExistingItem")}
          </button>
          <button
            onClick={onKeepBoth}
            className="rounded-lg bg-primary/15 px-3 py-2 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {intl.t("ui.keepBothRenameTheNewItem")}
          </button>
          <div className="flex gap-2">
            <button onClick={onSkip} className={cn("flex-1", cancelBtn)}>{intl.t("ui.skip")}</button>
            <button onClick={onSkipAll} className={cn("flex-1", cancelBtn)}>{intl.t("ui.skipAll")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
