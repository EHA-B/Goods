import type { ReactNode } from "react";
export default function DataTableHead({ children }: { children: ReactNode }) { return <thead className="sticky top-0 z-10 bg-[var(--surface-subtle)]">{children}</thead>; }
