import { notifyValidation } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { getInvoiceEditErrorMessage } from "../../lib/invoiceEditErrors";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BackButton,
  Button,
  Card,
  Dialog,
  FormField,
  FormSection,
  Input,
  PageHeader,
  SearchableSelect,
  Select,
  Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";
import InvoiceEditPasswordDialog from "../../components/invoices/InvoiceEditPasswordDialog";
import {
  clearInvoiceDraft,
  consumeInvoiceDraft,
  invoiceDraftFingerprint,
  invoiceDraftKey,
  saveInvoiceDraft,
} from "../../lib/invoiceDrafts";
import {
  getProductErrorMessage,
  productsService,
} from "../products/productsService";
import {
  suppliersService,
  getSupplierErrorMessage,
} from "../suppliers/suppliersService";

type PurchaseItemForm = {
  product_id: number;
  productName: string;
  quantity: number;

  // السعر الفعلي للمشتريات العادية فقط
  purchase_price: number;

  // السعر المتوقع لفواتير الأمانة فقط
  estimated_purchase_price: number;

  batch_code: string;
  received_date: string;
  expiry_date: string;
};

/**
 * Extension for the upcoming backend field.
 *
 * This keeps the page ready for estimated_purchase_price
 * even if the shared backend/API type has not been updated yet.
 */
type PurchaseItemInputWithEstimatedPrice =
  CreatePurchaseInvoiceInput["items"][number] & {
    estimated_purchase_price?: number;
  };

type CreatePurchaseInvoiceInputWithEstimatedPrice =
  Omit<CreatePurchaseInvoiceInput, "items"> & {
    items: PurchaseItemInputWithEstimatedPrice[];
  };

const emptyItem = (): PurchaseItemForm => ({
  product_id: 0,
  productName: "",
  quantity: 1,
  purchase_price: 0,
  estimated_purchase_price: 0,
  batch_code: "",
  received_date: new Date().toISOString().slice(0, 10),
  expiry_date: "",
});

const money = (value: number) =>
  Number(value || 0).toLocaleString("en-US");

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const { purchaseId } = useParams();
  const editingId = Number(purchaseId || 0);
  const isEdit = editingId > 0;
  const draftKey = invoiceDraftKey("purchase", isEdit ? "edit" : "new", editingId || undefined);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<CreatePurchaseInvoiceInputWithEstimatedPrice | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const draftBaselineRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [supplierId, setSupplierId] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [invoiceType, setInvoiceType] = useState<
    "standard" | "consignment"
  >("standard");

  const [discount, setDiscount] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [transportCostBearer, setTransportCostBearer] = useState<"company" | "supplier">("company");
  const [emptyingCost, setEmptyingCost] = useState(0);
  const [emptyingCostBearer, setEmptyingCostBearer] = useState<"company" | "supplier">("company");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<PurchaseItemForm[]>([
    emptyItem(),
  ]);

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [existingPaidAmount, setExistingPaidAmount] = useState(0);
  const [paymentCashboxId, setPaymentCashboxId] = useState(0);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentExchangeRate, setPaymentExchangeRate] = useState("");

  const [currency, setCurrency] = useState("SYP");
  const [exchangeRate, setExchangeRate] = useState(1);

  const [quickProductIndex, setQuickProductIndex] = useState<
    number | null
  >(null);

  const [quickProductSaving, setQuickProductSaving] =
    useState(false);

  const [quickProductError, setQuickProductError] =
    useState("");

  const [quickProduct, setQuickProduct] = useState({
    name: "",
    code: "",
    unit: "",
    category: "",
    description: "",
  });

  // ── Quick supplier dialog state ───────────────────────────────────────────
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const [quickSupplierSaving, setQuickSupplierSaving] = useState(false);
  const [quickSupplierError, setQuickSupplierError] = useState("");
  const [quickSupplier, setQuickSupplier] = useState({ name: "", phone: "", notes: "" });

  const [lookups, setLookups] = useState<{
    suppliers: PartyApiRecord[];
    cashboxes: CashboxApiRecord[];
    products: ProductApiRecord[];
  } | null>(null);

  const [lookupsLoading, setLookupsLoading] =
    useState(true);

  const isConsignment = invoiceType === "consignment";

  useEffect(() => {
    Promise.all([
      purchasesService.getLookups(),
      purchasesService.getProducts(),
    ])
      .then(([data, products]) => {
        setLookups({
          ...data,
          products,
        });

        if (data.suppliers.length === 1) {
          setSupplierId(data.suppliers[0].id);
        }
      })
      .catch((err: Error) =>
        setError(
          getArabicErrorMessage(
            err,
            "تعذر تحميل الموردين والمنتجات والصناديق",
          ),
        ),
      )
      .finally(() => setLookupsLoading(false));
  }, []);

  useEffect(() => {
    if (!isEdit || !lookups) return;
    purchasesService.getDetails(editingId).then((data) => {
      const draft = consumeInvoiceDraft<any>(draftKey);
      const source = draft ?? { supplierId: Number(data.invoice.supplier_id), invoiceNumber: data.invoice.invoice_number, invoiceDate: data.invoice.invoice_date, invoiceType: data.invoice.invoice_type, discount: Number(data.invoice.discount_amount ?? data.invoice.discount ?? 0), transportCost: Number((data.invoice as any).transport_cost ?? 0), transportCostBearer: ((data.invoice as any).transport_cost_bearer === "supplier" ? "supplier" : "company"), emptyingCost: Number((data.invoice as any).emptying_cost ?? 0), emptyingCostBearer: ((data.invoice as any).emptying_cost_bearer === "supplier" ? "supplier" : "company"), notes: data.invoice.notes ?? "", currency: data.invoice.currency ?? "SYP", exchangeRate: Number(data.invoice.exchange_rate ?? 1), items: data.items.map((row: any) => ({ product_id: Number(row.product_id), productName: String(row.product_name ?? ""), quantity: Number(row.quantity ?? 1), purchase_price: Number(row.unit_price ?? 0), estimated_purchase_price: Number(row.estimated_purchase_price ?? row.unit_price ?? 0), batch_code: String(row.batch_code ?? ""), received_date: String(row.batch_received_date ?? row.received_date ?? data.invoice.invoice_date), expiry_date: String(row.batch_expiry_date ?? row.expiry_date ?? "") })) };
      setSupplierId(source.supplierId); setInvoiceNumber(source.invoiceNumber); setInvoiceDate(source.invoiceDate); setInvoiceType(source.invoiceType); setDiscount(source.discount); setTransportCost(source.transportCost ?? 0); setTransportCostBearer(source.transportCostBearer ?? "company"); setEmptyingCost(source.emptyingCost ?? 0); setEmptyingCostBearer(source.emptyingCostBearer ?? "company"); setNotes(source.notes); setCurrency(source.currency); setExchangeRate(source.exchangeRate); setItems(source.items); setPaymentAmount(0); setExistingPaidAmount(Number(data.invoice.paid_amount ?? 0)); setRestoredDraft(Boolean(draft)); setDraftInitialized(true);
    }).catch((err: Error) => setError(getArabicErrorMessage(err, "تعذر تحميل الفاتورة للتعديل")));
  }, [isEdit, editingId, lookups, draftKey]);

  useEffect(() => {
    if (isEdit || draftInitialized) return; const draft = consumeInvoiceDraft<any>(draftKey); if (!draft) { setDraftInitialized(true); return; }
    setSupplierId(draft.supplierId ?? 0); setInvoiceNumber(draft.invoiceNumber ?? ""); setInvoiceDate(draft.invoiceDate ?? invoiceDate); setInvoiceType(draft.invoiceType ?? "standard"); setDiscount(draft.discount ?? 0); setTransportCost(draft.transportCost ?? 0); setTransportCostBearer(draft.transportCostBearer ?? "company"); setEmptyingCost(draft.emptyingCost ?? 0); setEmptyingCostBearer(draft.emptyingCostBearer ?? "company"); setNotes(draft.notes ?? ""); setItems(draft.items ?? [emptyItem()]); setPaymentAmount(draft.paymentAmount ?? 0); setPaymentCashboxId(draft.paymentCashboxId ?? 0); setPaymentDate(draft.paymentDate ?? paymentDate); setPaymentExchangeRate(draft.paymentExchangeRate ?? ""); setCurrency(draft.currency ?? "SYP"); setExchangeRate(draft.exchangeRate ?? 1); setRestoredDraft(true); setDraftInitialized(true);
  }, [isEdit, draftKey, draftInitialized]);

  useEffect(() => {
    if (!draftInitialized) {
      return;
    }

    const draftData = {
      supplierId,
      invoiceNumber,
      invoiceDate,
      invoiceType,
      discount,
      transportCost,
      transportCostBearer,
      emptyingCost,
      emptyingCostBearer,
      notes,
      items,
      paymentAmount,
      paymentCashboxId,
      paymentDate,
      paymentExchangeRate,
      currency,
      exchangeRate,
    };

    const fingerprint =
      invoiceDraftFingerprint(
        draftData,
      );

    /*
     * أول لقطة بعد تحميل النموذج هي خط الأساس.
     * لا نحفظها كمسودة، سواء كانت بيانات فارغة أو مسودة مستعادة.
     */
    if (
      draftBaselineRef.current ===
      null
    ) {
      draftBaselineRef.current =
        fingerprint;
      return;
    }

    /*
     * إذا رجعت البيانات لنفس حالة الدخول الحالية، لا يوجد شيء غير مكتمل.
     */
    if (
      fingerprint ===
      draftBaselineRef.current
    ) {
      clearInvoiceDraft(draftKey);
      return;
    }

    const timer =
      window.setTimeout(() => {
        saveInvoiceDraft(
          draftKey,
          draftData,
        );
      }, 700);

    return () =>
      window.clearTimeout(timer);
  }, [
    draftInitialized,
    draftKey,
    supplierId,
    invoiceNumber,
    invoiceDate,
    invoiceType,
    discount,
    transportCost,
    transportCostBearer,
    emptyingCost,
    emptyingCostBearer,
    notes,
    items,
    paymentAmount,
    paymentCashboxId,
    paymentDate,
    paymentExchangeRate,
    currency,
    exchangeRate,
  ]);

  /**
   * المجموع الحقيقي للمشتريات العادية.
   */
  const standardSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + item.quantity * item.purchase_price,
        0,
      ),
    [items],
  );

  /**
   * القيمة التقديرية للأمانة.
   *
   * لا تمثل دينًا حقيقيًا على المورد،
   * ولا يجب استخدامها لاحقًا في التسوية.
   */
  const estimatedSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            item.estimated_purchase_price,
        0,
      ),
    [items],
  );

  /**
   * المجموع الكلي — للأمانة يستخدم سعر التسويق كأساس الفاتورة.
   * هذا يسمح بتسجيل دفعات جزئية للمورد.
   * تكاليف النقل والعتالة تؤثر على الإجمالي حسب الجهة التي تتحمل كل تكلفة.
   */
  const total = Math.max(
    0,
    (isConsignment ? estimatedSubtotal : standardSubtotal - discount) +
      transportCost * (transportCostBearer === "company" ? 1 : -1) +
      emptyingCost * (emptyingCostBearer === "company" ? 1 : -1),
  );

  /**
   * المتبقي = الإجمالي - الدفعة الأولية (للعادية) أو صفر (للأمانة عند الإنشاء).
   */
  const effectivePaidAmount = isEdit
    ? existingPaidAmount
    : paymentAmount;

  const remaining = Math.max(
    0,
    total - effectivePaidAmount,
  );

  const activeCashboxes = useMemo(
    () => (lookups?.cashboxes ?? []).filter((cashbox) => Boolean(cashbox.isActive)),
    [lookups],
  );

  const totalBase =
    currency === "SYP"
      ? total
      : total * exchangeRate;

  const updateItem = (
    index: number,
    patch: Partial<PurchaseItemForm>,
  ) =>
    setItems((curr) =>
      curr.map((item, i) =>
        i === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );

  const selectProduct = (
    index: number,
    productId: number,
  ) => {
    const product = lookups?.products.find(
      (p) => p.id === productId,
    );

    updateItem(index, {
      product_id: productId,
      productName: product?.name ?? "",
    });
  };

  const openQuickProduct = (index: number) => {
    setQuickProductIndex(index);
    setQuickProductError("");

    setQuickProduct({
      name: "",
      code: "",
      unit: "",
      category: "",
      description: "",
    });
  };

  const createQuickProduct = async () => {
    if (quickProductIndex === null) {
      return;
    }

    if (
      !quickProduct.name.trim() ||
      !quickProduct.unit.trim()
    ) {
      setQuickProductError(
        "اسم المنتج والوحدة مطلوبان.",
      );
      return;
    }

    try {
      setQuickProductSaving(true);
      setQuickProductError("");

      const created = await productsService.create({
        name: quickProduct.name,
        code: quickProduct.code,
        unit: quickProduct.unit,
        category: quickProduct.category,
        description: quickProduct.description,
        isActive: true,
      });

      const apiProduct: ProductApiRecord = {
        id: created.id,
        name: created.name,
        code: created.code,
        unit: created.unit,
        category: created.category,
        description: created.description,
        isActive: created.isActive,
      };

      setLookups((current) =>
        current
          ? {
              ...current,
              products: [
                ...current.products,
                apiProduct,
              ].sort((a, b) =>
                a.name.localeCompare(b.name, "ar"),
              ),
            }
          : current,
      );

      updateItem(quickProductIndex, {
        product_id: created.id,
        productName: created.name,
      });

      setQuickProductIndex(null);
    } catch (createError) {
      setQuickProductError(
        getProductErrorMessage(createError),
      );
    } finally {
      setQuickProductSaving(false);
    }
  };

  const openQuickSupplier = () => {
    setQuickSupplierOpen(true);
    setQuickSupplierError("");
    setQuickSupplier({ name: "", phone: "", notes: "" });
  };

  const createQuickSupplier = async () => {
    if (!quickSupplier.name.trim()) {
      setQuickSupplierError("اسم المورد مطلوب.");
      return;
    }
    try {
      setQuickSupplierSaving(true);
      setQuickSupplierError("");
      const created = await suppliersService.create({
        name: quickSupplier.name,
        phone: quickSupplier.phone,
        notes: quickSupplier.notes,
        isActive: true,
      });
      const newRecord: PartyApiRecord = {
        id: created.id, name: created.name,
        phone: null,
        email: null,
        address: null,
        balance: null,
        notes: null,
        isActive: 0,
        created_at: null,
        updated_at: null
      };
      setLookups((curr) =>
        curr
          ? {
              ...curr,
              suppliers: [...curr.suppliers, newRecord].sort((a, b) =>
                a.name.localeCompare(b.name, "ar"),
              ),
            }
          : curr,
      );
      setSupplierId(created.id);
      setQuickSupplierOpen(false);
    } catch (err) {
      setQuickSupplierError(getSupplierErrorMessage(err));
    } finally {
      setQuickSupplierSaving(false);
    }
  };

  const changeInvoiceType = (
    nextType: "standard" | "consignment",
  ) => {
    setInvoiceType(nextType);
    setError("");

    if (nextType === "consignment") {
      /**
       * الأمانة تدعم نفس عملات النظام (SYP / USD).
       * نحافظ على العملة الحالية بدل فرض الليرة السورية.
       */
      if (currency === "SYP") {
        setExchangeRate(1);
      }

      /**
       * الأمانة لا تحتوي دفعة أولية.
       */
      setPaymentAmount(0);
      setPaymentCashboxId(0);

      /**
       * الخصم المالي غير مستخدم في الأمانة،
       * لأن القيمة الموجودة تقديرية فقط.
       */
      setDiscount(0);
    }
  };

  const submit = async () => {
    setError("");

    if (!supplierId) {
      setError("اختر المورد");
      notifyValidation("اختر المورد");
      return;
    }

    if (!invoiceDate) {
      setError("تاريخ الفاتورة مطلوب");
      notifyValidation("تاريخ الفاتورة مطلوب");
      return;
    }

    /**
     * الخصم يخص الشراء العادي فقط.
     */
    if (
      !isConsignment &&
      (discount < 0 || discount > standardSubtotal)
    ) {
      setError(
        "الخصم غير صالح أو يتجاوز المجموع الفرعي",
      );
      notifyValidation(
        "الخصم غير صالح أو يتجاوز المجموع الفرعي",
      );
      return;
    }

    /**
     * الدفع الأولي يخص الشراء العادي فقط.
     */
    if (
      !isConsignment &&
      (paymentAmount < 0 || paymentAmount > total)
    ) {
      setError(
        "المبلغ المدفوع غير صالح أو يتجاوز إجمالي الفاتورة",
      );
      notifyValidation(
        "المبلغ المدفوع غير صالح أو يتجاوز إجمالي الفاتورة",
      );
      return;
    }

    if (
      currency !== "SYP" &&
      (!Number.isFinite(exchangeRate) ||
        exchangeRate <= 0)
    ) {
      setError(
        "سعر الصرف مطلوب ويجب أن يكون أكبر من صفر",
      );
      notifyValidation(
        "سعر الصرف مطلوب ويجب أن يكون أكبر من صفر",
      );
      return;
    }

    if (
      !isConsignment &&
      paymentAmount > 0 &&
      !paymentCashboxId
    ) {
      setError(
        "اختر الصندوق عند تسجيل دفعة أولية",
      );
      notifyValidation(
        "اختر الصندوق عند تسجيل دفعة أولية",
      );
      return;
    }

    const selectedCashbox = activeCashboxes.find((c) => c.id === paymentCashboxId);
    if (
      !isConsignment &&
      paymentAmount > 0 &&
      selectedCashbox &&
      selectedCashbox.currency !== currency &&
      !paymentExchangeRate
    ) {
      setError("يجب إدخال سعر الصرف للدفعة الأولية");
      notifyValidation("يجب إدخال سعر الصرف للدفعة الأولية");
      return;
    }

    const productIds = items
      .map((item) => item.product_id)
      .filter(Boolean);

    if (
      new Set(productIds).size !==
      productIds.length
    ) {
      setError(
        "لا يمكن تكرار المنتج في أكثر من سطر. اجمع الكمية في سطر واحد",
      );
      notifyValidation(
        "لا يمكن تكرار المنتج في أكثر من سطر. اجمع الكمية في سطر واحد",
      );
      return;
    }

    const invalidItem = items.some((item) => {
      if (!item.product_id) {
        return true;
      }

      if (
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        return true;
      }

      /**
       * الشراء العادي يستخدم purchase_price.
       */
      if (
        !isConsignment &&
        (!Number.isFinite(item.purchase_price) ||
          item.purchase_price < 0)
      ) {
        return true;
      }

      /**
       * الأمانة تستخدم estimated_purchase_price.
       * الصفر مسموح لأنه قد لا يوجد سعر متوقع
       * عند استلام البضاعة.
       */
      if (
        isConsignment &&
        (!Number.isFinite(
          item.estimated_purchase_price,
        ) ||
          item.estimated_purchase_price < 0)
      ) {
        return true;
      }

      if (!item.received_date) {
        return true;
      }

      if (
        item.expiry_date &&
        item.expiry_date < item.received_date
      ) {
        return true;
      }

      return false;
    });

    if (invalidItem) {
      const message = isConsignment
        ? "راجع الأصناف — المنتج والكمية وسعر التسويق مطلوبة ولا يمكن أن تكون سالبة"
        : "راجع الأصناف — المنتج والكمية والسعر مطلوبة";

      setError(message);
      notifyValidation(message);
      return;
    }

    const input: CreatePurchaseInvoiceInputWithEstimatedPrice =
      {
        supplier_id: supplierId,

        invoice_number:
          invoiceNumber.trim() || undefined,

        invoice_date: invoiceDate,
        invoice_type: invoiceType,

        /**
         * لا نرسل خصمًا ماليًا للأمانة.
         */
        discount_amount: isConsignment
          ? 0
          : discount,

        /** تكلفة النقل — مصروف يُضاف للإجمالي */
        transport_cost: transportCost > 0 ? transportCost : undefined,
        transport_cost_bearer: transportCostBearer,

        /** تكلفة العتالة */
        emptying_cost: emptyingCost > 0 ? emptyingCost : undefined,
        emptying_cost_bearer: emptyingCostBearer,

        notes: notes || undefined,

        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,

          /**
           * للأمانة:
           * نرسل سعر التسويق كـ purchase_price حتى يؤثر على إجمالي الفاتورة
           * ويسمح بتسجيل دفعات جزئية منه للمورد.
           * التسوية النهائية تعتمد على المبيعات الفعلية والعمولة.
           */
          purchase_price: isConsignment
            ? item.estimated_purchase_price
            : item.purchase_price,

          estimated_purchase_price:
            isConsignment
              ? item.estimated_purchase_price
              : undefined,

          batch_code:
            item.batch_code || undefined,

          received_date:
            item.received_date || undefined,

          expiry_date:
            item.expiry_date || undefined,
        })),

        /**
         * لا توجد دفعة أولية لفاتورة الأمانة.
         */
        initial_payment:
          !isConsignment && paymentAmount > 0 && paymentCashboxId
            ? {
                cashbox_id: paymentCashboxId,
                amount: paymentAmount,
                payment_date: paymentDate,
                exchange_rate: Number(paymentExchangeRate) || undefined,
              }
            : undefined,

        /**
         * الأمانة والعادية تستخدمان العملة المختارة نفسها.
         */
        currency,

        exchange_rate:
          currency === "SYP"
            ? 1
            : exchangeRate,
      };

    if (isEdit) { setPendingInput(input); setPasswordOpen(true); return; }

    setLoading(true);

    try {
      const result =
        await purchasesService.createFull(input);

      if (!result?.invoice?.id) {
        throw new Error(
          "لم يرجع الباك رقم الفاتورة المنشأة",
        );
      }

      clearInvoiceDraft(draftKey);
      navigate(`/purchases/${result.invoice.id}`);
    } catch (err: unknown) {
      const e = err as Error;

      setError(
        getArabicErrorMessage(
          e,
          "حدث خطأ أثناء الحفظ",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isEdit ? "تعديل فاتورة شراء" : "فاتورة شراء جديدة"}
        description={isEdit ? "تعديل محمي بكلمة مرور. لن يسمح النظام بالتعديل إذا تحرك مخزون الفاتورة لاحقًا." : isConsignment ? "استلام بضاعة أمانة من المورد. سعر الشراء المتوقع تقديري فقط ولا يمثل مبلغًا مستحقًا." : "أدخل بيانات المورد والأصناف ودفعات المخزون والمبالغ المالية."}
        actions={
          <BackButton to={PATHS.PURCHASES} />
        }
      />

      <div className="space-y-5 pb-24">
        {restoredDraft && <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>تم تحميل آخر مسودة غير مكتملة.</span><Button size="sm" variant="secondary" onClick={() => { clearInvoiceDraft(draftKey); window.location.reload(); }}>تجاهل المسودة</Button></div>}
        {isEdit && <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">التعديل يتطلب كلمة المرور عند الحفظ. إذا كانت دفعة مخزون من هذه الفاتورة قد بيعت أو عُدلت، سيرفض الباك التعديل حفاظًا على السجل.</div>}
        {error && (
          <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <FormSection
          title="بيانات الفاتورة"
          description="المورد ونوع الفاتورة والتاريخ."
          icon={<PackagePlus size={18} />}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField
              label="رقم الفاتورة"
              htmlFor="invoiceNumber"
            >
              <Input
                id="invoiceNumber"
                value={invoiceNumber}
                placeholder="يُنشأ تلقائيًا عند تركه فارغًا"
                onChange={(e) =>
                  setInvoiceNumber(e.target.value)
                }
              />
            </FormField>

            <FormField
              label="تاريخ الفاتورة"
              htmlFor="invoiceDate"
              required
            >
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) =>
                  setInvoiceDate(e.target.value)
                }
              />
            </FormField>

            <FormField
              label="المورد"
              htmlFor="supplier"
              required
            >
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <SearchableSelect
                    id="supplier"
                    value={String(supplierId)}
                    disabled={lookupsLoading}
                    placeholder={
                      lookupsLoading
                        ? "جاري تحميل الموردين..."
                        : "اختر المورد"
                    }
                    searchPlaceholder="ابحث باسم المورد..."
                    emptyMessage="لا يوجد مورد مطابق للبحث"
                    options={[
                      {
                        value: "0",
                        label: "اختر المورد",
                      },
                      ...(lookups?.suppliers ?? []).map(
                        (supplier) => ({
                          value: String(supplier.id),
                          label: supplier.name,
                          keywords: supplier.name,
                        }),
                      ),
                    ]}
                    onValueChange={(value) =>
                      setSupplierId(
                        Number(value),
                      )
                    }
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-11 shrink-0 px-3"
                  startIcon={<Plus size={15} />}
                  onClick={openQuickSupplier}
                >
                  مورد جديد
                </Button>
              </div>
            </FormField>

            <FormField
              label="نوع الفاتورة"
              htmlFor="purchaseType"
            >
              <Select
                id="purchaseType"
                value={invoiceType}
                options={[
                  {
                    value: "standard",
                    label: "فاتورة عادية",
                  },
                  {
                    value: "consignment",
                    label: "فاتورة أمانة",
                  },
                ]}
                onChange={(e) =>
                  changeInvoiceType(
                    e.target.value as
                      | "standard"
                      | "consignment",
                  )
                }
              />
            </FormField>

            <FormField label="العملة" required>
              <Select
                value={currency}
                options={[
                  {
                    value: "SYP",
                    label: "ل.س (SYP)",
                  },
                  {
                    value: "USD",
                    label: "دولار (USD)",
                  },
                ]}
                onChange={(e) => {
                  const newCurrency =
                    e.target.value;

                  setCurrency(newCurrency);

                  setExchangeRate(
                    newCurrency === "SYP"
                      ? 1
                      : 0,
                  );

                  const defaultBox =
                    lookups?.cashboxes.find(
                      (cashbox) =>
                        Boolean(
                          cashbox.isActive,
                        ) &&
                        cashbox.currency ===
                          newCurrency,
                    );

                  setPaymentCashboxId(
                    defaultBox?.id ?? 0,
                  );
                }}
              />
            </FormField>

            {currency !== "SYP" && (
                <FormField
                  label={`سعر 1 ${currency} بالليرة السورية`}
                  required
                >
                  <Input
                    type="number"
                    min="0.000001"
                    step="any"
                    value={exchangeRate}
                    onChange={(e) =>
                      setExchangeRate(
                        Number(e.target.value),
                      )
                    }
                  />
                </FormField>
              )}

            <FormField
              label="ملاحظات"
              htmlFor="notes"
              className="md:col-span-2 xl:col-span-4"
            >
              <Textarea
                id="notes"
                value={notes}
                placeholder="ملاحظات عامة..."
                onChange={(e) =>
                  setNotes(e.target.value)
                }
              />
            </FormField>
          </div>
        </FormSection>

        <Card
          padding={false}
          header="أصناف الفاتورة"
          description={
            isConsignment
              ? "أضف المنتجات وحدد الكمية وسعر تسويق المنتج وبيانات دفعة المخزون. سعر التسويق يحدد إجمالي الفاتورة ويمكن دفع دفعات منه للمورد."
              : "أضف المنتجات وحدد الكمية وسعر الشراء وبيانات دفعة المخزون."
          }
        >
          <div className="space-y-4 p-4">
            {items.map((item, index) => {
              const itemPrice = isConsignment
                ? item.estimated_purchase_price
                : item.purchase_price;

              const lineTotal =
                item.quantity * itemPrice;

              return (
                <div
                  key={index}
                  className="relative rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 pt-14"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute left-3 top-3 h-8 border border-[var(--danger)]/30 px-2.5 text-[var(--danger)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]"
                    startIcon={
                      <Trash2 size={15} />
                    }
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((curr) =>
                        curr.filter(
                          (_, i) =>
                            i !== index,
                        ),
                      )
                    }
                  >
                    حذف الصنف
                  </Button>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <FormField
                      label="المنتج"
                      required
                    >
                      <div className="flex gap-2">
                        <div className="min-w-0 flex-1">
                          <SearchableSelect
                            value={String(
                              item.product_id,
                            )}
                            disabled={
                              lookupsLoading
                            }
                            placeholder={
                              lookupsLoading
                                ? "جاري تحميل المنتجات..."
                                : "اختر المنتج"
                            }
                            searchPlaceholder="ابحث باسم المنتج أو الكود..."
                            emptyMessage="لا يوجد منتج مطابق للبحث"
                            options={[
                              {
                                value: "0",
                                label: "اختر المنتج",
                              },
                              ...(
                                lookups?.products ??
                                []
                              ).map(
                                (product) => ({
                                  value: String(
                                    product.id,
                                  ),
                                  label: `${product.name} — ${product.code ?? ""}`,
                                  keywords: `${product.name} ${product.code ?? ""}`,
                                }),
                              ),
                            ]}
                            onValueChange={(value) =>
                              selectProduct(
                                index,
                                Number(value),
                              )
                            }
                          />
                        </div>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-11 shrink-0 px-3"
                          startIcon={
                            <Plus size={15} />
                          }
                          onClick={() =>
                            openQuickProduct(
                              index,
                            )
                          }
                        >
                          منتج جديد
                        </Button>
                      </div>
                    </FormField>

                    <FormField
                      label="الكمية"
                      required
                    >
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, {
                            quantity: Number(
                              e.target.value,
                            ),
                          })
                        }
                      />
                    </FormField>

                    {isConsignment ? (
                      <FormField label="سعر تسويق المنتج" required>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={
                            item.estimated_purchase_price
                          }
                          placeholder="سعر تسويق الوحدة للمورد"
                          onChange={(e) =>
                            updateItem(index, {
                              estimated_purchase_price:
                                Number(
                                  e.target
                                    .value,
                                ),
                            })
                          }
                        />
                      </FormField>
                    ) : (
                      <FormField
                        label="سعر الشراء"
                        required
                      >
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={
                            item.purchase_price
                          }
                          onChange={(e) =>
                            updateItem(index, {
                              purchase_price:
                                Number(
                                  e.target
                                    .value,
                                ),
                            })
                          }
                        />
                      </FormField>
                    )}

                    <FormField
                      label={
                        isConsignment
                          ? "إجمالي السطر"
                          : "إجمالي السطر"
                      }
                    >
                      <Input
                        readOnly
                        value={money(lineTotal)}
                      />
                    </FormField>

                    <FormField label="كود الدفعة">
                      <Input
                        placeholder="اختياري — يُنشأ تلقائيًا"
                        value={item.batch_code}
                        onChange={(e) =>
                          updateItem(index, {
                            batch_code:
                              e.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField
                      label="تاريخ الاستلام"
                      required
                    >
                      <Input
                        type="date"
                        value={
                          item.received_date
                        }
                        onChange={(e) =>
                          updateItem(index, {
                            received_date:
                              e.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField label="تاريخ الانتهاء">
                      <Input
                        type="date"
                        value={
                          item.expiry_date
                        }
                        onChange={(e) =>
                          updateItem(index, {
                            expiry_date:
                              e.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[var(--border)] p-4">
            <Button
              variant="secondary"
              startIcon={<Plus size={17} />}
              onClick={() =>
                setItems((curr) => [
                  ...curr,
                  emptyItem(),
                ])
              }
            >
              إضافة صنف
            </Button>
          </div>
        </Card>

        {!isConsignment && (
          <>
          {!isEdit ? <FormSection
            title="الدفع الأولي"
            description="يمكن تسجيل دفعة مع إنشاء الفاتورة."
            icon={<Calculator size={18} />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="المبلغ المدفوع">
                <Input
                  type="number"
                  min="0"
                  max={total}
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(
                      Number(e.target.value),
                    )
                  }
                />
              </FormField>

              <FormField label="الصندوق">
                <Select
                  value={String(
                    paymentCashboxId,
                  )}
                  disabled={
                    lookupsLoading ||
                    paymentAmount <= 0
                  }
                  options={[
                    {
                      value: "0",
                      label:
                        paymentAmount <= 0
                          ? "لا توجد دفعة أولية"
                          : lookupsLoading
                            ? "جاري تحميل الصناديق..."
                            : "اختر الصندوق",
                    },

                    ...activeCashboxes.map(
                      (cashbox) => ({
                        value: String(
                          cashbox.id,
                        ),
                        label: `${cashbox.name} — ${Number(
                          cashbox.balance,
                        ).toLocaleString(
                          "en-US",
                        )} ${cashbox.currency}`,
                      }),
                    ),
                  ]}
                  onChange={(e) =>
                    setPaymentCashboxId(
                      Number(
                        e.target.value,
                      ),
                    )
                  }
                />
              </FormField>

              {paymentCashboxId > 0 && activeCashboxes.find((c) => c.id === paymentCashboxId)?.currency !== currency && (
                <FormField label="سعر صرف الدفعة" required>
                  <Input type="number" min="0" step="any" value={paymentExchangeRate} onChange={(e) => setPaymentExchangeRate(e.target.value)} placeholder={`سعر صرف ${activeCashboxes.find((c) => c.id === paymentCashboxId)?.currency} مقابل ${currency}`} />
                </FormField>
              )}

              <FormField label="تاريخ الدفع">
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) =>
                    setPaymentDate(
                      e.target.value,
                    )
                  }
                />
              </FormField>
            </div>
          </FormSection> : <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-secondary)]">الدفعات السابقة تبقى كما هي ولا يتم تعديلها من نموذج الفاتورة.</div>}
          </>
        )}

        <Card
          padding={false}
          header="ملخص المنتجات"
          description="يتحدث تلقائيًا أثناء إدخال أو تعديل أصناف الفاتورة للمراجعة قبل الحفظ."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm" dir="rtl">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-center">#</th>
                  <th className="px-4 py-3 text-center">المنتج</th>
                  <th className="px-4 py-3 text-center">الكمية</th>
                  <th className="px-4 py-3 text-center">{isConsignment ? "سعر التسويق" : "سعر الشراء"}</th>
                  <th className="px-4 py-3 text-center">إجمالي السطر</th>
                  <th className="px-4 py-3 text-center">كود الدفعة</th>
                  <th className="px-4 py-3 text-center">تاريخ الاستلام</th>
                  <th className="px-4 py-3 text-center">تاريخ الانتهاء</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const price = isConsignment ? item.estimated_purchase_price : item.purchase_price;
                  return (
                    <tr key={`purchase-summary-${index}`} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 text-center align-middle">{index + 1}</td>
                      <td className="px-4 py-3 text-center align-middle font-medium">{item.productName || "لم يتم اختيار المنتج"}</td>
                      <td className="px-4 py-3 text-center align-middle" dir="ltr">{money(item.quantity)}</td>
                      <td className="px-4 py-3 text-center align-middle" dir="ltr">{money(price)} {currency}</td>
                      <td className="px-4 py-3 text-center align-middle font-bold" dir="ltr">{money(item.quantity * price)} {currency}</td>
                      <td className="px-4 py-3 text-center align-middle">{item.batch_code || "تلقائي"}</td>
                      <td className="px-4 py-3 text-center align-middle" dir="ltr">{item.received_date || "—"}</td>
                      <td className="px-4 py-3 text-center align-middle" dir="ltr">{item.expiry_date || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-[var(--border-strong)] bg-[var(--surface-subtle)]">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-center align-middle font-bold">إجمالي المنتجات</td>
                  <td className="px-4 py-3 text-center align-middle font-bold" dir="ltr">{money(items.reduce((sum, item) => sum + Number(item.quantity || 0), 0))}</td>
                  <td className="px-4 py-3 text-center align-middle">—</td>
                  <td className="px-4 py-3 text-center align-middle font-bold text-[var(--primary)]" dir="ltr">{money(isConsignment ? estimatedSubtotal : standardSubtotal)} {currency}</td>
                  <td colSpan={3} className="px-4 py-3 text-center align-middle">—</td>
                </tr>
                {transportCost > 0 && (
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={4} className="px-4 py-3 text-center align-middle font-medium">تكلفة النقل — {transportCostBearer === "company" ? "علينا" : "على المورد"}</td>
                    <td className="px-4 py-3 text-center align-middle font-bold" dir="ltr">{transportCostBearer === "supplier" ? "− " : "+ "}{money(transportCost)} {currency}</td>
                    <td colSpan={3} className="px-4 py-3 text-center align-middle">—</td>
                  </tr>
                )}
                {emptyingCost > 0 && (
                  <tr className="border-t border-[var(--border)]">
                    <td colSpan={4} className="px-4 py-3 text-center align-middle font-medium">تكلفة العتالة — {emptyingCostBearer === "company" ? "علينا" : "على المورد"}</td>
                    <td className="px-4 py-3 text-center align-middle font-bold" dir="ltr">{emptyingCostBearer === "supplier" ? "− " : "+ "}{money(emptyingCost)} {currency}</td>
                    <td colSpan={3} className="px-4 py-3 text-center align-middle">—</td>
                  </tr>
                )}
                {(transportCost > 0 || emptyingCost > 0) && (
                  <tr className="border-t-2 border-[var(--border-strong)]">
                    <td colSpan={4} className="px-4 py-3 text-center align-middle text-base font-bold">الإجمالي مع النقل والعتالة</td>
                    <td className="px-4 py-3 text-center align-middle text-base font-bold text-[var(--primary)]" dir="ltr">
                      {money((isConsignment ? estimatedSubtotal : standardSubtotal) + transportCost * (transportCostBearer === "company" ? 1 : -1) + emptyingCost * (emptyingCostBearer === "company" ? 1 : -1))} {currency}
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-center align-middle">—</td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </Card>

        {/* ── Extra Costs (shown for ALL invoice types) ─────────────────── */}
        {(transportCost > 0 || emptyingCost > 0 || true) && (
          <FormSection
            title="تكاليف إضافية"
            description="حدد قيمة كل تكلفة والجهة التي تتحملها؛ علينا تُضاف، وعلى المورد تُخصم."
            icon={<Calculator size={18} />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="تكلفة النقل">
                  <Input id="transportCost" type="number" min="0" step="any" value={transportCost} placeholder="0" onChange={(e) => setTransportCost(Number(e.target.value))} />
                </FormField>
                <FormField label="حساب النقل على">
                  <Select id="transportCostBearer" value={transportCostBearer} options={[{ value: "company", label: "علينا — تُضاف للفاتورة" }, { value: "supplier", label: "على المورد — تُخصم من الفاتورة" }]} onChange={(e) => setTransportCostBearer(e.target.value as "company" | "supplier")} />
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="تكلفة العتالة (عتالة)">
                  <Input id="emptyingCost" type="number" min="0" step="any" value={emptyingCost} placeholder="0" onChange={(e) => setEmptyingCost(Number(e.target.value))} />
                </FormField>
                <FormField label="حساب العتالة على">
                  <Select id="emptyingCostBearer" value={emptyingCostBearer} options={[{ value: "company", label: "علينا — تُضاف للفاتورة" }, { value: "supplier", label: "على المورد — تُخصم من الفاتورة" }]} onChange={(e) => setEmptyingCostBearer(e.target.value as "company" | "supplier")} />
                </FormField>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">التكلفة التي علينا تزيد الإجمالي، والتكلفة التي على المورد تُخصم من إجمالي الفاتورة ولا تُسجّل كمصروف علينا.</p>
          </FormSection>
        )}

        {!isConsignment && (
          <div>
            <Card
              header="ملخص الفاتورة"
              className="h-fit"
            >
              <div className="space-y-3 text-sm">
                {[
                  [
                    "المجموع الفرعي",
                    standardSubtotal,
                  ],
                  ["الخصم", -discount],
                  ...(transportCost > 0 ? [[`تكلفة النقل (${transportCostBearer === "company" ? "علينا" : "على المورد"})`, transportCost * (transportCostBearer === "company" ? 1 : -1)]] : []),
                  ...(emptyingCost > 0 ? [[`تكلفة العتالة (${emptyingCostBearer === "company" ? "علينا" : "على المورد"})`, emptyingCost * (emptyingCostBearer === "company" ? 1 : -1)]] : []),
                  ["المدفوع", paymentAmount],
                  ["المتبقي", remaining],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="flex justify-between"
                  >
                    <span className="text-[var(--text-muted)]">
                      {label}
                    </span>

                    <strong>
                      {money(Number(value))}
                    </strong>
                  </div>
                ))}

                <div className="border-t border-[var(--border)] pt-3">
                  <div className="flex justify-between text-base">
                    <strong>
                      الإجمالي النهائي
                    </strong>

                    <strong className="text-[var(--primary)]">
                      {money(total)} {currency}
                    </strong>
                  </div>

                  {currency !== "SYP" && (
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-[var(--text-muted)]">
                        القيمة بالعملة الأساسية
                      </span>

                      <strong>
                        {money(totalBase)} SYP
                      </strong>
                    </div>
                  )}

                  {currency !== "SYP" && (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      1 {currency} ={" "}
                      {money(exchangeRate)} SYP
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <FormField label="الخصم">
                  <Input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(
                        Number(e.target.value),
                      )
                    }
                  />
                </FormField>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Quick Supplier Dialog ─────────────────────────────────────── */}
      <Dialog
        open={quickSupplierOpen}
        title="إضافة مورد جديد"
        onClose={() => !quickSupplierSaving && setQuickSupplierOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={quickSupplierSaving}
              onClick={() => setQuickSupplierOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              isLoading={quickSupplierSaving}
              loadingText="جاري الإضافة..."
              startIcon={<Save size={16} />}
              onClick={() => void createQuickSupplier()}
            >
              إضافة واختيار المورد
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <FormField label="اسم المورد" required>
            <Input
              autoFocus
              value={quickSupplier.name}
              placeholder="اسم المورد..."
              onChange={(e) =>
                setQuickSupplier((c) => ({ ...c, name: e.target.value }))
              }
            />
          </FormField>
          <FormField label="رقم الهاتف">
            <Input
              dir="ltr"
              value={quickSupplier.phone}
              placeholder="اختياري"
              onChange={(e) =>
                setQuickSupplier((c) => ({ ...c, phone: e.target.value }))
              }
            />
          </FormField>
          <FormField label="ملاحظات">
            <Input
              value={quickSupplier.notes}
              placeholder="اختياري"
              onChange={(e) =>
                setQuickSupplier((c) => ({ ...c, notes: e.target.value }))
              }
            />
          </FormField>
          {quickSupplierError && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-bold text-[var(--danger)]">
              {quickSupplierError}
            </p>
          )}
        </div>
      </Dialog>

      <Dialog
        open={quickProductIndex !== null}
        title="إضافة منتج جديد"
        onClose={() =>
          !quickProductSaving &&
          setQuickProductIndex(null)
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={quickProductSaving}
              onClick={() =>
                setQuickProductIndex(null)
              }
            >
              إلغاء
            </Button>

            <Button
              isLoading={quickProductSaving}
              loadingText="جاري الإضافة..."
              startIcon={<Save size={16} />}
              onClick={() =>
                void createQuickProduct()
              }
            >
              إضافة واختيار المنتج
            </Button>
          </>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="اسم المنتج"
            required
          >
            <Input
              autoFocus
              value={quickProduct.name}
              placeholder="مثال: سكر أبيض 1 كغ"
              onChange={(e) =>
                setQuickProduct((current) => ({
                  ...current,
                  name: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label="كود المنتج">
            <Input
              dir="ltr"
              value={quickProduct.code}
              placeholder="اختياري"
              onChange={(e) =>
                setQuickProduct((current) => ({
                  ...current,
                  code: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField
            label="الوحدة"
            required
          >
            <Input
              value={quickProduct.unit}
              placeholder="كغ، قطعة، عبوة..."
              onChange={(e) =>
                setQuickProduct((current) => ({
                  ...current,
                  unit: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label="التصنيف">
            <Input
              value={quickProduct.category}
              placeholder="اختياري"
              onChange={(e) =>
                setQuickProduct((current) => ({
                  ...current,
                  category:
                    e.target.value,
                }))
              }
            />
          </FormField>

          <FormField
            label="الوصف"
            className="md:col-span-2"
          >
            <Textarea
              value={quickProduct.description}
              placeholder="وصف أو ملاحظات إضافية..."
              onChange={(e) =>
                setQuickProduct((current) => ({
                  ...current,
                  description:
                    e.target.value,
                }))
              }
            />
          </FormField>

          {quickProductError && (
            <p className="md:col-span-2 rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-bold text-[var(--danger)]">
              {quickProductError}
            </p>
          )}
        </div>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-[260px] z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 px-6 py-3 backdrop-blur">
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              navigate(PATHS.PURCHASES)
            }
          >
            إلغاء
          </Button>

          <Button
            startIcon={<Save size={17} />}
            disabled={
              loading || lookupsLoading
            }
            onClick={() => submit()}
          >
            {loading
              ? "جاري الحفظ..."
              : "حفظ الفاتورة"}
          </Button>
        </div>
      </div>
    <InvoiceEditPasswordDialog open={passwordOpen} loading={loading} error={error} onClose={() => setPasswordOpen(false)} onConfirm={async (password) => { if (!pendingInput) return; setLoading(true); setError(""); try { const result = await purchasesService.update(editingId, pendingInput as CreatePurchaseInvoiceInput, password); clearInvoiceDraft(draftKey); setPasswordOpen(false); navigate(`/purchases/${result.invoice.id}`); } catch (err: unknown) { setError(getInvoiceEditErrorMessage(err)); } finally { setLoading(false); } }} />
    </>
  );
}
