type Props = {
  visibleCount: number;
  totalCount: number;
  entityName?: string;
};

export default function TableFooter({
  visibleCount,
  totalCount,
  entityName = "عنصر",
}: Props) {
  return (
    <footer className="flex min-h-11 items-center border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5">
      <p className="text-xs font-medium text-[var(--text-secondary)]">
        عرض{" "}
        <span className="font-bold text-[var(--text-primary)]">
          {visibleCount}
        </span>{" "}
        من أصل{" "}
        <span className="font-bold text-[var(--text-primary)]">
          {totalCount}
        </span>{" "}
        {entityName}
      </p>
    </footer>
  );
}