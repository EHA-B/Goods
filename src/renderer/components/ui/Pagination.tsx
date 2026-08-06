import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export default function Pagination({
  page,
  totalPages,
  onChange,
}: Props) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="flex h-9 w-9 items-center justify-center rounded border disabled:opacity-50"
      >
        <ChevronRight size={16} />
      </button>

      <span className="text-sm">
        {page} / {totalPages}
      </span>

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="flex h-9 w-9 items-center justify-center rounded border disabled:opacity-50"
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}