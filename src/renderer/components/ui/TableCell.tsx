import type { TdHTMLAttributes } from "react";
export default function TableCell({ children, className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={["border-b border-[var(--divider)] px-4 py-3.5 text-sm text-[var(--text-secondary)] group-last:border-b-0 first:pr-5 last:pl-5", className].join(" ")} {...props}>{children}</td>;
}
