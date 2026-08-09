import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  title: string;
  value: string | number;
  suffix?: string;
  description?: string;
  icon: LucideIcon;
  to: string;
};

export default function StatCard({
  title,
  value,
  suffix,
  description,
  icon: Icon,
  to,
}: Props) {
  return (
    <Link
      to={to}
      className="group block rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            size={20}
            className="shrink-0 text-[var(--primary)]"
          />

          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </p>
        </div>

        <ArrowLeft
          size={16}
          className="text-[var(--text-muted)] opacity-0 transition-all group-hover:-translate-x-1 group-hover:opacity-100"
        />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-2xl font-bold leading-none">
          {value}
        </span>

        {suffix && (
          <span className="text-xs leading-none text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 line-clamp-1 text-xs text-[var(--text-muted)]">
          {description}
        </p>
      )}
    </Link>
  );
}