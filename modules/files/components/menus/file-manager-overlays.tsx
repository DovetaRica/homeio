"use client";
import { zh } from "@/lib/i18n/zh";


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
  return (
    <div
      className={cn("absolute z-[200] min-w-44 py-1.5", FILES_MENU_SHELL)}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem icon={<FolderOpen className="size-3.5" />} label="打开" onClick={() => { onOpen(); onClose(); }} />
      <MenuItem icon={<Info className="size-3.5" />} label="查看信息" onClick={() => { onGetInfo(); onClose(); }} />
      <MenuItem icon={<Link2 className="size-3.5" />} label="复制路径" onClick={() => { onCopyPath(); onClose(); }} />
      {!isTrashView && (
        <MenuItem icon={<FileText className="size-3.5" />} label="重命名" onClick={() => { onRename(); onClose(); }} />
      )}

      <Divider />

      <MenuItem icon={<Copy className="size-3.5" />} label="复制" onClick={() => { onCopy(); onClose(); }} />
      <MenuItem icon={<Scissors className="size-3.5" />} label="剪切" onClick={() => { onCut(); onClose(); }} />
      <MenuItem icon={<ClipboardPaste className="size-3.5" />} label="粘贴" disabled={pasteDisabled} onClick={() => { onPaste(); onClose(); }} />

      <Divider />

      <MenuItem icon={<Star className="size-3.5 text-amber-400" />} label="切换星标" onClick={() => { onToggleStar(); onClose(); }} />
      <MenuItem
        icon={<Download className="size-3.5" />}
        label={zh(entry.type === "folder" ? "Download as Zip" : "Download")}
        onClick={() => { onDownload(); onClose(); }}
      />
      {entry.type === "file" && entry.ext === "zip" && !isTrashView && (
        <MenuItem
          icon={<FileArchive className="size-3.5" />}
          label="解压到此处"
          onClick={() => { onUnzip(); onClose(); }}
        />
      )}

      {entry.type === "folder" && !isTrashView && (
        <>
          <MenuItem
            icon={<Users className="size-3.5 text-sky-400" />}
            label={zh(contextShareActive ? "Unshare Folder" : "Share Folder")}
            onClick={() => { onToggleShare(); onClose(); }}
          />
          <Divider />
        </>
      )}

      {isTrashView ? (
        <>
          <MenuItem icon={<ArrowUp className="size-3.5" />} label="还原" onClick={() => { onRestore(); onClose(); }} />
          <MenuItem icon={<Trash2 className="size-3.5 text-status-red" />} label="永久删除" danger onClick={() => { onDeletePermanently(); onClose(); }} />
        </>
      ) : (
        <MenuItem icon={<Trash2 className="size-3.5 text-status-red" />} label="移入回收站" danger onClick={() => { onMoveToTrash(); onClose(); }} />
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
  return (
    <div
      className={cn("absolute z-[200] min-w-44 py-1.5", FILES_MENU_SHELL)}
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem icon={<ClipboardPaste className="size-3.5" />} label="粘贴" disabled={pasteDisabled} onClick={() => { onPaste(); onClose(); }} />
      <Divider />
      <MenuItem icon={<FolderOpen className="size-3.5" />} label="新建文件夹" onClick={() => { onNewFolder(); onClose(); }} />
      <MenuItem icon={<FileText className="size-3.5" />} label="新建文件" onClick={() => { onNewFile(); onClose(); }} />
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
      {zh(label)}
    </button>
  );
}
