import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-10 py-16 text-center">
      {icon && (
        <div className="mb-5 text-[var(--primary)]">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-bold">
        {title}
      </h3>

      {description && (
        <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}