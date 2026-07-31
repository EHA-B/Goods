import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function StatsGrid({
  children,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {children}
    </div>
  );
}