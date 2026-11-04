import { notifyValidation } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import useArrowFieldNavigation from "../../lib/useArrowFieldNavigation";
import { getInvoiceEditErrorMessage } from "../../lib/invoiceEditErrors";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Calculator, Keyboard, Plus, Save, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, Dialog, FormField, FormSection, Input, PageHeader, SearchableSelect, Select, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";
import InvoiceEditPasswordDialog from "../../components/invoices/InvoiceEditPasswordDialog";
import {
  clearInvoiceDraft,
  consumeInvoiceDraft,
  invoiceDraftFingerprint,
  invoiceDraftKey,
  loadInvoiceDraft,
  saveInvoiceDraft,
} from "../../lib/invoiceDrafts";
import { formatInvoiceTabTitle, getReservedProductQuantities, isInvoiceTabOpen } from "../../lib/invoiceTabs";
import { useInvoiceTabs } from "../../invoiceTabs/InvoiceTabsContext";
import { customersService } from "../customers/customersService";

type SaleItemForm = {
  product_id: number;
  productName: string;
  quantity: number;
  sale_price: number;
  cost_price: number;
};

const emptyItem = (): SaleItemForm => ({
  product_id: 0,
  productName: "",
  quantity: 1,
  sale_price: 0,
  cost_price: 0,
});

const money = (value: number) => Number(value || 0).toLocaleString("en-US");

export default function SaleFormPage({ tabId }: { tabId?: string } = {}) {
  useArrowFieldNavigation();
  const navigate = useNavigate();
  const { saleId } = useParams();
  const editingId = Number(saleId || 0);
  const isEdit = editingId > 0;
  // `tabId` is set when this form lives inside an open invoice tab (new invoices only).
  const isTab = !isEdit && Boolean(tabId);
  const draftKey = invoiceDraftKey("sale", isEdit ? "edit" : "new", editingId || undefined, isTab ? tabId : undefined);
  const { tabs: openTabs, updateTabMeta, removeTab, requestCloseTab } = useInvoiceTabs();
  const currentTab = isTab ? openTabs.find((tab) => tab.id === tabId) : undefined;
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<CreateSaleInvoiceInput | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const draftBaselineRef = useRef<string | null>(null);
  const latestDraftRef = useRef<unknown>(null);
  const finishedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItemForm[]>([emptyItem()]);
  const [originalEditQtyByProduct, setOriginalEditQtyByProduct] = useState<Record<number, number>>({});
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [existingPaidAmount, setExistingPaidAmount] = useState(0);
  const [paymentCashboxId, setPaymentCashboxId] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentExchangeRate, setPaymentExchangeRate] = useState("");
  const [currency, setCurrency] = useState("SYP");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [lookups, setLookups] = useState<{ customers: PartyApiRecord[]; cashboxes: CashboxApiRecord[]; products: ProductApiRecord[] } | null>(null);

  // ── Quick customer dialog state ───────────────────────────────────────────
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerSaving, setQuickCustomerSaving] = useState(false);
  const [quickCustomerError, setQuickCustomerError] = useState("");
  const [quickCustomer, setQuickCustomer] = useState({ name: "", phone: "", notes: "" });

  useEffect(() => {
    let active = true;
    Promise.all([salesService.getLookups(), salesService.getProducts()])
      .then(([data, products]) => { if (active) setLookups({ ...data, products }); })
      .catch((err: Error) => { if (active) setError(getArabicErrorMessage(err, "تعذر تحميل بيانات النموذج")); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isEdit || !lookups) return;
    let active = true;
    salesService.getDetails(editingId).then((data) => {
      if (!active) return;
      const origMap: Record<number, number> = {};
      for (const row of data.items as any[]) {
        const pid = Number(row.product_id ?? 0);
        if (pid > 0) {
          origMap[pid] = (origMap[pid] ?? 0) + Number(row.quantity ?? 0);
        }
      }
      setOriginalEditQtyByProduct(origMap);

      const draft = consumeInvoiceDraft<any>(draftKey);
      const source = draft ?? {
        customerId: Number(data.invoice.customer_id ?? 0),
        invoiceNumber: data.invoice.invoice_number,
        invoiceDate: data.invoice.invoice_date,
        discount: Number(data.invoice.discount_amount ?? data.invoice.discount ?? 0),
        notes: data.invoice.notes ?? "",
        currency: data.invoice.currency ?? "SYP",
        exchangeRate: Number(data.invoice.exchange_rate ?? 1),
        items: data.items.map((row: any) => ({
          product_id: Number(row.product_id ?? 0),
          productName: String(row.product_name ?? ""),
          quantity: Number(row.quantity ?? 1),
          sale_price: Number(row.unit_price ?? 0),
          cost_price: Number(row.cost_price ?? 0),
        })),
      };
      setCustomerId(source.customerId);
      setInvoiceNumber(source.invoiceNumber);
      setInvoiceDate(source.invoiceDate);
      setDiscount(source.discount);
      setNotes(source.notes);
      setCurrency(source.currency);
      setExchangeRate(source.exchangeRate);
      setItems(source.items);
      setPaymentAmount(0);
      setExistingPaidAmount(Number(data.invoice.paid_amount ?? 0));
      setRestoredDraft(Boolean(draft));
      setDraftInitialized(true);
    }).catch((err: Error) => setError(getArabicErrorMessage(err, "تعذر تحميل الفاتورة للتعديل")));
    return () => { active = false; };
  }, [isEdit, editingId, lookups, draftKey]);

  useEffect(() => {
    if (isEdit || draftInitialized) return;
    // Tab drafts stay stored while the tab is open (switching tabs remounts the form).
    const draft = isTab ? loadInvoiceDraft<any>(draftKey) : consumeInvoiceDraft<any>(draftKey);
    if (!draft) { setDraftInitialized(true); return; }
    setCustomerId(draft.customerId ?? 0);
    setInvoiceNumber(draft.invoiceNumber ?? "");
    setInvoiceDate(draft.invoiceDate ?? invoiceDate);
    setDiscount(draft.discount ?? 0);
    setNotes(draft.notes ?? "");
    setItems(
      Array.isArray(draft.items) && draft.items.length > 0
        ? draft.items.map((row: any) => ({
            product_id: Number(row.product_id ?? 0),
            productName: String(row.productName ?? ""),
            quantity: Number(row.quantity ?? 1),
            sale_price: Number(row.sale_price ?? 0),
            cost_price: Number(row.cost_price ?? 0),
          }))
        : [emptyItem()],
    );
    setPaymentAmount(draft.paymentAmount ?? 0);
    setPaymentCashboxId(draft.paymentCashboxId ?? 0);
    setPaymentDate(draft.paymentDate ?? paymentDate);
    setPaymentExchangeRate(draft.paymentExchangeRate ?? "");
    setCurrency(draft.currency ?? "SYP");
    setExchangeRate(draft.exchangeRate ?? 1);
    setRestoredDraft(!isTab);
    setDraftInitialized(true);
  }, [isEdit, draftKey, draftInitialized]);

  useEffect(() => {
    if (!draftInitialized) {
      return;
    }

    const draftData = {
      customerId,
      invoiceNumber,
      invoiceDate,
      discount,
      notes,
      items,
      paymentAmount,
      paymentCashboxId,
      paymentDate,
      paymentExchangeRate,
      currency,
      exchangeRate,
    };

    if (isTab) {
      // Open invoice tab: keep its own draft for as long as the tab stays open.
      latestDraftRef.current = draftData;
      const tabTimer = window.setTimeout(() => {
        if (tabId && isInvoiceTabOpen(tabId)) saveInvoiceDraft(draftKey, draftData);
      }, 300);
      return () => window.clearTimeout(tabTimer);
    }

    const fingerprint = invoiceDraftFingerprint(draftData);

    /*
     * أول لقطة بعد الدخول هي خط الأساس، ولا تتحول لمسودة تلقائيًا.
     */
    if (draftBaselineRef.current === null) {
      draftBaselineRef.current = fingerprint;
      return;
    }

    if (fingerprint === draftBaselineRef.current) {
      clearInvoiceDraft(draftKey);
      return;
    }

    const timer = window.setTimeout(() => {
      saveInvoiceDraft(draftKey, draftData);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    draftInitialized,
    draftKey,
    isTab,
    tabId,
    customerId,
    invoiceNumber,
    invoiceDate,
    discount,
    notes,
    items,
    paymentAmount,
    paymentCashboxId,
    paymentDate,
    paymentExchangeRate,
    currency,
    exchangeRate,
  ]);

  /* ─── Open invoice tab support ─── */
  // Flush the latest data when leaving the tab (switching tabs or pages) so
  // nothing typed during the last few hundred milliseconds is lost.
  useEffect(() => {
    if (!isTab || !tabId) return;
    return () => {
      if (finishedRef.current) return;
      if (latestDraftRef.current !== null && isInvoiceTabOpen(tabId)) {
        saveInvoiceDraft(draftKey, latestDraftRef.current);
      }
    };
  }, [isTab, tabId, draftKey]);

  // Product quantities already used by the OTHER open sale tabs (soft warning only).
  const reservedElsewhere = useMemo(
    () => (isTab ? getReservedProductQuantities(tabId) : new Map<number, number>()),
    [isTab, tabId],
  );

  const productsById = useMemo(() => {
    const map = new Map<number, ProductApiRecord>();
    for (const p of lookups?.products ?? []) {
      map.set(p.id, p);
    }
    return map;
  }, [lookups]);

  const getProductAvailableStock = useCallback(
    (productId: number) => {
      const p = productsById.get(productId);
      const currentStock = Number(p?.stock_quantity ?? 0);
      const restoredFromEdit = isEdit ? Number(originalEditQtyByProduct[productId] ?? 0) : 0;
      return currentStock + restoredFromEdit;
    },
    [productsById, isEdit, originalEditQtyByProduct],
  );

  /* ─── Keyboard shortcuts ─── */
  const addNewItem = useCallback(() => {
    setItems((curr) => [emptyItem(), ...curr]);
  }, []);

  const submitRef = useRef<() => void>(() => {});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        addNewItem();
      }

      if (e.key === "F3") {
        e.preventDefault();
        submitRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [addNewItem]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.sale_price, 0), [items]);
  const total = Math.max(0, subtotal - discount);
  const effectivePaidAmount = isEdit ? existingPaidAmount : paymentAmount;
  const remaining = Math.max(0, total - effectivePaidAmount);

  // Per-item quantity error map: index → error message (when total requested qty for product exceeds unified stock)
  const itemQuantityErrors = useMemo(() => {
    const errors = new Map<number, string>();
    if (!lookups) return errors;

    const requestedByProduct = new Map<number, number>();
    items.forEach((item) => {
      if (!item.product_id || item.quantity <= 0) return;
      requestedByProduct.set(
        item.product_id,
        (requestedByProduct.get(item.product_id) ?? 0) + Number(item.quantity || 0),
      );
    });

    items.forEach((item, index) => {
      if (!item.product_id || item.quantity <= 0) return;
      const product = productsById.get(item.product_id);
      if (!product) {
        errors.set(index, "المنتج المحدد غير متاح.");
        return;
      }
      const available = getProductAvailableStock(item.product_id);
      const totalRequested = requestedByProduct.get(item.product_id) ?? item.quantity;
      if (totalRequested > available + 0.001) {
        errors.set(
          index,
          `الكمية المطلوبة (${money(totalRequested)}) أكبر من المتاح في المخزون (${money(available)})`,
        );
      }
    });
    return errors;
  }, [items, lookups, productsById, getProductAvailableStock]);

  const activeCashboxes = useMemo(
    () => (lookups?.cashboxes ?? []).filter((cashbox) => Boolean(cashbox.isActive)),
    [lookups],
  );
  const totalBase = currency === "SYP" ? total : total * exchangeRate;

  // Keep the open-invoices bar label (customer · items · total) in sync.
  const customerName = customerId ? lookups?.customers.find((c) => c.id === customerId)?.name ?? "" : "";
  useEffect(() => {
    if (!isTab || !tabId || !draftInitialized) return;
    updateTabMeta(tabId, {
      partyName: lookups ? customerName : undefined,
      itemCount: items.filter((item) => item.product_id).length,
      total,
      currency,
    });
  }, [isTab, tabId, draftInitialized, lookups, customerName, items, total, currency, updateTabMeta]);

  const updateItem = (index: number, patch: Partial<SaleItemForm>) =>
    setItems((curr) => curr.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const openQuickCustomer = () => {
    setQuickCustomerOpen(true);
    setQuickCustomerError("");
    setQuickCustomer({ name: "", phone: "", notes: "" });
  };

  const createQuickCustomer = async () => {
    if (!quickCustomer.name.trim()) {
      setQuickCustomerError("اسم العميل مطلوب.");
      return;
    }
    try {
      setQuickCustomerSaving(true);
      setQuickCustomerError("");
      const created = await customersService.create({
        name: quickCustomer.name,
        phone: quickCustomer.phone,
        notes: quickCustomer.notes,
        isActive: true,
      });
      const newRecord: PartyApiRecord = {
        id: created.id,
        name: created.name,
        phone: null,
        email: null,
        address: null,
        balance: null,
        notes: null,
        isActive: 1,
        created_at: null,
        updated_at: null,
      };
      setLookups((curr) =>
        curr
          ? {
              ...curr,
              customers: [...curr.customers, newRecord].sort((a, b) =>
                a.name.localeCompare(b.name, "ar"),
              ),
            }
          : curr,
      );
      setCustomerId(created.id);
      setQuickCustomerOpen(false);
    } catch (err) {
      const e = err as Error;
      setQuickCustomerError(e.message || "حدث خطأ أثناء إضافة العميل.");
    } finally {
      setQuickCustomerSaving(false);
    }
  };

  const selectProduct = (index: number, productId: number) => {
    const product = productsById.get(productId);
    updateItem(index, {
      product_id: productId,
      productName: product?.name ?? "",
      cost_price: Number(product?.avg_cost_base ?? 0),
    });
  };

  const submit = async () => {
    setError("");
    if (items.some((item) => !item.product_id || item.quantity <= 0 || item.sale_price < 0)) {
      setError("راجع الأصناف — المنتج والكمية وسعر البيع الصحيح مطلوبة");
      notifyValidation("راجع الأصناف — المنتج والكمية وسعر البيع الصحيح مطلوبة");
      return;
    }
    if (itemQuantityErrors.size > 0) {
      const errorLines = Array.from(itemQuantityErrors.entries()).map(
        ([idx, msg]) => `صنف ${idx + 1} (${items[idx].productName || "بدون اسم"}): ${msg}`,
      );
      const fullMessage = `الكميات التالية أكبر من المتوفر في المخزون:\n${errorLines.join("\n")}`;
      setError(fullMessage);
      notifyValidation(fullMessage);
      return;
    }
    if (discount < 0 || discount > subtotal) {
      setError("قيمة الخصم غير صحيحة");
      notifyValidation("قيمة الخصم غير صحيحة");
      return;
    }
    if (!isEdit && (paymentAmount < 0 || paymentAmount > total + 0.001)) {
      setError("قيمة الدفعة الأولية غير صحيحة");
      notifyValidation("قيمة الدفعة الأولية غير صحيحة");
      return;
    }
    if (currency !== "SYP" && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
      setError("سعر الصرف مطلوب ويجب أن يكون أكبر من صفر");
      notifyValidation("سعر الصرف مطلوب ويجب أن يكون أكبر من صفر");
      return;
    }
    if (!isEdit && paymentAmount > 0 && !paymentCashboxId) {
      setError("اختر صندوق الدفعة الأولية");
      notifyValidation("اختر صندوق الدفعة الأولية");
      return;
    }
    const selectedCashbox = activeCashboxes.find((c) => c.id === paymentCashboxId);
    if (!isEdit && paymentAmount > 0 && selectedCashbox && selectedCashbox.currency !== currency && !paymentExchangeRate) {
      setError("يجب إدخال سعر الصرف للدفعة الأولية");
      notifyValidation("يجب إدخال سعر الصرف للدفعة الأولية");
      return;
    }
    if (!customerId && effectivePaidAmount < total - 0.001) {
      const message = isEdit
        ? "لا يمكن حفظ البيع النقدي بهذا التعديل لأن إجمالي الفاتورة أصبح أكبر من المبلغ المدفوع فعليًا. عالج الدفعات المرتبطة أولًا أو أبقِ الإجمالي ضمن المبلغ المدفوع."
        : "يجب تحديد عميل للبيع الآجل. البيع النقدي يتطلب دفع المبلغ كاملًا.";

      setError(message);
      notifyValidation(message);
      return;
    }

    const input: CreateSaleInvoiceInput = {
      customer_id: customerId || null,
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: invoiceDate,
      discount_amount: discount,
      notes: notes || undefined,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        sale_price: item.sale_price,
      })),
      initial_payment:
        !isEdit && paymentAmount > 0 && paymentCashboxId
          ? {
              cashbox_id: paymentCashboxId,
              amount: paymentAmount,
              payment_date: paymentDate,
              exchange_rate: Number(paymentExchangeRate) || undefined,
            }
          : undefined,
      currency: currency,
      exchange_rate: currency === "SYP" ? 1 : exchangeRate,
    };

    if (isEdit) {
      setPendingInput(input);
      setPasswordOpen(true);
      return;
    }

    setLoading(true);
    try {
      const result = await salesService.createProcess(input);
      finishedRef.current = true;
      // Saved: close its tab immediately and navigate to invoice details.
      if (isTab && tabId) removeTab(tabId);
      else clearInvoiceDraft(draftKey);
      navigate(`/sales/${result.invoice.id}`, { replace: true });
    } catch (err: unknown) {
      const e = err as Error;
      setError(getArabicErrorMessage(e, "حدث خطأ أثناء الحفظ"));
    } finally {
      setLoading(false);
    }
  };

  submitRef.current = submit;

  return (
    <>
      <PageHeader
        title={isEdit ? "تعديل فاتورة بيع" : currentTab ? `فاتورة ${formatInvoiceTabTitle(currentTab)}` : "فاتورة بيع جديدة"}
        description={isEdit ? "تعديل محمي بكلمة مرور مع حفظ سجل كامل للتغييرات." : "أدخل بيانات العميل والأصناف والمبالغ؛ يتم الخصم مباشرة من المخزون الموحد."}
        actions={<BackButton to={PATHS.SALES} />}
      />
      <div className="space-y-5 pb-24">
        {restoredDraft && (
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>تم تحميل آخر مسودة غير مكتملة.</span>
            <Button size="sm" variant="secondary" onClick={() => { clearInvoiceDraft(draftKey); window.location.reload(); }}>
              تجاهل المسودة
            </Button>
          </div>
        )}
        {isEdit && (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            الدفعات الموجودة لا تُعدّل من هنا. أي تغيير بالعملة أو العميل بعد وجود دفعات سيتم رفضه للحفاظ على السجل المالي.
          </div>
        )}
        {error && <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 whitespace-pre-line">{error}</div>}
        <FormSection title="بيانات الفاتورة" description="العميل والتاريخ ورقم الفاتورة." icon={<ShoppingCart size={18} />}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="رقم الفاتورة" htmlFor="invoiceNumber">
              <Input id="invoiceNumber" value={invoiceNumber} placeholder="يُنشأ تلقائيًا عند تركه فارغًا" onChange={(e) => setInvoiceNumber(e.target.value)} />
            </FormField>
            <FormField label="تاريخ الفاتورة" htmlFor="invoiceDate" required>
              <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </FormField>
            <FormField label="العميل" htmlFor="customer">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    id="customer"
                    value={String(customerId)}
                    placeholder="بيع نقدي (بدون عميل)"
                    searchPlaceholder="ابحث باسم العميل..."
                    emptyMessage="لا يوجد عميل مطابق للبحث"
                    options={[
                      { value: "0", label: "بيع نقدي (بدون عميل)" },
                      ...(lookups?.customers ?? []).map((c) => ({
                        value: String(c.id),
                        label: c.name,
                        keywords: c.name,
                      })),
                    ]}
                    onValueChange={(value) => setCustomerId(Number(value))}
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-11 shrink-0 px-3"
                  startIcon={<Plus size={15} />}
                  onClick={openQuickCustomer}
                >
                  عميل جديد
                </Button>
              </div>
            </FormField>
            <FormField label="العملة" required>
              <Select
                value={currency}
                options={[{ value: "SYP", label: "ل.س (SYP)" }, { value: "USD", label: "دولار (USD)" }]}
                onChange={(e) => {
                  const newCur = e.target.value;
                  setCurrency(newCur);
                  setExchangeRate(newCur === "SYP" ? 1 : 0);
                  const defaultBox = lookups?.cashboxes.find((c) => Boolean(c.isActive) && c.currency === newCur);
                  setPaymentCashboxId(defaultBox?.id ?? 0);
                }}
              />
            </FormField>
            {currency !== "SYP" && (
              <FormField label={`سعر 1 ${currency} بالليرة السورية`} required>
                <Input type="number" min="0.000001" step="any" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} />
              </FormField>
            )}
            <FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2 xl:col-span-4">
              <Textarea id="notes" value={notes} placeholder="ملاحظات عامة..." onChange={(e) => setNotes(e.target.value)} />
            </FormField>
          </div>
        </FormSection>

        <Card padding={false} header="أصناف الفاتورة" description="اختر المنتج وحدد الكمية وسعر البيع من المخزون الموحد.">
          {/* ─── Sticky "add item" bar ─── */}
          <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <Button variant="secondary" startIcon={<Plus size={17} />} onClick={addNewItem}>
                إضافة صنف
              </Button>
              <span className="text-xs text-[var(--text-muted)]">
                أو اضغط <kbd className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px]">F5</kbd>
              </span>
              <span className="mr-auto text-sm font-bold text-[var(--text-secondary)]">
                {items.length} {items.length === 1 ? "صنف" : "أصناف"}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-4">
            {items.map((item, index) => {
              const selectedProduct = productsById.get(item.product_id);
              const availableQty = item.product_id ? getProductAvailableStock(item.product_id) : 0;
              const effectiveCostPrice = selectedProduct
                ? Number(selectedProduct.avg_cost_base ?? item.cost_price ?? 0)
                : Number(item.cost_price ?? 0);

              return (
                <div
                  key={index}
                  className={`relative rounded-[var(--radius-md)] border p-4 pt-14 ${
                    itemQuantityErrors.has(index)
                      ? "border-[var(--danger)] bg-[var(--danger-subtle)]"
                      : "border-[var(--border)] bg-[var(--surface-subtle)]"
                  }`}
                >
                  {itemQuantityErrors.has(index) && (
                    <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-[var(--danger)] px-2.5 py-1 text-xs font-medium text-white">
                      <AlertTriangle size={13} />
                      {itemQuantityErrors.get(index)}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute left-3 top-3 h-8 border border-[var(--danger)]/30 px-2.5 text-[var(--danger)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]"
                    startIcon={<Trash2 size={15} />}
                    disabled={items.length === 1}
                    onClick={() => setItems((curr) => curr.filter((_, i) => i !== index))}
                  >
                    حذف الصنف
                  </Button>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <FormField label="المنتج" required>
                      <SearchableSelect
                        value={String(item.product_id)}
                        placeholder="اختر المنتج"
                        searchPlaceholder="ابحث باسم المنتج..."
                        emptyMessage="لا يوجد منتج مطابق للبحث"
                        options={[
                          { value: "0", label: "اختر المنتج" },
                          ...(lookups?.products ?? []).map((product) => {
                            const avail = getProductAvailableStock(product.id);
                            const reservedQty = reservedElsewhere.get(product.id) ?? 0;
                            const suffix = reservedQty > 0
                              ? ` (المتوفر: ${money(avail)} · محجوز: ${money(reservedQty)})`
                              : ` (المتوفر: ${money(avail)})`;
                            return {
                              value: String(product.id),
                              label: `${product.name}${suffix}`,
                              keywords: `${product.name} ${product.code ?? ""}`,
                            };
                          }),
                        ]}
                        onValueChange={(value) => selectProduct(index, Number(value))}
                      />
                    </FormField>

                    <FormField label="المتوفر بالمخزون">
                      <Input
                        readOnly
                        value={
                          item.product_id
                            ? `${money(availableQty)}${selectedProduct?.unit ? ` ${selectedProduct.unit}` : ""}`
                            : "—"
                        }
                      />
                    </FormField>

                    <FormField label="الكمية" required>
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                      />
                      {(() => {
                        if (!item.product_id) return null;
                        const reservedQty = reservedElsewhere.get(item.product_id) ?? 0;
                        if (reservedQty <= 0) return null;
                        const freeQty = availableQty - reservedQty;
                        if (item.quantity <= freeQty + 0.001) return null;
                        return (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            تنبيه: {money(reservedQty)} من هذا المنتج مستخدمة في فواتير مفتوحة أخرى لم تُحفظ بعد (المتبقي بعدها {money(Math.max(0, freeQty))}).
                          </p>
                        );
                      })()}
                    </FormField>

                    <FormField label="سعر البيع" required>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={item.sale_price}
                        onChange={(e) => updateItem(index, { sale_price: Number(e.target.value) })}
                      />
                    </FormField>

                    <FormField label="إجمالي السطر">
                      <Input readOnly value={money(item.quantity * item.sale_price)} />
                      {item.product_id > 0 && effectiveCostPrice > 0 && (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          متوسط التكلفة: {money(effectiveCostPrice)} SYP
                        </p>
                      )}
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding={false} header="ملخص المنتجات" description="يتحدث تلقائيًا أثناء إدخال أو تعديل أصناف الفاتورة للمراجعة قبل الحفظ.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm" dir="rtl">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-right">#</th>
                  <th className="px-4 py-3 text-right">المنتج</th>
                  <th className="px-4 py-3 text-right">الكمية</th>
                  <th className="px-4 py-3 text-right">سعر البيع</th>
                  <th className="px-4 py-3 text-right">إجمالي السطر</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={`sale-summary-${index}`}
                    className={`border-t ${
                      itemQuantityErrors.has(index)
                        ? "border-[var(--danger)] bg-[var(--danger-subtle)]"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <td className="px-4 py-3">
                      {itemQuantityErrors.has(index) && <AlertTriangle size={14} className="mb-0.5 inline text-[var(--danger)]" />}{" "}
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">{item.productName || "لم يتم اختيار المنتج"}</td>
                    <td className={`px-4 py-3 ${itemQuantityErrors.has(index) ? "font-bold text-[var(--danger)]" : ""}`} dir="ltr">
                      {money(item.quantity)}
                      {itemQuantityErrors.has(index) && (
                        <div className="mt-1 text-[11px] font-normal text-[var(--danger)]" dir="rtl">
                          {itemQuantityErrors.get(index)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3" dir="ltr">{money(item.sale_price)} {currency}</td>
                    <td className="px-4 py-3 font-bold" dir="ltr">{money(item.quantity * item.sale_price)} {currency}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[var(--border-strong)] bg-[var(--surface-subtle)]">
                <tr>
                  <td colSpan={2} className="px-4 py-3 font-bold">الإجمالي</td>
                  <td className="px-4 py-3 font-bold" dir="ltr">{money(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0))}</td>
                  <td className="px-4 py-3">—</td>
                  <td className="px-4 py-3 font-bold text-[var(--primary)]" dir="ltr">{money(subtotal)} {currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          {!isEdit ? (
            <FormSection title="الدفع الأولي" description="يمكن تسجيل دفعة مع إنشاء الفاتورة." icon={<Calculator size={18} />}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="المبلغ المدفوع">
                  <Input type="number" min="0" max={total} value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
                </FormField>
                <FormField label="الصندوق">
                  <Select
                    value={String(paymentCashboxId)}
                    options={[
                      { value: "0", label: "اختر الصندوق" },
                      ...activeCashboxes.map((c) => ({
                        value: String(c.id),
                        label: `${c.name} — ${Number(c.balance ?? 0).toLocaleString("en-US")} ${c.currency}`,
                      })),
                    ]}
                    onChange={(e) => setPaymentCashboxId(Number(e.target.value))}
                  />
                </FormField>
                {paymentCashboxId > 0 && activeCashboxes.find((c) => c.id === paymentCashboxId)?.currency !== currency && (
                  <FormField label="سعر صرف الدفعة" required>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={paymentExchangeRate}
                      onChange={(e) => setPaymentExchangeRate(e.target.value)}
                      placeholder={`سعر صرف ${activeCashboxes.find((c) => c.id === paymentCashboxId)?.currency} مقابل ${currency}`}
                    />
                  </FormField>
                )}
                <FormField label="تاريخ الدفع">
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </FormField>
              </div>
            </FormSection>
          ) : (
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-secondary)]">
              الدفعات السابقة تبقى كما هي ولا يتم تعديلها من نموذج الفاتورة.
            </div>
          )}

          <Card header="ملخص الفاتورة" className="h-fit">
            <div className="space-y-3 text-sm">
              {[
                ["المجموع الفرعي", subtotal],
                ["الخصم", -discount],
                ["المدفوع", effectivePaidAmount],
                ["المتبقي", remaining],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <strong>{money(Number(value))}</strong>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-3">
                <div className="flex justify-between text-base">
                  <strong>الإجمالي النهائي</strong>
                  <strong className="text-[var(--primary)]">{money(total)} {currency}</strong>
                </div>
                {currency !== "SYP" && (
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-[var(--text-muted)]">القيمة بالعملة الأساسية</span>
                    <strong>{money(totalBase)} SYP</strong>
                  </div>
                )}
                {currency !== "SYP" && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">1 {currency} = {money(exchangeRate)} SYP</p>
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <FormField label="الخصم">
                <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </FormField>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Quick Customer Dialog ─────────────────────────────────────── */}
      <Dialog
        open={quickCustomerOpen}
        title="إضافة عميل جديد"
        onClose={() => !quickCustomerSaving && setQuickCustomerOpen(false)}
        footer={
          <>
            <Button variant="secondary" disabled={quickCustomerSaving} onClick={() => setQuickCustomerOpen(false)}>
              إلغاء
            </Button>
            <Button
              isLoading={quickCustomerSaving}
              loadingText="جاري الإضافة..."
              startIcon={<Save size={16} />}
              onClick={() => void createQuickCustomer()}
            >
              إضافة واختيار العميل
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <FormField label="اسم العميل" required>
            <Input
              autoFocus
              value={quickCustomer.name}
              placeholder="اسم العميل..."
              onChange={(e) => setQuickCustomer((c) => ({ ...c, name: e.target.value }))}
            />
          </FormField>
          <FormField label="رقم الهاتف">
            <Input
              dir="ltr"
              value={quickCustomer.phone}
              placeholder="اختياري"
              onChange={(e) => setQuickCustomer((c) => ({ ...c, phone: e.target.value }))}
            />
          </FormField>
          <FormField label="ملاحظات">
            <Input
              value={quickCustomer.notes}
              placeholder="اختياري"
              onChange={(e) => setQuickCustomer((c) => ({ ...c, notes: e.target.value }))}
            />
          </FormField>
          {quickCustomerError && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-bold text-[var(--danger)]">
              {quickCustomerError}
            </p>
          )}
        </div>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-[260px] z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-end gap-3">
          <div className="mr-auto flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Keyboard size={14} />
            <span>
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px]">F5</kbd> إضافة صنف
            </span>
            <span className="mx-1">·</span>
            <span>
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px]">F3</kbd> حفظ
            </span>
            <span className="mx-1">·</span>
            <span>
              <kbd className="rounded border border-[var(--border)] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> إلغاء
            </span>
          </div>

          <Button variant="secondary" onClick={() => (isTab && tabId ? requestCloseTab(tabId) : navigate(PATHS.SALES))}>
            إلغاء
          </Button>
          <Button startIcon={<Save size={17} />} disabled={loading} onClick={submit}>
            {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
          </Button>
        </div>
      </div>
      <InvoiceEditPasswordDialog
        open={passwordOpen}
        loading={loading}
        error={error}
        onClose={() => setPasswordOpen(false)}
        onConfirm={async (password) => {
          if (!pendingInput) return;
          setLoading(true);
          setError("");
          try {
            const result = await salesService.update(editingId, pendingInput, password);
            clearInvoiceDraft(draftKey);
            setPasswordOpen(false);
            navigate(`/sales/${result.invoice.id}`);
          } catch (err: unknown) {
            setError(getInvoiceEditErrorMessage(err));
          } finally {
            setLoading(false);
          }
        }}
      />
    </>
  );
}
