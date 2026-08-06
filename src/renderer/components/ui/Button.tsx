import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import LoadingSpinner from "./LoadingSpinner";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success" | "outline";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-[var(--primary)] text-[var(--text-inverse)] shadow-[var(--shadow-button)] hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-button-hover)] focus-visible:ring-[var(--focus-ring)]",
  secondary: "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-xs)] hover:border-[var(--primary)]/35 hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--focus-ring)]",
  outline: "border-[var(--primary)]/35 bg-transparent text-[var(--primary)] hover:bg-[var(--primary-subtle)] focus-visible:ring-[var(--focus-ring)]",
  success: "border-transparent bg-[var(--success)] text-white shadow-[var(--shadow-xs)] hover:brightness-95 focus-visible:ring-[var(--success-subtle)]",
  danger: "border-transparent bg-[var(--danger)] text-white shadow-[var(--shadow-xs)] hover:brightness-95 focus-visible:ring-[var(--danger-subtle)]",
  ghost: "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--focus-ring)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2.5 px-5 text-sm",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = "primary", size = "md", type = "button", isLoading = false,
  loadingText, startIcon, endIcon, fullWidth = false, asChild = false,
  disabled, children, className = "", ...props
}, ref) => {
  const Component = asChild ? Slot : "button";
  const isDisabled = disabled || isLoading;

  return (
    <Component
      ref={ref}
      {...(!asChild && { type, disabled: isDisabled })}
      aria-busy={isLoading}
      className={[
        "inline-flex select-none items-center justify-center whitespace-nowrap",
        "rounded-[var(--radius-control)] border font-bold outline-none",
        "transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-150 ease-out",
        "focus-visible:ring-3 active:translate-y-px",
        "disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-55",
        variantClasses[variant], sizeClasses[size], fullWidth && "w-full", className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {isLoading ? <><LoadingSpinner size="sm" /><span>{loadingText ?? children}</span></> : <>
        {startIcon && <span aria-hidden className="flex shrink-0 items-center">{startIcon}</span>}
        {children && <span>{children}</span>}
        {endIcon && <span aria-hidden className="flex shrink-0 items-center">{endIcon}</span>}
      </>}
    </Component>
  );
});

Button.displayName = "Button";
export default Button;
export type { ButtonProps, ButtonSize, ButtonVariant };
