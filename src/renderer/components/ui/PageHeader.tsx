import type { ReactNode } from "react";
import ContextHelpButton from "../help/ContextHelpButton";

type Props = { title: string; description?: string; actions?: ReactNode; eyebrow?: string };
export default function PageHeader({ title, description, actions, eyebrow }: Props) {
  return (
    <div className="stocklite-page-header mb-7 flex flex-col gap-4 border-b border-[var(--divider)] pb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--primary)]">{eyebrow}</p>}
        <h1 className="text-[clamp(1.45rem,2.2vw,1.8rem)] font-extrabold tracking-[-0.035em] text-[var(--text-primary)]">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{description}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ContextHelpButton />
        {actions}
      </div>
    </div>
  );
}
