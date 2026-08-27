import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onChange: (
    page: number,
  ) => void;
};

export default function Pagination({
  page,
  totalPages,
  onChange,
}: Props) {
  const safePage = Math.min(
    Math.max(page, 1),
    Math.max(totalPages, 1),
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        disabled={safePage <= 1}
        onClick={() =>
          onChange(
            safePage - 1,
          )
        }
        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ChevronRight size={15} />
        السابق
      </button>

      <div className="flex min-w-[92px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold tabular-nums text-[var(--text-primary)]">
        صفحة {safePage} من{" "}
        {totalPages}
      </div>

      <button
        type="button"
        disabled={
          safePage >= totalPages
        }
        onClick={() =>
          onChange(
            safePage + 1,
          )
        }
        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        التالي
        <ChevronLeft size={15} />
      </button>
    </div>
  );
}
