
import { zh } from "@/lib/i18n/zh";
import type { DockerRunState } from "@/modules/apps/components/configurator/configurator-mapper";

type DockerRunViewProps = {
  state: DockerRunState;
  onChange: (state: DockerRunState) => void;
};

export function DockerRunView({ state, onChange }: DockerRunViewProps) {
  const update = (patch: Partial<DockerRunState>) => {
    onChange({ ...state, ...patch });
  };

  return (
    <section className="flex-1 overflow-y-auto px-4 py-3">
      <p className="mb-3 text-2xs text-muted-foreground">
        Docker Run 仅用于自定义安装，请粘贴完整的 <code>docker run ...</code>{zh(" ")}
        命令； <code>docker pull ...</code> 不适用于此页，Web 界面信息由命令中的发布端口推断。
      </p>

      <div className="space-y-3">
        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          应用名称
          <input
            aria-label="应用名称"
            required
            value={state.name}
            onChange={(event) => update({ name: event.target.value })}
            placeholder="My App"
            className="h-9 rounded-lg border border-glass-border bg-secondary/35 px-2.5 text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          图标地址
          <input
            aria-label="图标地址"
            value={state.iconUrl}
            onChange={(event) => update({ iconUrl: event.target.value })}
            placeholder="https://..."
            className="h-9 rounded-lg border border-glass-border bg-secondary/35 px-2.5 text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          仓库地址（可选）
          <input
            aria-label="仓库地址"
            value={state.repositoryUrl}
            onChange={(event) => update({ repositoryUrl: event.target.value })}
            placeholder="https://github.com/owner/repo"
            className="h-9 rounded-lg border border-glass-border bg-secondary/35 px-2.5 text-xs text-foreground outline-none focus:border-primary/50"
          />
        </label>

        <label className="flex flex-col gap-1 text-2xs text-muted-foreground">
          Docker Run 命令
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
