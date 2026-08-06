import type { HTMLAttributes } from "react";

export default function TableRow({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={[
        "border-b border-[var(--border)]",
        "hover:bg-[var(--surface-hover)]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </tr>
  );
}