import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import SaleFormPage from "../pages/sales/SaleFormPage";
import PurchaseFormPage from "../pages/purchases/PurchaseFormPage";
import { invoiceListPath, type InvoiceTabKind } from "../lib/invoiceTabs";
import { useInvoiceTabs } from "./InvoiceTabsContext";

/**
 * Route element for `/sales/new` and `/purchases/new`.
 *
 * - Without `?tab=` → opens a brand-new invoice tab (and redirects to it).
 * - With a known `?tab=` → renders that tab's form, keyed by the tab id so
 *   every tab has fully isolated form state.
 * - With an unknown/closed `?tab=` (e.g. navigating back after saving) →
 *   returns to the invoices list instead of resurrecting a closed tab.
 */
export default function NewInvoiceTabRoute({ kind }: { kind: InvoiceTabKind }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabId = searchParams.get("tab");
  const { tabs, openNewTab } = useInvoiceTabs();
  const exists = Boolean(tabId) && tabs.some((tab) => tab.id === tabId && tab.kind === kind);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (exists) {
      handledRef.current = null;
      return;
    }
    // Guard against React StrictMode running the effect twice.
    const marker = tabId ?? "__new__";
    if (handledRef.current === marker) return;
    handledRef.current = marker;

    if (!tabId) openNewTab(kind, { replace: true });
    else navigate(invoiceListPath(kind), { replace: true });
  }, [exists, tabId, kind, openNewTab, navigate]);

  if (!exists || !tabId) return null;

  return kind === "sale" ? (
    <SaleFormPage key={tabId} tabId={tabId} />
  ) : (
    <PurchaseFormPage key={tabId} tabId={tabId} />
  );
}

