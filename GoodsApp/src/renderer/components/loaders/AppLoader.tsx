import StockLiteLogo from "../brand/StockLiteLogo";

export default function AppLoader({ label = "جاري التحميل...", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={compact ? "inline-flex items-center gap-2" : "flex min-h-[240px] flex-col items-center justify-center gap-5"}>
      {!compact && <StockLiteLogo size="md" />}
      <span className="stocklite-spinner" aria-hidden="true" />
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}
