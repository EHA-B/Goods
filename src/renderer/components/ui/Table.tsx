import type { ReactNode } from "react";

type Props = {
  headers: ReactNode[];
  children: ReactNode;
};

export default function Table({
  headers,
  children,
}: Props) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[var(--surface-hover)]">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border-b border-[var(--border)] px-4 py-3 text-right text-sm font-bold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}