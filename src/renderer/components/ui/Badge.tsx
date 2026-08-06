import type { HTMLAttributes } from "react";

type Variant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "gray";

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--info-subtle)] text-[var(--info)]",

  success:
    "bg-[var(--success-subtle)] text-[var(--success)]",

  warning:
    "bg-[var(--warning-subtle)] text-[var(--warning)]",

  danger:
    "bg-[var(--danger-subtle)] text-[var(--danger)]",

  gray:
    "bg-[var(--surface-hover)] text-[var(--text-secondary)]",
};

export default function Badge({
  variant = "gray",
  className = "",
  children,
  ...props
}: Props) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}