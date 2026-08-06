import type { ReactNode } from "react";
import { cn } from "../../utils/utils";
type DataTableProps = { children: ReactNode; className?: string; minWidth?: string };
export default function DataTable({ children, className, minWidth = "760px" }: DataTableProps) {
  return <div className={cn("stocklite-table-shell max-w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]", className)}>
    <div className="max-w-full overflow-auto"><table className="w-full border-separate border-spacing-0 text-right" style={{ minWidth }}>{children}</table></div>
  </div>;
}
