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
    "bg-blue-100 text-blue-700",

  success:
    "bg-green-100 text-green-700",

  warning:
    "bg-yellow-100 text-yellow-700",

  danger:
    "bg-red-100 text-red-700",

  gray:
    "bg-gray-100 text-gray-700",
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