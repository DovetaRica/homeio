"use client";



import { useI18n } from "@/i18n/use-i18n";
import type { FileEntry } from "@/modules/files/components/file-manager-presenters";
import { FILES_MENU_SHELL } from "@/modules/files/components/file-manager-surface";
import { cn } from "@/lib/utils";
import {
  ArrowUp,
  ClipboardPaste,
  Copy,
  Download,
  FileArchive,
  FileText,
  FolderOpen,
  Info,
  Link2,
  Scissors,
  Star,
  Trash2,
  Users,
} from "@/components/icons/platform-icons";
import type { ReactNode } from "react";

export function FileManagerContextMenu({
  contextShareActive,
  entry,
  isTrashView,
  onClose,
  onCopy,
  onCopyPath,
  onCut,
  onDeletePermanently,
  onDownload,
  onGetInfo,
  onMoveToTrash,
  onOpen,
  onPaste,
  onRename,
  onRestore,
  onToggleShare,
  onToggleStar,
  onUnzip,
  pasteDisabled,
  x,
  y,
}: {
  contextShareActive: boolean;
  entry: FileEntry;
  isTrashView: boolean;
  pasteDisabled: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onCopyPath: () => void;
  onCut: () => void;
  onDeletePermanently: () => void;
  onDownload: () => void;
  onGetInfo: () => void;
  onMoveToTrash: () => void;
  onOpen: () => void;
  onPaste: () => void;
  onRename: () => void;
  onRestore: () => void;
  onToggleShare: () => void;
  onToggleStar: () => void;
  onUnzip: () => void;
}) {
  const intl = useI18n();
  return (
    <div
      className={cn("absolute z-[200] min-w-44 py-1.5", FILES_MENU_SHELL)}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem icon={<FolderOpen className="size-3.5" />} label={intl.t("ui.open")} onClick={() => { onOpen(); onClose(); }} />
      <MenuItem icon={<Info className="size-3.5" />} label={intl.t("ui.getInfo")} onClick={() => { onGetInfo(); onClose(); }} />
      <MenuItem icon={<Link2 className="size-3.5" />} label={intl.t("ui.copyPath")} onClick={() => { onCopyPath(); onClose(); }} />
      {!isTrashView && (
        <MenuItem icon={<FileText className="size-3.5" />} label={intl.t("ui.rename")} onClick={() => { onRename(); onClose(); }} />
      )}

      <Divider />

      <MenuItem icon={<Copy className="size-3.5" />} label={intl.t("ui.copy")} onClick={() => { onCopy(); onClose(); }} />
      <MenuItem icon={<Scissors className="size-3.5" />} label={intl.t("ui.cut")} onClick={() => { onCut(); onClose(); }} />
      <MenuItem icon={<ClipboardPaste className="size-3.5" />} label={intl.t("ui.paste")} disabled={pasteDisabled} onClick={() => { onPaste(); onClose(); }} />

      <Divider />

      <MenuItem icon={<Star className="size-3.5 text-amber-400" />} label={intl.t("ui.toggleStar")} onClick={() => { onToggleStar(); onClose(); }} />
      <MenuItem
        icon={<Download className="size-3.5" />}
        label={intl.text(entry.type === "folder" ? "Download as Zip" : "Download")}
        onClick={() => { onDownload(); onClose(); }}
      />
      {entry.type === "file" && entry.ext === "zip" && !isTrashView && (
        <MenuItem
          icon={<FileArchive className="size-3.5" />}
          label={intl.t("ui.unzipHere")}
          onClick={() => { onUnzip(); onClose(); }}
        />
      )}

      {entry.type === "folder" && !isTrashView && (
        <>
          <MenuItem
            icon={<Users className="size-3.5 text-sky-400" />}
            label={intl.text(contextShareActive ? "Unshare Folder" : "Share Folder")}
            onClick={() => { onToggleShare(); onClose(); }}
          />
          <Divider />
        </>
      )}

      {isTrashView ? (
        <>
          <MenuItem icon={<ArrowUp className="size-3.5" />} label={intl.t("ui.restore")} onClick={() => { onRestore(); onClose(); }} />
          <MenuItem icon={<Trash2 className="size-3.5 text-status-red" />} label={intl.t("ui.deletePermanently")} danger onClick={() => { onDeletePermanently(); onClose(); }} />
        </>
      ) : (
        <MenuItem icon={<Trash2 className="size-3.5 text-status-red" />} label={intl.t("ui.moveToTrash")} danger onClick={() => { onMoveToTrash(); onClose(); }} />
      )}
    </div>
  );
}

export function FileManagerBackgroundContextMenu({
  pasteDisabled,
  x,
  y,
  onClose,
  onNewFolder,
  onNewFile,
  onPaste,
}: {
  pasteDisabled: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onPaste: () => void;
}) {
  const intl = useI18n();
  return (
    <div
      className={cn("absolute z-[200] min-w-44 py-1.5", FILES_MENU_SHELL)}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem icon={<ClipboardPaste className="size-3.5" />} label={intl.t("ui.paste")} disabled={pasteDisabled} onClick={() => { onPaste(); onClose(); }} />
      <Divider />
      <MenuItem icon={<FolderOpen className="size-3.5" />} label={intl.t("ui.newFolder")} onClick={() => { onNewFolder(); onClose(); }} />
      <MenuItem icon={<FileText className="size-3.5" />} label={intl.t("ui.newFile")} onClick={() => { onNewFile(); onClose(); }} />
    </div>
  );
}

function Divider() {
  return <div className="mx-2 my-1 h-px bg-glass-border/60" />;
}

function MenuItem({
  danger,
  disabled,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  const intl = useI18n();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors",
        disabled
          ? "cursor-not-allowed text-muted-foreground/40"
          : danger
            ? "cursor-pointer text-status-red hover:bg-status-red/10"
            : "cursor-pointer text-foreground hover:bg-background/50",
      )}
    >
      {icon}
      {intl.text(label)}
    </button>
  );
}
