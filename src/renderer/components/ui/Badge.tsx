import type { HTMLAttributes } from "react";
type Variant = "primary" | "success" | "warning" | "danger" | "gray" | "info";
type Props = HTMLAttributes<HTMLSpanElement> & { variant?: Variant; dot?: boolean };
const variants: Record<Variant, string> = {
  primary: "border-[var(--primary)]/15 bg-[var(--primary-subtle)] text-[var(--primary)]",
  success: "border-[var(--success)]/15 bg-[var(--success-subtle)] text-[var(--success)]",
  warning: "border-[var(--warning)]/15 bg-[var(--warning-subtle)] text-[var(--warning)]",
  danger: "border-[var(--danger)]/15 bg-[var(--danger-subtle)] text-[var(--danger)]",
  info: "border-[var(--info)]/15 bg-[var(--info-subtle)] text-[var(--info)]",
  gray: "border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)]",
};
export default function Badge({ variant = "gray", dot = false, className = "", children, ...props }: Props) {
  return <span className={["inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold", variants[variant], className].join(" ")} {...props}>{dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}</span>;
}
