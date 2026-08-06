import { ChevronLeft, ChevronRight } from "lucide-react";
import IconButton from "./IconButton";
type Props = { page: number; totalPages: number; onChange: (page: number) => void };
export default function Pagination({ page, totalPages, onChange }: Props) {
  const safeTotal = Math.max(1, totalPages);
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--divider)] pt-4">
    <IconButton aria-label="الصفحة السابقة" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronRight size={17} /></IconButton>
    <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)]"><span className="text-[var(--primary)]">{page}</span> من {safeTotal}</span>
    <IconButton aria-label="الصفحة التالية" disabled={page >= safeTotal} onClick={() => onChange(page + 1)}><ChevronLeft size={17} /></IconButton>
  </div>;
}
