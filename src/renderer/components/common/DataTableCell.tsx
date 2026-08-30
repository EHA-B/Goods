import { TdHTMLAttributes } from "react";
import { cn } from "../../utils/utils";

type Props = TdHTMLAttributes<HTMLTableCellElement>;

export default function DataTableCell({
  children,
  className,
  ...rest
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
      {...rest}
    >
      {children}
    </td>
  );
}