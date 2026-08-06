import type { ReactNode } from "react";
import { cn } from "../../utils/utils";
export default function DataTableRow({ children, className }: { children: ReactNode; className?: string }) { return <tr className={cn("group transition-colors hover:bg-[var(--surface-hover)]/70", className)}>{children}</tr>; }
