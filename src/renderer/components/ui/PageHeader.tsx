import type { ReactNode } from "react";

import ContextHelpButton from "../help/ContextHelpButton";

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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
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

      <div className="flex shrink-0 items-center gap-2">
        <ContextHelpButton />
        {actions}
      </div>
    </div>
  );
}