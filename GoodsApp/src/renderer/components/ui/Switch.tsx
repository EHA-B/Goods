import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Switch({
  className = "",
  ...props
}: Props) {
  return (
    <label
      className={[
        "relative inline-flex cursor-pointer items-center",
        className,
      ].join(" ")}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        {...props}
      />

      <div
        className={[
          "h-6 w-11 rounded-full",
          "bg-gray-300",
          "transition",
          "peer-checked:bg-[var(--primary)]",
          "after:absolute after:right-[2px] after:top-[2px]",
          "after:h-5 after:w-5 after:rounded-full",
          "after:bg-white after:transition",
          "peer-checked:after:-translate-x-5",
        ].join(" ")}
      />
    </label>
  );
}