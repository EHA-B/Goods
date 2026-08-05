import { AlertCircle, PencilLine, Printer, RefreshCw, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, EmptyState, LoadingSpinner, PageHeader, StatusBadge } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { customersService, getCustomerErrorMessage, type Customer } from "./customersService";

const money = (value: number) => Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function CustomerDetailsPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const id = Number(customerId);
  const [customer, setCustomer] = useState<Customer>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadCustomer = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setLoadError("معرّف العميل غير صالح.");
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setLoadError("");
      setCustomer(await customersService.get(id));
    } catch (error) {
      setLoadError(getCustomerErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadCustomer(); }, [loadCustomer]);

  if (isLoading) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]"><LoadingSpinner size="lg" /><p className="text-sm font-medium">جاري تحميل بيانات العميل...</p></div>;

  if (loadError || !customer) return <EmptyState icon={<AlertCircle size={26} />} title="تعذر تحميل العميل" description={loadError || "تعذر العثور على بيانات العميل المطلوبة."} action={<div className="flex gap-2"><Button variant="secondary" onClick={() => navigate(PATHS.CUSTOMERS)}>العودة إلى العملاء</Button><Button startIcon={<RefreshCw size={16} />} onClick={() => void loadCustomer()}>إعادة المحاولة</Button></div>} />;

  return <>
    <PageHeader title={customer.name} description="بيانات العميل الأساسية وحالته ورصيده الحالي." actions={<div className="flex gap-2"><BackButton to={PATHS.CUSTOMERS} label="العودة إلى العملاء" /><Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/print/customers/${customer.id}/statement`)}>كشف حساب</Button><Button variant="secondary" startIcon={<PencilLine size={17} />} onClick={() => navigate(`/customers/${customer.id}/edit`)}>تعديل</Button></div>} />
    <div className="grid gap-4 md:grid-cols-2">
      <Card><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--text-muted)]">الرصيد الحالي</p><p className="mt-2 text-xl font-bold text-[var(--text-primary)]">{money(customer.balance)} ل.س</p><p className="mt-1 text-xs text-[var(--text-muted)]">{customer.balance > 0 ? "مبلغ مستحق على العميل" : customer.balance < 0 ? "مبلغ مستحق للعميل" : "الحساب متوازن"}</p></div><WalletCards size={21} className="text-[var(--primary)]" /></div></Card>
      <Card><p className="text-xs text-[var(--text-muted)]">حالة العميل</p><div className="mt-3"><StatusBadge variant={customer.isActive ? "success" : "danger"}>{customer.isActive ? "نشط" : "غير نشط"}</StatusBadge></div></Card>
    </div>
    <Card header="بيانات العميل" description="معلومات التواصل والعنوان والملاحظات." className="mt-5">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs text-[var(--text-muted)]">رقم الهاتف</p><p className="mt-2 font-bold" dir="ltr">{customer.phone || "—"}</p></div>
        <div><p className="text-xs text-[var(--text-muted)]">البريد الإلكتروني</p><p className="mt-2 font-bold" dir="ltr">{customer.email || "—"}</p></div>
        <div className="md:col-span-2"><p className="text-xs text-[var(--text-muted)]">العنوان</p><p className="mt-2 font-bold">{customer.address || "—"}</p></div>
        <div className="md:col-span-2 xl:col-span-4"><p className="text-xs text-[var(--text-muted)]">ملاحظات</p><p className="mt-2 text-sm leading-7">{customer.notes || "لا توجد ملاحظات."}</p></div>
      </div>
    </Card>
    <Card header="الحركات والمدفوعات" description="ستظهر فواتير البيع والمدفوعات المرتبطة بالعميل هنا بعد ربط وحدات المبيعات والمدفوعات." className="mt-5">
      <EmptyState title="لا توجد بيانات مرتبطة معروضة حاليًا" description="تم ربط بيانات العميل الأساسية فقط. سنربط الحركات والمدفوعات من مصادرها الحقيقية لاحقًا بدون بيانات وهمية." />
    </Card>
  </>;
}
