import type { ReactNode } from "react";
export default function DataTableHeaderCell({ children }: { children?: ReactNode }) { return <th className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3.5 text-right text-xs font-extrabold text-[var(--text-secondary)]">{children}</th>; }
