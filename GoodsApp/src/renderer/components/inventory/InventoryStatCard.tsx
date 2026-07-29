import type { ReactNode } from "react";

import { Card } from "../ui";

type Props = {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
};

export default function InventoryStatCard({
  title,
  value,
  description,
  icon,
}: Props) {
  return (
    <Card className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-[var(--text-muted)]">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </p>

          {description && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] text-[var(--primary)]">
          {icon}
        </div>
      </div>
    </Card>
  );
}
