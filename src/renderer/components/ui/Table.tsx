import type { ReactNode } from "react";
type Props = { headers: ReactNode[]; children: ReactNode; minWidth?: string; stickyHeader?: boolean };
export default function Table({ headers, children, minWidth = "720px", stickyHeader = true }: Props) {
  return <div className="stocklite-table-shell overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
    <div className="max-w-full overflow-auto">
      <table className="w-full border-separate border-spacing-0 text-right" style={{ minWidth }}>
        <thead className={stickyHeader ? "sticky top-0 z-10" : ""}><tr>{headers.map((header, index) => <th key={index} className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3.5 text-right text-xs font-extrabold tracking-[0.01em] text-[var(--text-secondary)] first:pr-5 last:pl-5">{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  </div>;
}
