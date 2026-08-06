import type { TdHTMLAttributes } from "react";

export default function TableCell({
  children,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={[
        "px-4 py-3 text-sm",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </td>
  );
}