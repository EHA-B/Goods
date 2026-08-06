import type { ReactNode } from "react";

type TabItem<T extends string> = { value: T; label: ReactNode; icon?: ReactNode; disabled?: boolean };
type Props<T extends string> = { items: TabItem<T>[]; value: T; onChange: (value: T) => void; ariaLabel?: string; className?: string; variant?: "soft" | "underline" };

export default function Tabs<T extends string>({ items, value, onChange, ariaLabel = "التبويبات", className = "", variant = "soft" }: Props<T>) {
  return <div role="tablist" aria-label={ariaLabel} className={[
    "flex max-w-full items-center overflow-x-auto",
    variant === "soft" ? "gap-1 rounded-[var(--radius-control)] bg-[var(--surface-subtle)] p-1" : "gap-1 border-b border-[var(--border)]",
    className,
  ].join(" ")}>
    {items.map((item) => {
      const active = item.value === value;
      return <button key={item.value} type="button" role="tab" aria-selected={active} disabled={item.disabled} onClick={() => onChange(item.value)} className={[
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-xs font-bold outline-none transition focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)] disabled:opacity-45",
        variant === "soft" ? "rounded-[calc(var(--radius-control)-2px)] px-3 py-2" : "border-b-2 px-4 py-3",
        active
          ? variant === "soft" ? "bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-xs)]" : "border-[var(--primary)] text-[var(--primary)]"
          : variant === "soft" ? "text-[var(--text-muted)] hover:bg-[var(--surface)]/65 hover:text-[var(--text-primary)]" : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
      ].join(" ")}>{item.icon}{item.label}</button>;
    })}
  </div>;
}
export type { TabItem };
