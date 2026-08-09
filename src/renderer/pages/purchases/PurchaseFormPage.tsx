import { notifyValidation } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useMemo, useState } from "react";
import { Calculator, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BackButton,
  Button,
  Card,
  Dialog,
  FormField,
  FormSection,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";
import {
  getProductErrorMessage,
  productsService,
} from "../products/productsService";

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
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<PurchaseItemForm[]>([
    emptyItem(),
  ]);

  const [paymentAmount, setPaymentAmount] = useState(0);
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
   */
  const total = Math.max(
    0,
    isConsignment ? estimatedSubtotal : standardSubtotal - discount,
  );

  /**
   * المتبقي = الإجمالي - الدفعة الأولية (للعادية) أو صفر (للأمانة عند الإنشاء).
   */
  const remaining = Math.max(
    0,
    total - paymentAmount,
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

  const changeInvoiceType = (
    nextType: "standard" | "consignment",
  ) => {
    setInvoiceType(nextType);
    setError("");

    if (nextType === "consignment") {
      /**
       * الأمانة حاليًا SYP فقط.
       */
      setCurrency("SYP");
      setExchangeRate(1);

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
         * الأمانة تبقى SYP حاليًا.
         */
        currency: isConsignment
          ? "SYP"
          : currency,

        exchange_rate: isConsignment
          ? 1
          : currency === "SYP"
            ? 1
            : exchangeRate,
      };

    setLoading(true);

    try {
      const result =
        await purchasesService.createFull(input);

      if (!result?.invoice?.id) {
        throw new Error(
          "لم يرجع الباك رقم الفاتورة المنشأة",
        );
      }

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
        title="فاتورة شراء جديدة"
        description={
          isConsignment
            ? "استلام بضاعة أمانة من المورد. سعر الشراء المتوقع تقديري فقط ولا يمثل مبلغًا مستحقًا."
            : "أدخل بيانات المورد والأصناف ودفعات المخزون والمبالغ المالية."
        }
        actions={
          <BackButton to={PATHS.PURCHASES} />
        }
      />

      <div className="space-y-5 pb-24">
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
              <Select
                id="supplier"
                value={String(supplierId)}
                disabled={lookupsLoading}
                options={[
                  {
                    value: "0",
                    label: lookupsLoading
                      ? "جاري تحميل الموردين..."
                      : "اختر المورد",
                  },
                  ...(lookups?.suppliers ?? []).map(
                    (supplier) => ({
                      value: String(supplier.id),
                      label: supplier.name,
                    }),
                  ),
                ]}
                onChange={(e) =>
                  setSupplierId(
                    Number(e.target.value),
                  )
                }
              />
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
                disabled={isConsignment}
                options={
                  isConsignment
                    ? [
                        {
                          value: "SYP",
                          label:
                            "ل.س (SYP) — الأمانة",
                        },
                      ]
                    : [
                        {
                          value: "SYP",
                          label: "ل.س (SYP)",
                        },
                        {
                          value: "USD",
                          label: "دولار (USD)",
                        },
                      ]
                }
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

            {currency !== "SYP" &&
              !isConsignment && (
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
                          <Select
                            value={String(
                              item.product_id,
                            )}
                            disabled={
                              lookupsLoading
                            }
                            options={[
                              {
                                value: "0",
                                label:
                                  lookupsLoading
                                    ? "جاري تحميل المنتجات..."
                                    : "اختر المنتج",
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
                                }),
                              ),
                            ]}
                            onChange={(e) =>
                              selectProduct(
                                index,
                                Number(
                                  e.target
                                    .value,
                                ),
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
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <FormSection
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
            </FormSection>

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
    </>
  );
}
