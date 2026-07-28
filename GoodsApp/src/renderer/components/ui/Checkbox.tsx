import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Checkbox({
  children,
  className = "",
  ...props
}: Props) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-3",
        className,
      ].join(" ")}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--primary)]"
        {...props}
      />

      {children && (
        <span className="text-sm text-[var(--text-primary)]">
          {children}
        </span>
      )}
    </label>
  );
}