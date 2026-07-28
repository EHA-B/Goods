import type { HTMLAttributes } from "react";

export default function Skeleton({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        "animate-pulse rounded bg-[var(--surface-hover)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}