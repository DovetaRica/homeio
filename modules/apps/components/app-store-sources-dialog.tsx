"use client";
import { zh } from "@/lib/i18n/zh";


import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { StoreCatalogSource } from "@/lib/shared/contracts/apps";
import { Loader2, RefreshCw, Trash2 } from "@/components/icons/platform-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemo, useState, type FormEvent } from "react";

type AppStoreSourcesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: StoreCatalogSource[];
  isLoading: boolean;
  error: string | null;
  addPending: boolean;
  pendingSourceId: string | null;
  onAddSource: (input: { url: string; name?: string }) => Promise<void>;
  onToggleSource: (input: {
    sourceId: string;
    enabled: boolean;
  }) => Promise<void>;
  onRefreshSource: (sourceId: string) => Promise<void>;
  onRemoveSource: (sourceId: string) => Promise<void>;
};

function formatSyncLabel(source: StoreCatalogSource) {
  if (source.status === "syncing") return "Syncing...";
  if (source.lastSyncedAt) {
    return `Synced ${new Date(source.lastSyncedAt).toLocaleString()}`;
  }
  return "Not synced yet";
}

export function AppStoreSourcesDialog({
  open,
  onOpenChange,
  sources,
  isLoading,
  error,
  addPending,
  pendingSourceId,
  onAddSource,
  onToggleSource,
  onRefreshSource,
  onRemoveSource,
}: AppStoreSourcesDialogProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sortedSources = useMemo(
    () =>
      [...sources].sort((left, right) => {
        if (left.kind === "official") return -1;
        if (right.kind === "official") return 1;
        return left.name.localeCompare(right.name);
      }),
    [sources],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    try {
      await onAddSource({
        url: url.trim(),
        name: name.trim() || undefined,
      });
      setUrl("");
      setName("");
    } catch (submitFailure) {
      setSubmitError(
        submitFailure instanceof Error
          ? submitFailure.message
          : "Unable to add store source.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl border-glass-border bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>应用源</DialogTitle>
          <DialogDescription>
            在官方目录之外添加 ZIP 格式的 CasaOS 应用源。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1.3fr,0.9fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-glass-border bg-glass/30 p-3">
              {error ? (
                <div className="rounded-lg border border-status-red/30 bg-status-red/10 px-3 py-2 text-xs text-status-red">
                  {zh(error)}
                </div>
              ) : null}

              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  正在加载应用源…
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSources.map((source) => {
                    const isPending = pendingSourceId === source.id;

                    return (
                      <div
                        key={source.id}
                        className="rounded-xl border border-glass-border bg-background/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground">
                                {source.name}
                              </p>
                              <span className="rounded-[var(--radius)] border border-glass-border px-2 py-0.5 text-2xs uppercase tracking-[0.18em] text-muted-foreground">
                                {source.kind}
                              </span>
                              {!source.enabled ? (
                                <span className="rounded-[var(--radius)] border border-glass-border px-2 py-0.5 text-2xs uppercase tracking-[0.18em] text-status-yellow">
                                  已禁用
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                              {source.url}
                            </p>
                            <p className="mt-1 text-2xs text-muted-foreground">
                              {formatSyncLabel(source)}
                            </p>
                            {source.lastError ? (
                              <p className="mt-2 text-xs text-status-red">
                                {source.lastError}
                              </p>
                            ) : null}
                            {source.suppressedAppIds.length > 0 ? (
                              <p className="mt-2 text-xs text-status-yellow">
                                已忽略的冲突：{zh(" ")}
                                {source.suppressedAppIds.join(", ")}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void onToggleSource({
                                  sourceId: source.id,
                                  enabled: !source.enabled,
                                })
                              }
                              disabled={source.kind === "official" || isPending}
                              className="rounded-md border border-glass-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50"
                            >
                              {zh(source.enabled ? "Disable" : "Enable")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void onRefreshSource(source.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 rounded-md border border-glass-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`size-3 ${isPending ? "animate-spin" : ""}`}
                              />
                              刷新
                            </button>
                            {source.kind === "remote" ? (
                              <button
                                type="button"
                                onClick={() => void onRemoveSource(source.id)}
                                disabled={isPending}
                                className="inline-flex items-center gap-1 rounded-md border border-status-red/25 px-2.5 py-1 text-xs text-status-red transition-colors hover:bg-status-red/10 disabled:opacity-50"
                              >
                                <Trash2 className="size-3" />
                                移除
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-glass-border bg-glass/30 p-4">
            <p className="text-sm font-semibold text-foreground">添加应用源</p>
            <p className="mt-1 text-xs text-muted-foreground">
              粘贴 CasaOS 应用目录的 HTTPS ZIP 地址。Homeio 兼容 CasaOS 应用源，社区目录见{zh(" ")}
              <a
                href="https://awesome.casaos.io/content/3rd-party-app-stores/list.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:brightness-125"
              >
                awesome.casaos.io
              </a>
              .
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="store-source-url"
                  >
                    ZIP 地址
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex size-3.5 cursor-default items-center justify-center rounded-full border border-glass-border text-2xs text-muted-foreground">
                        ?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[18rem] text-xs"
                    >
                      支持兼容 CasaOS 的应用目录 ZIP 文件。社区目录见{zh(" ")}
                      <span className="font-medium text-foreground">
                        awesome.casaos.io/content/3rd-party-app-stores/list.html
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <input
                  id="store-source-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/appstore.zip"
                  className="h-10 w-full rounded-lg border border-glass-border bg-background/40 px-3 text-sm text-foreground outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs text-muted-foreground"
                  htmlFor="store-source-name"
                >
                  名称
                </label>
                <input
                  id="store-source-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="显示名称（可选）"
                  className="h-10 w-full rounded-lg border border-glass-border bg-background/40 px-3 text-sm text-foreground outline-none"
                />
              </div>

              {submitError ? (
                <div className="rounded-lg border border-status-red/30 bg-status-red/10 px-3 py-2 text-xs text-status-red">
                  {submitError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={addPending || !url.trim()}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {zh(addPending ? "Adding Source..." : "Add Source")}
              </button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
