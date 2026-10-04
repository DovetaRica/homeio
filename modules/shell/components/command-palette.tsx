"use client";



import { useI18n } from "@/i18n/use-i18n";
import {useNasDesktop} from "@/lib/ui/desktop-mode";
import {useTranslations} from 'next-intl';
import Image from "next/image";
import type { StoreAppSummary } from "@/lib/shared/contracts/apps";
import type { RecentCommandAction } from "@/lib/desktop/recent-actions";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Clock,
  FolderOpen,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  TerminalSquare,
} from "@/components/icons/platform-icons";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStoreCatalog } from "@/modules/apps/hooks/useStoreCatalog";

export type CommandPaletteSettingsSection = {
  id: string;
  label: string;
};

export type CommandPaletteRecentAction = RecentCommandAction;

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  settingsSections: readonly CommandPaletteSettingsSection[];
  recentActions: readonly CommandPaletteRecentAction[];
  onOpenSettingsSection: (sectionId: string) => void;
  onOpenAppStoreSearch: (input: { search: string; appId?: string }) => void;
  onOpenWindow: (windowId: "files" | "settings" | "app-store" | "terminal" | "monitor") => void;
  onSelectRecentAction: (action: CommandPaletteRecentAction) => void;
};

function StoreSearchIcon({ app }: { app: StoreAppSummary }) {
  if (app.logoUrl) {
    return (
      <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg border border-glass-border/80 bg-card/85 shadow-sm">
        <Image
          src={app.logoUrl}
          alt=""
          width={24}
          height={24}
          className="size-5 object-contain"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className="flex size-9 items-center justify-center rounded-lg border border-glass-border/80 bg-primary/12 text-primary shadow-sm">
      <ShoppingBag className="size-4" />
    </div>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  settingsSections,
  recentActions,
  onOpenSettingsSection,
  onOpenAppStoreSearch,
  onOpenWindow,
  onSelectRecentAction,
}: CommandPaletteProps) {
  const intl = useI18n();
  const nasMode = useNasDesktop();
  const desktopT = useTranslations('nasDesktop');
  const normalizedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(normalizedQuery, 180);

  const matchingSettings = normalizedQuery
    ? settingsSections.filter((section) =>
        `${section.label} ${intl.text(section.label)}`.toLowerCase().includes(normalizedQuery.toLowerCase()),
      )
    : settingsSections.slice(0, 5);

  const storeCatalogQuery = useStoreCatalog({
    search: debouncedQuery || undefined,
  });

  const appResults = (storeCatalogQuery.data?.apps ?? [])
    .slice(0, normalizedQuery ? 7 : 5);
  const filteredRecentActions = recentActions.filter((action) => {
    if (nasMode && (action.kind === 'app-store-search' || (action.kind === 'window' && action.windowId === 'app-store'))) return false;
    if (!normalizedQuery) return true;
    const haystack = `${action.title} ${action.subtitle} ${intl.text(action.title)} ${intl.text(action.subtitle)}`.toLowerCase();
    return haystack.includes(normalizedQuery.toLowerCase());
  });

  function renderRecentActionIcon(action: CommandPaletteRecentAction) {
    if (action.kind === "window") {
      if (action.windowId === "files") return <FolderOpen className="size-4 text-primary" />;
      if (action.windowId === "settings") return <Settings className="size-4 text-primary" />;
      if (action.windowId === "app-store") {
        return <ShoppingBag className="size-4 text-sky-400" />;
      }
      return <TerminalSquare className="size-4 text-emerald-400" />;
    }

    if (action.kind === "settings-section") {
      return <Settings className="size-4 text-primary" />;
    }

    return <Sparkles className="size-4 text-primary" />;
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={intl.t("ui.searchHomeio")}
      description={intl.t("ui.jumpToSettingsAppsAndDesktopTools")}
      className="overflow-hidden border border-white/[0.09] bg-black/60 p-0 shadow-[var(--system-shadow-floating)] [backdrop-filter:blur(40px)_saturate(160%)] [border-radius:var(--system-radius-floating)] max-w-[min(92vw,44rem)]"
      showCloseButton={false}
    >
      {/* Hero header — matches lock screen / login design language */}
      <div className="flex flex-col items-center border-b border-white/8 bg-black/22 px-6 py-5">
        <div className="system-hero-surface flex size-[3.25rem] items-center justify-center bg-black/22 shadow-[var(--system-shadow-dock)]">
          <Search className="size-6 text-foreground/72" />
        </div>
        <div className="system-pill-surface mt-3 px-3 py-1 text-[10px] tracking-[0.22em] text-foreground/55 uppercase">
          {intl.t("ui.commandPalette")}
        </div>
        <div className="mt-3 w-full [&_[data-slot=command-input-wrapper]]:h-10 [&_[data-slot=command-input-wrapper]]:border-0 [&_[data-slot=command-input-wrapper]]:px-0">
          <div className="system-soft-surface bg-black/22 px-3 shadow-[var(--system-shadow-dock)]">
            <CommandInput
              autoFocus
              value={query}
              onValueChange={onQueryChange}
              placeholder={intl.t("ui.searchSettingsAppsAndTools")}
              className="text-[15px] text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground/40 tracking-widest uppercase">
          <span className="system-keycap-surface px-1.5 py-0.5 font-mono">⌘K</span>
          <span className="opacity-50">·</span>
          <span className="system-keycap-surface px-1.5 py-0.5 font-mono">Esc</span>
        </div>
      </div>

      <CommandList className="max-h-[26rem]">
        <CommandEmpty>
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-foreground">{intl.t("ui.noMatchesFound")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {intl.t("ui.tryASettingsSectionAppNameOrDesktopTool")}
            </p>
          </div>
        </CommandEmpty>

        {filteredRecentActions.length > 0 ? (
          <>
            <CommandGroup heading="Recent">
              {filteredRecentActions.map((action) => (
                <CommandItem
                  key={action.key}
                  value={`${action.title} ${action.subtitle}`}
                  onSelect={() => onSelectRecentAction(action)}
                >
                  {renderRecentActionIcon(action)}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {intl.text(action.title)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {intl.text(action.subtitle)}
                    </div>
                  </div>
                  <CommandShortcut className="flex items-center gap-1 tracking-normal">
                    <Clock className="size-3.5" />
                    <span>{intl.t("ui.recent")}</span>
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />
          </>
        ) : null}

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => onOpenWindow("settings")}>
            <Settings className="size-4 text-primary" />
            <span>{intl.t("ui.openSettings")}</span>
            <CommandShortcut>{intl.t("ui.system")}</CommandShortcut>
          </CommandItem>
          {nasMode ? <><CommandItem onSelect={() => onOpenWindow("monitor")}><Search className="size-4 text-primary"/><span>{desktopT('openMonitor')}</span></CommandItem><CommandItem onSelect={() => onOpenSettingsSection('apps')}><ShoppingBag className="size-4 text-primary"/><span>{desktopT('manageApps')}</span></CommandItem></> : <CommandItem onSelect={() => onOpenWindow("app-store")}>
            <ShoppingBag className="size-4 text-sky-400" />
            <span>{intl.t("ui.openAppStore")}</span>
            <CommandShortcut>{intl.t("ui.apps")}</CommandShortcut>
          </CommandItem>}
          <CommandItem onSelect={() => onOpenWindow("files")}>
            <FolderOpen className="size-4 text-primary" />
            <span>{intl.t("ui.openFiles")}</span>
            <CommandShortcut>/DATA</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => onOpenWindow("terminal")}>
            <TerminalSquare className="size-4 text-emerald-400" />
            <span>{intl.t("ui.openTerminal")}</span>
            <CommandShortcut>{intl.t("ui.terminal")}</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          {matchingSettings.map((section) => (
            <CommandItem
              key={section.id}
              onSelect={() => onOpenSettingsSection(section.id)}
            >
              <Settings className="size-4 text-primary" />
              <span>{intl.text(section.label)}</span>
              <CommandShortcut>{intl.t("ui.settings")}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {!nasMode && <CommandGroup heading="App Store">
          {storeCatalogQuery.isLoading && normalizedQuery ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              {intl.t("ui.searchingApps")}
            </div>
          ) : null}

          {!storeCatalogQuery.isLoading && appResults.length === 0 && normalizedQuery ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              {intl.t("ui.noAppStoreAppsMatch")}{normalizedQuery}”.
            </div>
          ) : null}

          {appResults.map((app) => (
            <CommandItem
              key={app.id}
              value={`${app.name} ${app.description} ${app.categories.join(" ")}`}
              onSelect={() =>
                onOpenAppStoreSearch({
                  search: app.name,
                  appId: app.id,
                })
              }
              className="gap-3 rounded-lg py-2.5"
            >
              <StoreSearchIcon app={app} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {app.name}
                  </span>
                  {app.updateAvailable ? (
                    <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {intl.t("ui.update")}
                    </span>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {intl.text(app.description)}
                </p>
              </div>
              <CommandShortcut className="flex items-center gap-1 tracking-normal">
                <Sparkles className="size-3.5" />
                <span>{intl.t("ui.appStore")}</span>
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>}
      </CommandList>
    </CommandDialog>
  );
}
