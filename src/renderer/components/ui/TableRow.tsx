import type { HTMLAttributes } from "react";
export default function TableRow({ children, className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={["group border-b border-[var(--divider)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]/70", className].join(" ")} {...props}>{children}</tr>;
}
