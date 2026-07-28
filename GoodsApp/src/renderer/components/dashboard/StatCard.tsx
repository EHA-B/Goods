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
      className="group rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--primary)] hover:bg-[var(--surface-hover)]"
    >
      <div className="flex items-start justify-between">
        <Icon
          size={22}
          className="text-[var(--primary)]"
        />

        <ArrowLeft
          size={16}
          className="opacity-0 transition-all group-hover:-translate-x-1 group-hover:opacity-100"
        />
      </div>

      <div className="mt-6">
        <p className="text-sm text-[var(--text-secondary)]">
          {title}
        </p>

        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-bold">
            {value}
          </span>

          {suffix && (
            <span className="text-xs text-[var(--text-muted)]">
              {suffix}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
    </Link>
  );
}