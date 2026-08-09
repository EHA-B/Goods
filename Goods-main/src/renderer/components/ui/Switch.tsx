import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Switch({
  className = "",
  disabled,
  ...props
}: Props) {
  return (
    <label
      className={[
        "relative inline-flex items-center",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer",
        className,
      ].join(" ")}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        disabled={disabled}
        {...props}
      />

      <div
        className={[
          "relative h-6 w-11 rounded-full",
          "border border-[var(--border-strong)]",
          "bg-[var(--surface-hover)]",
          "transition-all duration-200",

          "peer-focus-visible:ring-2",
          "peer-focus-visible:ring-[var(--focus-ring)]",
          "peer-focus-visible:ring-offset-2",
          "peer-focus-visible:ring-offset-[var(--surface)]",

          "peer-checked:border-[var(--success)]",
          "peer-checked:bg-[var(--success)]",

          "after:absolute",
          "after:right-[3px]",
          "after:top-1/2",
          "after:h-[18px]",
          "after:w-[18px]",
          "after:-translate-y-1/2",
          "after:rounded-full",
          "after:bg-white",
          "after:shadow-[0_1px_3px_rgba(0,0,0,0.25)]",
          "after:transition-transform",
          "after:duration-200",

          "peer-checked:after:-translate-x-5",
        ].join(" ")}
      />
    </label>
  );
}