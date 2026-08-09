import { ReactNode } from "react";
import { cn } from "../../../utils/utils";

type EntityToolbarProps = {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function EntityToolbar({
  search,
  filters,
  actions,
  className,
}: EntityToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[var(--border)] p-4",
        "lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        {search}

        {filters && (
          <div className="flex flex-wrap items-center gap-2">
            {filters}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}