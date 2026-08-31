import {
  AlertCircle,
  Boxes,
  CreditCard,
  Eye,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  Printer,
  ReceiptText,
  RefreshCw,
  StickyNote,
  Truck,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  BackButton,
  Button,
  Card,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import {
  getPaymentStatusLabel,
  getPurchaseStatusLabel,
} from "../../lib/statusTranslations";
import { PATHS } from "../../routes/path";
import {
  getSupplierErrorMessage,
  suppliersService,
  type Supplier,
  type SupplierTransactions,
} from "./suppliersService";

type ActivityTab =
  | "purchases"
  | "payments"
  | "batches";

type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "primary"
  | "gray";

const numberValue = (
  value: number | string | null | undefined,
) => Number(value ?? 0);

const money = (
  value: number | string | null | undefined,
  currency = "SYP",
) => {
  const amount = Math.abs(
    numberValue(value),
  );

  const formatted =
    amount.toLocaleString("en-US", {
      maximumFractionDigits: 2,
    });

  return `${formatted} ${
    currency === "SYP" ? "ل.س" : currency
  }`;
};

const quantity = (
  value: number | string | null | undefined,
) =>
  numberValue(value).toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 3,
    },
  );

const formatDate = (
  value?: string | null,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-GB",
  );
};

function getPurchaseStatusVariant(
  status?: string | null,
): BadgeVariant {
  switch (status) {
    case "paid":
      return "success";

    case "cancelled":
      return "danger";

    case "partially_paid":
    case "paid_partially":
      return "warning";

    case "confirmed":
      return "primary";

    case "draft":
    default:
      return "gray";
  }
}

function getPaymentStatusVariant(
  status?: string | null,
): BadgeVariant {
  switch (status) {
    case "active":
    case "completed":
      return "success";

    case "reversed":
    case "cancelled":
      return "danger";

    case "pending":
      return "warning";

    default:
      return "gray";
  }
}

function getPaymentMethodLabel(
  method?: string | null,
) {
  switch (method) {
    case "cash":
      return "نقدي";

    case "bank":
    case "bank_transfer":
      return "تحويل بنكي";

    case "card":
      return "بطاقة";

    case "cheque":
    case "check":
      return "شيك";

    case "credit":
      return "آجل";

    case "":
    case null:
    case undefined:
      return "نقدي";

    default:
      return "أخرى";
  }
}

export default function SupplierDetailsPage() {
  const navigate = useNavigate();

  const { supplierId } = useParams();

  const id = Number(supplierId);

  const [supplier, setSupplier] =
    useState<Supplier>();

  const [
    transactions,
    setTransactions,
  ] = useState<SupplierTransactions>({
    purchases: [],
    payments: [],
    stockBatches: [],
  });

  const [activeTab, setActiveTab] =
    useState<ActivityTab>("purchases");

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const loadSupplier =
    useCallback(async () => {
      if (
        !Number.isFinite(id) ||
        id <= 0
      ) {
        setLoadError(
          "معرّف المورد غير صالح.",
        );

        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError("");

        const [
          supplierData,
          transactionData,
        ] = await Promise.all([
          suppliersService.get(id),
          suppliersService.getTransactions(
            id,
          ),
        ]);

        setSupplier(supplierData);
        setTransactions(
          transactionData,
        );
      } catch (error) {
        setLoadError(
          getSupplierErrorMessage(
            error,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, [id]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  const totals = useMemo(
    () => ({
      purchases:
        transactions.purchases.length,

      payments:
        transactions.payments.length,

      batches:
        transactions.stockBatches.length,
    }),
    [transactions],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />

        <p className="text-sm font-medium">
          جاري تحميل بيانات المورد...
        </p>
      </div>
    );
  }

  if (loadError || !supplier) {
    return (
      <EmptyState
        icon={
          <AlertCircle size={26} />
        }
        title="تعذر تحميل المورد"
        description={
          loadError ||
          "تعذر العثور على بيانات المورد المطلوبة."
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  PATHS.SUPPLIERS,
                )
              }
            >
              العودة إلى الموردين
            </Button>

            <Button
              startIcon={
                <RefreshCw
                  size={16}
                />
              }
              onClick={() =>
                void loadSupplier()
              }
            >
              إعادة المحاولة
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={supplier.name}
        description="بيانات المورد الأساسية وحالته ورصيده الحالي."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BackButton
              to={PATHS.SUPPLIERS}
              label="العودة إلى الموردين"
            />

            <Button
              variant="secondary"
              startIcon={
                <Printer size={17} />
              }
              onClick={() =>
                navigate(
                  `/print/suppliers/${supplier.id}/statement`,
                )
              }
            >
              كشف حساب
            </Button>

            <Button
              variant="secondary"
              startIcon={
                <PencilLine
                  size={17}
                />
              }
              onClick={() =>
                navigate(
                  `/suppliers/${supplier.id}/edit`,
                )
              }
            >
              تعديل
            </Button>

            <Button
              variant="secondary"
              startIcon={
                <CreditCard
                  size={17}
                />
              }
              onClick={() =>
                navigate(
                  `/payments/new?partyType=supplier&partyId=${supplier.id}`,
                )
              }
            >
              سند دفع / قبض
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
  <div className="flex items-start justify-between gap-4">
    <div>
      <p className="text-xs font-bold text-[var(--text-muted)]">
        الرصيد الحالي
      </p>

      <p
        dir="ltr"
        className={`mt-2 text-right text-2xl font-bold ${
          supplier.balance > 0
            ? "text-red-600"
            : "text-green-600"
        }`}
      >
        {money(
          supplier.balance,
          "SYP",
        )}
      </p>

      <p
        className={`mt-1 text-xs font-medium ${
          supplier.balance > 0
            ? "text-red-600"
            : "text-green-600"
        }`}
      >
        {supplier.balance > 0
          ? "مبلغ مستحق للمورد"
          : supplier.balance < 0
            ? "دفعة مقدمة للمورد"
            : "الحساب متوازن"}
      </p>
    </div>

    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
        supplier.balance > 0
          ? "bg-red-50 text-red-600"
          : "bg-green-50 text-green-600"
      }`}
    >
      <WalletCards size={21} />
    </div>
  </div>
</Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)]">
                حالة المورد
              </p>

              <div className="mt-3">
                <StatusBadge
                  variant={
                    supplier.isActive
                      ? "success"
                      : "danger"
                  }
                >
                  {supplier.isActive
                    ? "نشط"
                    : "غير نشط"}
                </StatusBadge>
              </div>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--text-muted)]">
              <Truck size={21} />
            </div>
          </div>
        </Card>
      </div>

      <Card
        header="بيانات المورد"
        description="معلومات التواصل والعنوان والملاحظات."
        className="mt-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
              <Phone size={15} />
              <span>
                رقم الهاتف
              </span>
            </div>

            <p
              dir="ltr"
              className="mt-3 break-all text-right text-sm font-bold text-[var(--text-primary)]"
            >
              {supplier.phone || "—"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
              <Mail size={15} />
              <span>
                البريد الإلكتروني
              </span>
            </div>

            <p
              dir="ltr"
              className="mt-3 break-all text-right text-sm font-bold text-[var(--text-primary)]"
            >
              {supplier.email || "—"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
              <MapPin size={15} />
              <span>
                العنوان
              </span>
            </div>

            <p className="mt-3 break-words text-sm font-bold leading-6 text-[var(--text-primary)]">
              {supplier.address || "—"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
              <StickyNote
                size={15}
              />

              <span>
                ملاحظات
              </span>
            </div>

            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-primary)]">
              {supplier.notes ||
                "لا توجد ملاحظات."}
            </p>
          </div>
        </div>
      </Card>

      <Card
        header="الحركات والدفعات"
        description="فواتير الشراء والدفعات ودفعات المخزون المرتبطة بالمورد من قاعدة البيانات."
        className="mt-5"
        padding={false}
      >
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
          {(
            [
              [
                "purchases",
                "فواتير الشراء",
                totals.purchases,
                ReceiptText,
              ],

              [
                "payments",
                "الدفعات",
                totals.payments,
                CreditCard,
              ],

              [
                "batches",
                "دفعات المخزون",
                totals.batches,
                Boxes,
              ],
            ] as const
          ).map(
            ([
              key,
              label,
              count,
              Icon,
            ]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setActiveTab(key)
                }
                className={[
                  "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors",

                  activeTab === key
                    ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                ].join(" ")}
              >
                <Icon size={15} />

                {label}

                <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">
                  {count.toLocaleString("en-US")}
                </span>
              </button>
            ),
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab ===
            "purchases" &&
            (transactions.purchases
              .length ? (
              <table className="w-full min-w-[880px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">
                      رقم الفاتورة
                    </th>

                    <th className="px-4 py-3 text-right">
                      التاريخ
                    </th>

                    <th className="px-4 py-3 text-right">
                      النوع
                    </th>

                    <th className="px-4 py-3 text-right">
                      الإجمالي
                    </th>

                    <th className="px-4 py-3 text-right">
                      المدفوع
                    </th>

                    <th className="px-4 py-3 text-right">
                      المتبقي
                    </th>

                    <th className="px-4 py-3 text-right">
                      الحالة
                    </th>

                    <th className="px-4 py-3 text-right">
                      الإجراء
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.purchases.map(
                    (purchase) => (
                      <tr
                        key={
                          purchase.id
                        }
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3 font-bold">
                          {purchase.invoiceNumber ||
                            `#${purchase.id}`}
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(
                            purchase.invoiceDate,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={
                              purchase.invoiceType ===
                              "consignment"
                                ? "warning"
                                : "gray"
                            }
                          >
                            {purchase.invoiceType ===
                            "consignment"
                              ? "أمانة"
                              : "عادية"}
                          </StatusBadge>
                        </td>

                        <td className="px-4 py-3">
                          <span dir="ltr">
                            {money(
                              purchase.total,
                              "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span dir="ltr">
                            {money(
                              purchase.paidAmount,
                              "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-bold">
                          <span dir="ltr">
                            {money(
                              purchase.remainingAmount,
                              "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={getPurchaseStatusVariant(
                              purchase.status,
                            )}
                          >
                            {getPurchaseStatusLabel(
                              purchase.status,
                            )}
                          </StatusBadge>
                        </td>

                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={
                              <Eye
                                size={14}
                              />
                            }
                            onClick={() =>
                              navigate(
                                `/purchases/${purchase.id}`,
                              )
                            }
                          >
                            استعراض
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="لا توجد فواتير شراء"
                description="لم تُسجل فواتير شراء لهذا المورد بعد."
              />
            ))}

          {activeTab ===
            "payments" &&
            (transactions.payments
              .length ? (
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">
                      التاريخ
                    </th>

                    <th className="px-4 py-3 text-right">
                      المبلغ
                    </th>

                    <th className="px-4 py-3 text-right">
                      الصندوق
                    </th>

                    <th className="px-4 py-3 text-right">
                      طريقة الدفع
                    </th>

                    <th className="px-4 py-3 text-right">
                      المرجع
                    </th>

                    <th className="px-4 py-3 text-right">
                      الحالة
                    </th>

                    <th className="px-4 py-3 text-right">
                      ملاحظات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.payments.map(
                    (payment) => (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3">
                          {formatDate(
                            payment.paymentDate,
                          )}
                        </td>

                        <td className="px-4 py-3 font-bold">
                          <span dir="ltr">
                            {money(
                              payment.amount,
                              "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {payment.cashboxName ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          {getPaymentMethodLabel(
                            payment.paymentMethod,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {payment.referenceNumber
                            ? payment.referenceNumber
                            : payment.invoiceId
                              ? `فاتورة رقم ${payment.invoiceId}`
                              : "—"}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={getPaymentStatusVariant(
                              payment.status,
                            )}
                          >
                            {getPaymentStatusLabel(
                              payment.status,
                            )}
                          </StatusBadge>
                        </td>

                        <td className="px-4 py-3">
                          <div className="max-w-[260px] whitespace-normal break-words text-sm text-[var(--text-secondary)]">
                            {payment.notes ||
                              "—"}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="لا توجد دفعات"
                description="لم تُسجل دفعات مرتبطة بهذا المورد بعد."
              />
            ))}

          {activeTab ===
            "batches" &&
            (transactions.stockBatches
              .length ? (
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">
                      المنتج
                    </th>

                    <th className="px-4 py-3 text-right">
                      كود الدفعة
                    </th>

                    <th className="px-4 py-3 text-right">
                      الكمية الأصلية
                    </th>

                    <th className="px-4 py-3 text-right">
                      المتبقي
                    </th>

                    <th className="px-4 py-3 text-right">
                      سعر الشراء
                    </th>

                    <th className="px-4 py-3 text-right">
                      الاستلام
                    </th>

                    <th className="px-4 py-3 text-right">
                      الانتهاء
                    </th>

                    <th className="px-4 py-3 text-right">
                      الحالة
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.stockBatches.map(
                    (batch) => (
                      <tr
                        key={
                          batch.id
                        }
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3 font-bold">
                          {batch.productName ||
                            `منتج #${batch.productId}`}
                        </td>

                        <td
                          className="px-4 py-3"
                          dir="ltr"
                        >
                          {batch.batchCode ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          <span dir="ltr">
                            {quantity(
                              batch.quantity,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-bold">
                          <span dir="ltr">
                            {quantity(
                              batch.remainingQuantity,
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span dir="ltr">
                            {money(
                              batch.purchasePrice,
                              "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(
                            batch.receivedDate,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(
                            batch.expiryDate,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={
                              batch.isActive
                                ? "success"
                                : "gray"
                            }
                          >
                            {batch.isActive
                              ? "نشطة"
                              : "غير نشطة"}
                          </StatusBadge>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="لا توجد دفعات مخزون"
                description="لم تُنشأ دفعات مخزون مرتبطة بهذا المورد بعد."
              />
            ))}
        </div>
      </Card>
    </>
  );
}