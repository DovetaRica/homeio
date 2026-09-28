
import { useI18n } from "@/i18n/use-i18n";

import type { ReactNode } from "react";
import { LanguageSelect } from "@/i18n/language-select";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  const intl = useI18n();
  return (
    <div className="system-floating-surface w-full max-w-md border-glass-border bg-card/90 p-6 shadow-[var(--system-shadow-floating)]">
      <h1 className="text-2xl font-semibold text-foreground">{intl.text(title)}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{intl.text(description)}</p>
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-5 text-sm text-muted-foreground">{footer}</div> : null}
      <div className="mt-5"><LanguageSelect /></div>
    </div>
  );
}
