import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/ui";
import { notifyValidation } from "../lib/notifications";
import { PATHS } from "../routes/path";
import {
  createInvoiceTabId,
  formatInvoiceTabTitle,
  type InvoiceTab,
  type InvoiceTabKind,
  type InvoiceTabMeta,
  type InvoiceTabsRegistry,
  invoiceListPath,
  invoiceTabPath,
  MAX_INVOICE_TABS,
  migrateLegacyInvoiceDrafts,
  readInvoiceTabsRegistry,
  removeInvoiceTabDraft,
  writeInvoiceTabsRegistry,
} from "../lib/invoiceTabs";

type InvoiceTabsContextValue = {
  tabs: InvoiceTab[];
  activeTabId: string | null;
  openNewTab: (kind: InvoiceTabKind, options?: { replace?: boolean }) => void;
  switchToTab: (tabId: string) => void;
  /** Asks for confirmation when the tab has content, then closes it. */
  requestCloseTab: (tabId: string) => void;
  /** Closes the tab immediately without navigation (used after saving). */
  removeTab: (tabId: string) => void;
  updateTabMeta: (tabId: string, meta: InvoiceTabMeta) => void;
  cycleTab: (direction: 1 | -1) => void;
};

const InvoiceTabsContext = createContext<InvoiceTabsContextValue | null>(null);

const OVERLAY_SELECTOR = ".fixed.inset-0, [role='listbox']";

const tabHasContent = (tab: InvoiceTab) =>
  (tab.itemCount ?? 0) > 0 || Boolean(tab.partyName) || (tab.total ?? 0) > 0;

export function InvoiceTabsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [registry, setRegistry] = useState<InvoiceTabsRegistry>(() =>
    migrateLegacyInvoiceDrafts(readInvoiceTabsRegistry()),
  );
  const registryRef = useRef(registry);
  const [pendingCloseId, setPendingCloseId] = useState<string | null>(null);

  /** Persist synchronously so forms can check `isInvoiceTabOpen` reliably. */
  const commit = useCallback((next: InvoiceTabsRegistry) => {
    registryRef.current = next;
    writeInvoiceTabsRegistry(next);
    setRegistry(next);
  }, []);

  const activeTabId = useMemo(() => {
    if (location.pathname !== PATHS.SALE_NEW && location.pathname !== PATHS.PURCHASE_NEW) {
      return null;
    }
    const tabId = new URLSearchParams(location.search).get("tab");
    return tabId && registry.tabs.some((tab) => tab.id === tabId) ? tabId : null;
  }, [location.pathname, location.search, registry.tabs]);

  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const openNewTab = useCallback(
    (kind: InvoiceTabKind, options?: { replace?: boolean }) => {
      const current = registryRef.current;
      if (current.tabs.length >= MAX_INVOICE_TABS) {
        notifyValidation(
          `لا يمكن فتح أكثر من ${MAX_INVOICE_TABS} فاتورة في نفس الوقت. احفظ أو أغلق بعض الفواتير المفتوحة أولًا.`,
        );
        if (options?.replace) navigate(invoiceListPath(kind), { replace: true });
        return;
      }
      const seq = current.seq + 1;
      const tab: InvoiceTab = {
        id: createInvoiceTabId(),
        kind,
        number: seq,
        createdAt: Date.now(),
      };
      commit({ tabs: [...current.tabs, tab], seq });
      navigate(invoiceTabPath(tab), { replace: options?.replace });
    },
    [commit, navigate],
  );

  const switchToTab = useCallback(
    (tabId: string) => {
      const tab = registryRef.current.tabs.find((item) => item.id === tabId);
      if (!tab || tabId === activeTabIdRef.current) return;
      navigate(invoiceTabPath(tab));
    },
    [navigate],
  );

  const removeTab = useCallback(
    (tabId: string) => {
      const current = registryRef.current;
      const tab = current.tabs.find((item) => item.id === tabId);
      if (!tab) return;
      removeInvoiceTabDraft(tab);
      const tabs = current.tabs.filter((item) => item.id !== tabId);
      // Restart numbering when every invoice tab has been closed.
      commit({ tabs, seq: tabs.length === 0 ? 0 : current.seq });
    },
    [commit],
  );

  const closeTabNow = useCallback(
    (tabId: string) => {
      const current = registryRef.current;
      const index = current.tabs.findIndex((item) => item.id === tabId);
      if (index === -1) return;
      const tab = current.tabs[index];
      const wasActive = activeTabIdRef.current === tabId;

      removeTab(tabId);

      if (wasActive) {
        const remaining = registryRef.current.tabs;
        const neighbor = remaining[index] ?? remaining[index - 1];
        navigate(neighbor ? invoiceTabPath(neighbor) : invoiceListPath(tab.kind), {
          replace: true,
        });
      }
    },
    [navigate, removeTab],
  );

  const requestCloseTab = useCallback(
    (tabId: string) => {
      const tab = registryRef.current.tabs.find((item) => item.id === tabId);
      if (!tab) return;
      if (tabHasContent(tab)) {
        setPendingCloseId(tabId);
        return;
      }
      closeTabNow(tabId);
    },
    [closeTabNow],
  );

  const updateTabMeta = useCallback(
    (tabId: string, meta: InvoiceTabMeta) => {
      const current = registryRef.current;
      const tab = current.tabs.find((item) => item.id === tabId);
      if (!tab) return;

      const patch: InvoiceTabMeta = {};
      (Object.keys(meta) as (keyof InvoiceTabMeta)[]).forEach((key) => {
        const value = meta[key];
        if (value !== undefined && tab[key] !== value) {
          (patch as Record<string, unknown>)[key] = value;
        }
      });
      if (Object.keys(patch).length === 0) return;

      commit({
        ...current,
        tabs: current.tabs.map((item) => (item.id === tabId ? { ...item, ...patch } : item)),
      });
    },
    [commit],
  );

  const cycleTab = useCallback(
    (direction: 1 | -1) => {
      const { tabs } = registryRef.current;
      if (tabs.length === 0) return;
      const index = tabs.findIndex((tab) => tab.id === activeTabIdRef.current);
      const nextIndex =
        index === -1
          ? direction === 1 ? 0 : tabs.length - 1
          : (index + direction + tabs.length) % tabs.length;
      navigate(invoiceTabPath(tabs[nextIndex]));
    },
    [navigate],
  );

  /* ─── Global keyboard shortcuts ───
   * Alt+S           → new sale invoice tab
   * Alt+P           → new purchase invoice tab
   * Ctrl+Tab        → next open invoice  (Ctrl+Shift+Tab → previous)
   * Alt+1 … Alt+9   → jump to open invoice number N in the bar
   * Ctrl+F4         → close the current invoice tab
   * `e.code` is used so shortcuts work with both Arabic and English layouts.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector(OVERLAY_SELECTOR)) return;

      if (e.ctrlKey && !e.altKey && e.key === "Tab") {
        e.preventDefault();
        cycleTab(e.shiftKey ? -1 : 1);
        return;
      }

      if (e.ctrlKey && !e.altKey && e.key === "F4") {
        e.preventDefault();
        if (activeTabIdRef.current) requestCloseTab(activeTabIdRef.current);
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.code === "KeyS") {
          e.preventDefault();
          openNewTab("sale");
          return;
        }
        if (e.code === "KeyP") {
          e.preventDefault();
          openNewTab("purchase");
          return;
        }
        const digit = /^Digit([1-9])$/.exec(e.code);
        if (digit) {
          const tab = registryRef.current.tabs[Number(digit[1]) - 1];
          if (tab) {
            e.preventDefault();
            switchToTab(tab.id);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cycleTab, openNewTab, requestCloseTab, switchToTab]);

  const pendingTab = registry.tabs.find((tab) => tab.id === pendingCloseId) ?? null;

  const value = useMemo<InvoiceTabsContextValue>(
    () => ({
      tabs: registry.tabs,
      activeTabId,
      openNewTab,
      switchToTab,
      requestCloseTab,
      removeTab,
      updateTabMeta,
      cycleTab,
    }),
    [registry.tabs, activeTabId, openNewTab, switchToTab, requestCloseTab, removeTab, updateTabMeta, cycleTab],
  );

  return (
    <InvoiceTabsContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={Boolean(pendingTab)}
        title="إغلاق الفاتورة المفتوحة"
        message={
          pendingTab
            ? `هل تريد إغلاق "${formatInvoiceTabTitle(pendingTab)}"؟ سيتم تجاهل بياناتها غير المحفوظة نهائيًا.`
            : ""
        }
        confirmText="إغلاق وتجاهل"
        cancelText="تراجع"
        onCancel={() => setPendingCloseId(null)}
        onConfirm={() => {
          const id = pendingCloseId;
          setPendingCloseId(null);
          if (id) closeTabNow(id);
        }}
      />
    </InvoiceTabsContext.Provider>
  );
}

export function useInvoiceTabs() {
  const context = useContext(InvoiceTabsContext);
  if (!context) {
    throw new Error("useInvoiceTabs must be used inside InvoiceTabsProvider");
  }
  return context;
}
