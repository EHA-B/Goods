import { Boxes, Plus, ShoppingCart, X } from "lucide-react";
import { useInvoiceTabs } from "./InvoiceTabsContext";
import type { InvoiceTab } from "../lib/invoiceTabs";

const money = (value: number) => Number(value || 0).toLocaleString("en-US");

const kbdClass =
  "rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1 py-0.5 font-mono text-[10px] text-[var(--text-muted)]";

function tabTitle(tab: InvoiceTab) {
  return `${tab.kind === "sale" ? "بيع" : "شراء"} #${tab.number}`;
}

function tabSubtitle(tab: InvoiceTab) {
  const party =
    tab.partyName || (tab.kind === "sale" ? "بيع نقدي" : "بدون مورد");
  const count = tab.itemCount ?? 0;
  const parts = [party, `${count} ${count === 1 ? "صنف" : "أصناف"}`];
  if ((tab.total ?? 0) > 0) parts.push(`${money(tab.total ?? 0)} ${tab.currency ?? "SYP"}`);
  return parts.join(" · ");
}

/**
 * Global POS-style bar listing every open (unsaved) new invoice.
 * Visible on every page while at least one invoice tab is open.
 */
export default function InvoiceTabsBar() {
  const { tabs, activeTabId, openNewTab, switchToTab, requestCloseTab } = useInvoiceTabs();

  if (tabs.length === 0) return null;

  return (
    <div
      dir="rtl"
      className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2"
    >
      <div
        role="tablist"
        aria-label="الفواتير المفتوحة"
        className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const Icon = tab.kind === "sale" ? ShoppingCart : Boxes;
          const shortcut = index < 9 ? `Alt+${index + 1}` : "";

          return (
            <div
              key={tab.id}
              role="tab"
              tabIndex={0}
              aria-selected={isActive}
              title={`${tabTitle(tab)} — ${tabSubtitle(tab)}${shortcut ? `\nاختصار: ${shortcut}` : ""}`}
              onClick={() => switchToTab(tab.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  switchToTab(tab.id);
                }
              }}
              onAuxClick={(e) => {
                // Middle-click closes the tab (like a browser).
                if (e.button === 1) {
                  e.preventDefault();
                  requestCloseTab(tab.id);
                }
              }}
              className={[
                "group relative flex h-12 min-w-[170px] max-w-[240px] shrink-0 cursor-pointer items-center gap-2",
                "rounded-md border pr-2.5 pl-1.5 text-right transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  tab.kind === "sale"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700",
                ].join(" ")}
                aria-hidden="true"
              >
                <Icon size={15} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="truncate">{tabTitle(tab)}</span>
                  {shortcut && (
                    <span className="hidden font-mono text-[10px] font-normal text-[var(--text-muted)] group-hover:inline">
                      {shortcut}
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] text-[var(--text-muted)]">
                  {tabSubtitle(tab)}
                </span>
              </span>

              <button
                type="button"
                aria-label={`إغلاق ${tabTitle(tab)}`}
                title="إغلاق (Ctrl+F4)"
                onClick={(e) => {
                  e.stopPropagation();
                  requestCloseTab(tab.id);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 border-r border-[var(--border)] pr-2">
        <button
          type="button"
          onClick={() => openNewTab("sale")}
          title="فاتورة بيع جديدة (Alt+S)"
          className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Plus size={14} />
          بيع
          <kbd className={kbdClass}>Alt+S</kbd>
        </button>
        <button
          type="button"
          onClick={() => openNewTab("purchase")}
          title="فاتورة شراء جديدة (Alt+P)"
          className="flex h-9 items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700"
        >
          <Plus size={14} />
          شراء
          <kbd className={kbdClass}>Alt+P</kbd>
        </button>
      </div>
    </div>
  );
}

