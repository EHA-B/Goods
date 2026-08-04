import { ReactNode } from "react";
import Badge from "./Badge";

type Props = {
  variant: "success" | "warning" | "danger" | "primary" | "gray";
  children: ReactNode;
};

export default function StatusBadge({
  variant,
  children,
}: Props) {
  return (
    <Badge variant={variant}>
      {children}
    </Badge>
  );
}