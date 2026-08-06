import type { ButtonHTMLAttributes } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { size?: "sm" | "md" | "lg"; variant?: "default" | "ghost" | "danger" };
const sizes = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-11 w-11" };
const variants = {
  default: "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-[var(--shadow-xs)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface-hover)] hover:text-[var(--primary)]",
  ghost: "border-transparent bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
  danger: "border-transparent bg-[var(--danger-subtle)] text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white",
};
export default function IconButton({ children, className = "", size = "md", variant = "default", type = "button", ...props }: Props) {
  return <button type={type} className={["inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] border outline-none transition duration-150 focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50", sizes[size], variants[variant], className].join(" ")} {...props}>{children}</button>;
}
