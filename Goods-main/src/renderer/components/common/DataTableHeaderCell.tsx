import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export default function DataTableHeaderCell({
  children,
}: Props) {
  return (
    <th
      className="
        whitespace-nowrap
        px-5
        py-3
        text-right
        text-xs
        font-bold
        text-[var(--text-secondary)]
      "
    >
      {children}
    </th>
  );
}