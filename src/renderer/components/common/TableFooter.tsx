import { formatNumber } from "../../utils/numberFormat";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Props = {
  visibleCount: number;
  totalCount: number;
  entityName?: string;
  page?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (
    page: number,
  ) => void;
};

export default function TableFooter({
  visibleCount,
  totalCount,
  entityName = "عنصر",
  page = 1,
  totalPages = 1,
  pageSize = 25,
  onPageChange,
}: Props) {
  const safePage = Math.min(
    Math.max(page, 1),
    Math.max(totalPages, 1),
  );

  const firstVisible =
    totalCount === 0
      ? 0
      : (safePage - 1) *
          pageSize +
        1;

  const lastVisible =
    totalCount === 0
      ? 0
      : Math.min(
          totalCount,
          firstVisible +
            Math.max(
              visibleCount,
              1,
            ) -
            1,
        );

  const showPagination =
    Boolean(onPageChange) &&
    totalPages > 1;

  return (
    <footer className="flex min-h-14 flex-col gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        عرض{" "}
        <span className="font-bold tabular-nums text-[var(--text-primary)]">
          {formatNumber(firstVisible)}
        </span>
        {" - "}
        <span className="font-bold tabular-nums text-[var(--text-primary)]">
          {formatNumber(lastVisible)}
        </span>
        {" من "}
        <span className="font-bold tabular-nums text-[var(--text-primary)]">
          {formatNumber(totalCount)}
        </span>{" "}
        {entityName}
      </p>

      {showPagination && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={
              safePage <= 1
            }
            onClick={() =>
              onPageChange?.(
                safePage - 1,
              )
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronRight
              size={15}
            />
            السابق
          </button>

          <div className="flex min-w-[92px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold tabular-nums text-[var(--text-primary)]">
            صفحة {formatNumber(safePage)} من{" "}
            {formatNumber(totalPages)}
          </div>

          <button
            type="button"
            disabled={
              safePage >=
              totalPages
            }
            onClick={() =>
              onPageChange?.(
                safePage + 1,
              )
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            التالي
            <ChevronLeft
              size={15}
            />
          </button>
        </div>
      )}
    </footer>
  );
}
