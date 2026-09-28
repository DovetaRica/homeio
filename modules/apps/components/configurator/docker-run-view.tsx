
import { useI18n } from "@/i18n/use-i18n";

import type { DockerRunState } from "@/modules/apps/components/configurator/configurator-mapper";

type DockerRunViewProps = {
  state: DockerRunState;
  onChange: (state: DockerRunState) => void;
};

export function DockerRunView({ state, onChange }: DockerRunViewProps) {
  const intl = useI18n();
  const update = (patch: Partial<DockerRunState>) => {
    onChange({ ...state, ...patch });
  };

  return (
    <section className="flex-1 overflow-y-auto px-4 py-3">
      <p className="mb-3 text-2xs text-muted-foreground">
        {intl.t("ui.dockerRunIsAvailableForCustomInstallsOnlyPasteAFull")} <code>docker run ...</code>{intl.text(" ")}
        {intl.t("ui.commandHere")} <code>docker pull ...</code> {intl.t("ui.isNotSupportedInThisTabWebUiMetadataIsDerivedFrom")}
      </p>

      <div className="space-y-3">
        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          {intl.t("ui.appName")}
          <input
            aria-label={intl.t("ui.appName")}
            required
            value={state.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="My App"
            className="h-9 rounded-lg border border-glass-border bg-secondary/35 px-2.5 text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          {intl.t("ui.iconUrl")}
          <input
            aria-label={intl.t("ui.iconUrl")}
            value={state.iconUrl}
            onChange={(event) => update({ iconUrl: event.target.value })}
            placeholder="https://..."
            className="h-9 rounded-lg border border-glass-border bg-secondary/35 px-2.5 text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          {intl.t("ui.repositoryUrlOptional")}
          <input
            aria-label={intl.t("ui.repositoryUrl")}
            value={state.repositoryUrl}
            onChange={(event) => update({ repositoryUrl: event.target.value })}
            placeholder="https://github.com/owner/repo"
            className="h-9 rounded-lg border border-glass-border bg-secondary/35 px-2.5 text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          {intl.t("ui.dockerRunCommand")}
          <textarea
            aria-label="Docker Run"
            required
            rows={9}
            value={state.source}
            onChange={(event) => update({ source: event.target.value })}
            placeholder="docker run --name myapp -p 8080:80 nginx:latest"
            className="resize-y rounded-lg border border-glass-border bg-secondary/20 px-2.5 py-1.5 font-mono text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>
      </div>
    </section>
  );
}
