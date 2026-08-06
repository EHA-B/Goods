import { ReactNode } from "react";
import { cn } from "../../utils/utils";

type DataTableProps = {
  children: ReactNode;
  className?: string;
};

export default function DataTable({
  children,
  className,
}: DataTableProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto",
        className
      )}
    >
      <table
        className="w-full border-collapse text-right"
      >
        {children}
      </table>
    </div>
  );
}