import {
  AlertCircle,
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
  UserRound,
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

import { PATHS } from "../../routes/path";

import {
  getPaymentStatusLabel,
  getSaleStatusLabel,
} from "../../lib/statusTranslations";

import {
  customersService,
  getCustomerErrorMessage,
  type Customer,
} from "./customersService";

type ActiveTab = "sales" | "payments";

type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "primary"
  | "gray";

type CustomerInvoice = {
  id: number;
  invoice_number: string | null;
  invoice_date: string;
  total: number | string | null;
  paid_amount: number | string | null;
  remaining_amount: number | string | null;
  status: string;
  currency: string | null;
  exchange_rate?: number | string | null;
  amount_base?: number | string | null;
};

type CustomerPayment = {
  id: number;
  party_type?: "customer" | "supplier" | null;
  party_id?: number | null;
  payment_type?: "sale" | "purchase";
  invoice_id?: number | null;
  cashbox_id?: number | null;
  cashbox_name?: string | null;
  amount: number | string | null;
  currency?: string | null;
  exchange_rate?: number | string | null;
  amount_base?: number | string | null;
  payment_date: string;
  payment_method?: string | null;
  reference_number?: string | null;
  status?: string | null;
  notes?: string | null;
  reversal_reason?: string | null;
};

type CustomerStatement = {
  party: unknown;
  invoices: CustomerInvoice[];
  payments: CustomerPayment[];
  balance: number;
  statement_type: "customer";
};

const numberValue = (
  value: number | string | null | undefined,
) => Number(value ?? 0);

const money = (
  value: number | string | null | undefined,
  currency = "SYP",
) => {
  const amount = Math.abs(numberValue(value));

  const formatted = amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

  return `${formatted} ${
    currency === "SYP" ? "ل.س" : currency
  }`;
};

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

  return date.toLocaleDateString("en-GB");
};

function getInvoiceStatusVariant(
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

export default function CustomerDetailsPage() {
  const navigate = useNavigate();

  const { customerId } = useParams();

  const id = Number(customerId);

  const [customer, setCustomer] =
    useState<Customer>();

  const [statement, setStatement] =
    useState<CustomerStatement | null>(null);

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("sales");

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const loadCustomer =
    useCallback(async () => {
      if (
        !Number.isFinite(id) ||
        id <= 0
      ) {
        setLoadError(
          "معرّف العميل غير صالح.",
        );

        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setLoadError("");

        const [
          customerData,
          statementData,
        ] = await Promise.all([
          customersService.get(id),

          window.stockliteApi.printDocuments.customerStatement(
            id,
          ),
        ]);

        setCustomer(customerData);

        setStatement(
          statementData as CustomerStatement,
        );
      } catch (error) {
        setLoadError(
          getCustomerErrorMessage(error),
        );
      } finally {
        setIsLoading(false);
      }
    }, [id]);

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

  const invoices =
    statement?.invoices ?? [];

  const payments =
    statement?.payments ?? [];

  const totals = useMemo(() => {
    const validInvoices =
      invoices.filter(
        (invoice) =>
          invoice.status !==
          "cancelled",
      );

    const activePayments =
      payments.filter(
        (payment) =>
          payment.status !==
          "reversed",
      );

    return {
      sales: invoices.length,

      payments: payments.length,

      totalSales:
        validInvoices.reduce(
          (sum, invoice) =>
            sum +
            numberValue(
              invoice.total,
            ),
          0,
        ),

      totalRemaining:
        validInvoices.reduce(
          (sum, invoice) =>
            sum +
            numberValue(
              invoice.remaining_amount,
            ),
          0,
        ),

      totalPayments:
        activePayments.reduce(
          (sum, payment) =>
            sum +
            numberValue(
              payment.amount,
            ),
          0,
        ),
    };
  }, [invoices, payments]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />

        <p className="text-sm font-medium">
          جاري تحميل بيانات العميل...
        </p>
      </div>
    );
  }

  if (loadError || !customer) {
    return (
      <EmptyState
        icon={
          <AlertCircle size={26} />
        }
        title="تعذر تحميل العميل"
        description={
          loadError ||
          "تعذر العثور على بيانات العميل المطلوبة."
        }
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  PATHS.CUSTOMERS,
                )
              }
            >
              العودة إلى العملاء
            </Button>

            <Button
              startIcon={
                <RefreshCw
                  size={16}
                />
              }
              onClick={() =>
                void loadCustomer()
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
        title={customer.name}
        description="بيانات العميل الأساسية وحالته ورصيده الحالي."
        actions={
          <div className="flex gap-2">
            <BackButton
              to={PATHS.CUSTOMERS}
              label="العودة إلى العملاء"
            />

            <Button
              variant="secondary"
              startIcon={
                <Printer size={17} />
              }
              onClick={() =>
                navigate(
                  `/print/customers/${customer.id}/statement`,
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
                  `/customers/${customer.id}/edit`,
                )
              }
            >
              تعديل
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">
                الرصيد الحالي
              </p>

              <p
                dir="ltr"
                className="mt-2 text-right text-xl font-bold text-[var(--text-primary)]"
              >
                {money(
                  customer.balance,
                  "SYP",
                )}
              </p>

              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {customer.balance >
                0
                  ? "مبلغ مستحق على العميل"
                  : customer.balance <
                      0
                    ? "مبلغ مستحق للعميل"
                    : "الحساب متوازن"}
              </p>
            </div>

            <WalletCards
              size={21}
              className="text-[var(--primary)]"
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">
                حالة العميل
              </p>

              <div className="mt-3">
                <StatusBadge
                  variant={
                    customer.isActive
                      ? "success"
                      : "danger"
                  }
                >
                  {customer.isActive
                    ? "نشط"
                    : "غير نشط"}
                </StatusBadge>
              </div>
            </div>

            <UserRound
              size={21}
              className="text-[var(--text-muted)]"
            />
          </div>
        </Card>
      </div>

      <Card
        header="بيانات العميل"
        description="معلومات التواصل والعنوان والملاحظات."
        className="mt-5"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Phone size={15} />
              <span>رقم الهاتف</span>
            </div>

            <p
              className="mt-2 text-right font-bold"
              dir="ltr"
            >
              {customer.phone ||
                "—"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Mail size={15} />
              <span>
                البريد الإلكتروني
              </span>
            </div>

            <p
              className="mt-2 break-all text-right font-bold"
              dir="ltr"
            >
              {customer.email ||
                "—"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <MapPin size={15} />
              <span>العنوان</span>
            </div>

            <p className="mt-2 break-words font-bold leading-6">
              {customer.address ||
                "—"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 md:col-span-2 xl:col-span-3">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <StickyNote
                size={15}
              />

              <span>ملاحظات</span>
            </div>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">
              {customer.notes ||
                "لا توجد ملاحظات."}
            </p>
          </div>
        </div>
      </Card>

      <Card
        header="الحركات والدفعات"
        description="فواتير البيع والدفعات المرتبطة بالعميل من قاعدة البيانات."
        className="mt-5"
        padding={false}
      >
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
          {(
            [
              [
                "sales",
                "فواتير البيع",
                totals.sales,
                ReceiptText,
              ],

              [
                "payments",
                "الدفعات",
                totals.payments,
                CreditCard,
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
                  {count}
                </span>
              </button>
            ),
          )}
        </div>

        <div className="overflow-x-auto">
          {activeTab ===
            "sales" &&
            (invoices.length ? (
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">
                      رقم الفاتورة
                    </th>

                    <th className="px-4 py-3 text-right">
                      التاريخ
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
                  {invoices.map(
                    (invoice) => (
                      <tr
                        key={
                          invoice.id
                        }
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3 font-bold">
                          {invoice.invoice_number ||
                            `#${invoice.id}`}
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(
                            invoice.invoice_date,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span dir="ltr">
                            {money(
                              invoice.total,
                              invoice.currency ||
                                "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span dir="ltr">
                            {money(
                              invoice.paid_amount,
                              invoice.currency ||
                                "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-bold">
                          <span dir="ltr">
                            {money(
                              invoice.remaining_amount,
                              invoice.currency ||
                                "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            variant={getInvoiceStatusVariant(
                              invoice.status,
                            )}
                          >
                            {getSaleStatusLabel(
                              invoice.status,
                            )}
                          </StatusBadge>
                        </td>

                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={
                              <Eye
                                size={
                                  14
                                }
                              />
                            }
                            onClick={() =>
                              navigate(
                                `/sales/${invoice.id}`,
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
                title="لا توجد فواتير بيع"
                description="لم تُسجل فواتير بيع لهذا العميل بعد."
              />
            ))}

          {activeTab ===
            "payments" &&
            (payments.length ? (
              <table className="w-full min-w-[820px] text-sm">
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
                  {payments.map(
                    (payment) => (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-t border-[var(--border)]"
                      >
                        <td className="px-4 py-3">
                          {formatDate(
                            payment.payment_date,
                          )}
                        </td>

                        <td className="px-4 py-3 font-bold">
                          <span dir="ltr">
                            {money(
                              payment.amount,
                              payment.currency ||
                                "SYP",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {payment.cashbox_name ||
                            "—"}
                        </td>

                        <td className="px-4 py-3">
                          {getPaymentMethodLabel(
                            payment.payment_method,
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {payment.reference_number
                            ? payment.reference_number
                            : payment.invoice_id
                              ? `فاتورة رقم ${payment.invoice_id}`
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
                          <div className="max-w-[260px] whitespace-normal break-words">
                            {payment.status ===
                              "reversed" &&
                            payment.reversal_reason
                              ? `سبب العكس: ${payment.reversal_reason}`
                              : payment.notes ||
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
                description="لم تُسجل دفعات مرتبطة بهذا العميل بعد."
              />
            ))}
        </div>
      </Card>
    </>
  );
}