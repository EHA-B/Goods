import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function RowActions({
  children,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      {children}
    </div>
  );
}