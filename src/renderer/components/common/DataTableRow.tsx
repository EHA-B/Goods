import { ReactNode } from "react";
import { cn } from "../../utils/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function DataTableRow({
  children,
  className,
}: Props) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--border)]",
        "transition-colors",
        "hover:bg-[var(--surface-subtle)]",
        "last:border-b-0",
        className
      )}
    >
      {children}
    </tr>
  );
}