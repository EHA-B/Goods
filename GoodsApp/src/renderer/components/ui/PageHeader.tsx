import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  actions,
}: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-5">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {title}
        </h1>

        {description && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}