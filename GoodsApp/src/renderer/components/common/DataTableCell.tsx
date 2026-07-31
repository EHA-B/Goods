import { ReactNode } from "react";
import { cn } from "../../utils/utils";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function DataTableCell({
  children,
  className,
}: Props) {
  return (
    <td
      className={cn(
        "whitespace-nowrap",
        "px-5",
        "py-4",
        "text-sm",
        "text-[var(--text-secondary)]",
        className
      )}
    >
      {children}
    </td>
  );
}