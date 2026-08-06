import {
  AlertCircle,
  Boxes,
  CreditCard,
  Eye,
  PencilLine, Printer,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
  getSupplierErrorMessage,
  suppliersService,
  type Supplier,
  type SupplierTransactions,
} from "./suppliersService";

const money = (value: number) =>
  Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

const formatDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB");
};

type ActivityTab = "purchases" | "payments" | "batches";

export default function SupplierDetailsPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const id = Number(supplierId);
  const [supplier, setSupplier] = useState<Supplier>();
  const [transactions, setTransactions] = useState<SupplierTransactions>({
    purchases: [],
    payments: [],
    stockBatches: [],
  });
  const [activeTab, setActiveTab] = useState<ActivityTab>("purchases");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadSupplier = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setLoadError("معرّف المورد غير صالح.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError("");
      const [supplierData, transactionData] = await Promise.all([
        suppliersService.get(id),
        suppliersService.getTransactions(id),
      ]);
      setSupplier(supplierData);
      setTransactions(transactionData);
    } catch (error) {
      setLoadError(getSupplierErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  const totals = useMemo(
    () => ({
      purchases: transactions.purchases.length,
      payments: transactions.payments.length,
      batches: transactions.stockBatches.length,
    }),
    [transactions],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium">جاري تحميل بيانات المورد...</p>
      </div>
    );
  }

  if (loadError || !supplier) {
    return (
      <EmptyState
        icon={<AlertCircle size={26} />}
        title="تعذر تحميل المورد"
        description={loadError || "تعذر العثور على بيانات المورد المطلوبة."}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(PATHS.SUPPLIERS)}>
              العودة إلى الموردين
            </Button>
            <Button startIcon={<RefreshCw size={16} />} onClick={() => void loadSupplier()}>
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
        description="بيانات المورد وفواتير الشراء والمدفوعات ودفعات المخزون المرتبطة به."
        actions={
          <div className="flex gap-2">
            <BackButton to={PATHS.SUPPLIERS} label="العودة إلى الموردين" />
            <Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/print/suppliers/${supplier.id}/statement`)}>كشف حساب</Button>
            <Button
              variant="secondary"
              startIcon={<PencilLine size={17} />}
              onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
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
              <p className="text-xs text-[var(--text-muted)]">الرصيد الحالي</p>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                {money(supplier.balance)} ل.س
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {supplier.balance > 0
                  ? "مبلغ مستحق للمورد"
                  : supplier.balance < 0
                    ? "دفعة مقدمة للمورد"
                    : "الحساب متوازن"}
              </p>
            </div>
            <WalletCards size={21} className="text-[var(--primary)]" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)]">حالة المورد</p>
              <div className="mt-3">
                <StatusBadge variant={supplier.isActive ? "success" : "danger"}>
                  {supplier.isActive ? "نشط" : "غير نشط"}
                </StatusBadge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card
        header="بيانات المورد"
        description="معلومات التواصل والعنوان والملاحظات."
        className="mt-5"
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">رقم الهاتف</p>
            <p className="mt-2 font-bold" dir="ltr">{supplier.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">البريد الإلكتروني</p>
            <p className="mt-2 font-bold" dir="ltr">{supplier.email || "—"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-[var(--text-muted)]">العنوان</p>
            <p className="mt-2 font-bold">{supplier.address || "—"}</p>
          </div>
          <div className="md:col-span-2 xl:col-span-4">
            <p className="text-xs text-[var(--text-muted)]">ملاحظات</p>
            <p className="mt-2 text-sm leading-7">{supplier.notes || "لا توجد ملاحظات."}</p>
          </div>
        </div>
      </Card>

      <Card
        header="الحركات والدفعات"
        description="جميع البيانات المرتبطة بالمورد من قاعدة البيانات."
        className="mt-5"
        padding={false}
      >
        <div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4">
          {([
            ["purchases", "فواتير الشراء", totals.purchases, ReceiptText],
            ["payments", "الدفعات", totals.payments, CreditCard],
            ["batches", "دفعات المخزون", totals.batches, Boxes],
          ] as const).map(([key, label, count, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={[
                "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors",
                activeTab === key
                  ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
              ].join(" ")}
            >
              <Icon size={15} />
              {label}
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{count}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          {activeTab === "purchases" && (
            transactions.purchases.length ? (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">رقم الفاتورة</th>
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-right">النوع</th>
                    <th className="px-4 py-3 text-right">الإجمالي</th>
                    <th className="px-4 py-3 text-right">المدفوع</th>
                    <th className="px-4 py-3 text-right">المتبقي</th>
                    <th className="px-4 py-3 text-right">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 font-bold">{purchase.invoiceNumber}</td>
                      <td className="px-4 py-3">{formatDate(purchase.invoiceDate)}</td>
                      <td className="px-4 py-3">{purchase.invoiceType === "consignment" ? "أمانة" : "عادية"}</td>
                      <td className="px-4 py-3">{money(purchase.total)}</td>
                      <td className="px-4 py-3">{money(purchase.paidAmount)}</td>
                      <td className="px-4 py-3">{money(purchase.remainingAmount)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="secondary" startIcon={<Eye size={14} />} onClick={() => navigate(`/purchases/${purchase.id}`)}>
                          استعراض
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="لا توجد فواتير شراء" description="لم تُسجل فواتير شراء لهذا المورد بعد." />
          )}

          {activeTab === "payments" && (
            transactions.payments.length ? (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">التاريخ</th>
                    <th className="px-4 py-3 text-right">المبلغ</th>
                    <th className="px-4 py-3 text-right">الصندوق</th>
                    <th className="px-4 py-3 text-right">الطريقة</th>
                    <th className="px-4 py-3 text-right">المرجع</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.payments.map((payment) => (
                    <tr key={payment.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-3 font-bold">{money(payment.amount)}</td>
                      <td className="px-4 py-3">{payment.cashboxName || "—"}</td>
                      <td className="px-4 py-3">{payment.paymentMethod || "نقدي"}</td>
                      <td className="px-4 py-3">{payment.referenceNumber || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={payment.status === "reversed" ? "danger" : "success"}>
                          {payment.status === "reversed" ? "معكوسة" : "فعالة"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="لا توجد دفعات" description="لم تُسجل دفعات مرتبطة بهذا المورد بعد." />
          )}

          {activeTab === "batches" && (
            transactions.stockBatches.length ? (
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">المنتج</th>
                    <th className="px-4 py-3 text-right">كود الدفعة</th>
                    <th className="px-4 py-3 text-right">الكمية الأصلية</th>
                    <th className="px-4 py-3 text-right">المتبقي</th>
                    <th className="px-4 py-3 text-right">سعر الشراء</th>
                    <th className="px-4 py-3 text-right">الاستلام</th>
                    <th className="px-4 py-3 text-right">الانتهاء</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.stockBatches.map((batch) => (
                    <tr key={batch.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3 font-bold">{batch.productName || `منتج #${batch.productId}`}</td>
                      <td className="px-4 py-3" dir="ltr">{batch.batchCode || "—"}</td>
                      <td className="px-4 py-3">{money(batch.quantity)}</td>
                      <td className="px-4 py-3">{money(batch.remainingQuantity)}</td>
                      <td className="px-4 py-3">{money(batch.purchasePrice)}</td>
                      <td className="px-4 py-3">{formatDate(batch.receivedDate)}</td>
                      <td className="px-4 py-3">{formatDate(batch.expiryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="لا توجد دفعات مخزون" description="لم تُنشأ دفعات مخزون مرتبطة بهذا المورد بعد." />
          )}
        </div>
      </Card>
    </>
  );
}
