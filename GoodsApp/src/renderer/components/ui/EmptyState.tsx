import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
};

export default function EmptyState({ icon, title, description, action, compact = false }: Props) {
  return (
    <div className={`stocklite-empty-state flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-8 text-center ${compact ? "py-10" : "py-16"}`}>
      <div className="stocklite-empty-icon mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-subtle)] text-[var(--primary)]">
        {icon ?? <PackageOpen size={29} strokeWidth={1.7} />}
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
