/**
 * invoiceTabs.ts — Persistent registry of open "new invoice" tabs.
 *
 * Each open tab (sale or purchase) has its own id and its own isolated
 * localStorage draft slot, so several invoices can be prepared in parallel
 * (e.g. while a previous customer is still being processed at the cashier).
 *
 * Nothing here touches the database: an invoice is only written to SQLite
 * when the user saves it from its tab.
 */
import { PATHS } from "../routes/path";
import {
  clearInvoiceDraft,
  invoiceDraftKey,
  loadInvoiceDraft,
  saveInvoiceDraft,
} from "./invoiceDrafts";

export type InvoiceTabKind = "sale" | "purchase";

export type InvoiceTabMeta = {
  partyName?: string;
  itemCount?: number;
  total?: number;
  currency?: string;
  invoiceType?: "standard" | "consignment";
};

export type InvoiceTab = InvoiceTabMeta & {
  id: string;
  kind: InvoiceTabKind;
  /** Human friendly running number shown in the tab bar. */
  number: number;
  createdAt: number;
};

export type InvoiceTabsRegistry = {
  tabs: InvoiceTab[];
  seq: number;
};

const STORAGE_KEY = "stocklite.invoice-tabs.v1";

export const MAX_INVOICE_TABS = 20;

const emptyRegistry = (): InvoiceTabsRegistry => ({ tabs: [], seq: 0 });

const money = (value: number) => Number(value || 0).toLocaleString("en-US");

/**
 * Dynamic tab title reflecting the party inside the invoice:
 * - Purchase: `شراء (اسم المورد)` once a supplier is chosen, or `شراء #N` before.
 * - Sale: `بيع (اسم العميل)` when a customer is chosen, or `بيع (نقدي)` for cash sales.
 */
export function formatInvoiceTabTitle(tab: InvoiceTab): string {
  const party = tab.partyName?.trim();
  if (tab.kind === "purchase") {
    const prefix = tab.invoiceType === "consignment" ? "شراء أمانة" : "شراء";
    return party ? `${prefix} (${party})` : `${prefix} #${tab.number}`;
  }
  return party ? `بيع (${party})` : "بيع (نقدي)";
}

export function formatInvoiceTabSubtitle(tab: InvoiceTab): string {
  const party = tab.partyName?.trim();
  const count = tab.itemCount ?? 0;
  const countLabel = `${count} ${count === 1 ? "صنف" : "أصناف"}`;
  const parts: string[] = [];

  if (tab.kind === "purchase" && !party) {
    parts.push("بدون مورد");
  } else {
    parts.push(`#${tab.number}`);
  }

  parts.push(countLabel);

  if ((tab.total ?? 0) > 0) {
    parts.push(`${money(tab.total ?? 0)} ${tab.currency ?? "SYP"}`);
  }

  return parts.join(" · ");
}

export function readInvoiceTabsRegistry(): InvoiceTabsRegistry {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyRegistry();
    const parsed = JSON.parse(raw) as InvoiceTabsRegistry;
    if (!parsed || !Array.isArray(parsed.tabs)) return emptyRegistry();
    const tabs = parsed.tabs.filter(
      (tab) =>
        tab &&
        typeof tab.id === "string" &&
        (tab.kind === "sale" || tab.kind === "purchase"),
    );
    const maxNumber = tabs.reduce((max, tab) => Math.max(max, Number(tab.number) || 0), 0);
    return { tabs, seq: Math.max(Number(parsed.seq) || 0, maxNumber) };
  } catch {
    return emptyRegistry();
  }
}

export function writeInvoiceTabsRegistry(registry: InvoiceTabsRegistry) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registry));
}

export function isInvoiceTabOpen(tabId: string) {
  return readInvoiceTabsRegistry().tabs.some((tab) => tab.id === tabId);
}

export function invoiceTabDraftKey(kind: InvoiceTabKind, tabId: string) {
  return invoiceDraftKey(kind, "new", undefined, tabId);
}

export function createInvoiceTabId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function invoiceTabPath(tab: Pick<InvoiceTab, "id" | "kind">) {
  const base = tab.kind === "sale" ? PATHS.SALE_NEW : PATHS.PURCHASE_NEW;
  return `${base}?tab=${encodeURIComponent(tab.id)}`;
}

export function invoiceListPath(kind: InvoiceTabKind) {
  return kind === "sale" ? PATHS.SALES : PATHS.PURCHASES;
}

export function removeInvoiceTabDraft(tab: Pick<InvoiceTab, "id" | "kind">) {
  clearInvoiceDraft(invoiceTabDraftKey(tab.kind, tab.id));
}

/**
 * Quantities of each product that are already used by OTHER open sale
 * tabs (not saved yet). Used to show a soft warning so two parallel invoices
 * don't try to sell the same remaining unified stock.
 */
export function getReservedProductQuantities(excludeTabId?: string) {
  const reserved = new Map<number, number>();
  const { tabs } = readInvoiceTabsRegistry();

  for (const tab of tabs) {
    if (tab.kind !== "sale" || tab.id === excludeTabId) continue;
    const draft = loadInvoiceDraft<{ items?: Array<{ product_id?: number; quantity?: number }> }>(
      invoiceTabDraftKey("sale", tab.id),
    );
    for (const item of draft?.items ?? []) {
      const productId = Number(item?.product_id ?? 0);
      const quantity = Number(item?.quantity ?? 0);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0) continue;
      reserved.set(productId, (reserved.get(productId) ?? 0) + quantity);
    }
  }

  return reserved;
}

/**
 * One-time migration: the app used to keep a single unfinished "new sale" and
 * "new purchase" draft. If such a draft exists, turn it into an open tab so
 * nothing is lost after the upgrade.
 */
export function migrateLegacyInvoiceDrafts(registry: InvoiceTabsRegistry): InvoiceTabsRegistry {
  let next = registry;

  (["sale", "purchase"] as InvoiceTabKind[]).forEach((kind) => {
    const legacyKey = invoiceDraftKey(kind, "new");
    const legacyDraft = loadInvoiceDraft<unknown>(legacyKey);
    if (legacyDraft === null) return;

    const seq = next.seq + 1;
    const tab: InvoiceTab = {
      id: createInvoiceTabId(),
      kind,
      number: seq,
      createdAt: Date.now(),
    };
    saveInvoiceDraft(invoiceTabDraftKey(kind, tab.id), legacyDraft);
    clearInvoiceDraft(legacyKey);
    next = { tabs: [...next.tabs, tab], seq };
  });

  if (next !== registry) writeInvoiceTabsRegistry(next);
  return next;
}
