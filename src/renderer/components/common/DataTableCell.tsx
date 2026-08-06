import type { ReactNode } from "react";
import { cn } from "../../utils/utils";
export default function DataTableCell({ children, className }: { children: ReactNode; className?: string }) { return <td className={cn("whitespace-nowrap border-b border-[var(--divider)] px-5 py-3.5 text-sm text-[var(--text-secondary)] group-last:border-b-0", className)}>{children}</td>; }
