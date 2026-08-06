import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function DataTableHead({
  children,
}: Props) {
  return (
    <thead className="bg-[var(--surface-subtle)]">
      {children}
    </thead>
  );
}