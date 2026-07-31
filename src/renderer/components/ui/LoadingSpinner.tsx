import type { HTMLAttributes } from "react";

type LoadingSpinnerSize = "sm" | "md" | "lg";

type LoadingSpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: LoadingSpinnerSize;
  label?: string;
};

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: "h-3.5 w-3.5 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-7 w-7 border-[3px]",
};

function LoadingSpinner({
  size = "md",
  label = "جارٍ التحميل",
  className = "",
  ...props
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={[
        "inline-block shrink-0 animate-spin rounded-full",
        "border-current border-l-transparent",
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default LoadingSpinner;