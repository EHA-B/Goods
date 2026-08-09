import type { ButtonHTMLAttributes } from "react";

type Props =
  ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      className={[
        "flex h-9 w-9 items-center justify-center",
        "rounded border",
        "border-[var(--border)]",
        "bg-[var(--surface)]",
        "hover:bg-[var(--surface-hover)]",
        "transition",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}