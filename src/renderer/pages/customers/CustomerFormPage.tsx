import { notifyError, notifySuccess } from "../../lib/notifications";
import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, Input, LoadingSpinner, NumberInput, PageHeader, Switch, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { customersService, getCustomerErrorMessage, type CustomerInput } from "./customersService";

type FormState = { name: string; phone: string; email: string; address: string; balance: string; notes: string; isActive: boolean };
const emptyForm: FormState = { name: "", phone: "", email: "", address: "", balance: "0", notes: "", isActive: true };

export default function CustomerFormPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const id = customerId ? Number(customerId) : undefined;
  const isEditing = Number.isFinite(id);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(Boolean(isEditing));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing || !id) return;
    let cancelled = false;
    async function loadCustomer() {
      try {
        setIsLoading(true);
        const customer = await customersService.get(id as number);
        if (!cancelled) setForm({ name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, balance: String(customer.balance), notes: customer.notes, isActive: customer.isActive });
      } catch (loadError) {
        if (!cancelled) setError(getCustomerErrorMessage(loadError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadCustomer();
    return () => { cancelled = true; };
  }, [id, isEditing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); setError(""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return setError("اسم العميل مطلوب.");
    const balance = Number(form.balance || 0);
    if (!Number.isFinite(balance)) return setError("الرصيد الافتتاحي غير صالح.");
    const input: CustomerInput = { name: form.name, phone: form.phone, email: form.email, address: form.address, balance, notes: form.notes, isActive: form.isActive };
    try {
      setIsSaving(true);
      const customer = isEditing && id ? await customersService.update(id, input) : await customersService.create(input);
      notifySuccess(isEditing ? "تم تعديل بيانات العميل بنجاح" : "تمت إضافة العميل بنجاح");
      navigate(`/customers/${customer.id}`);
    } catch (saveError) {
      const message = getCustomerErrorMessage(saveError);
      setError(message);
      notifyError(message);
    } finally { setIsSaving(false); }
  }

  if (isLoading) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]"><LoadingSpinner size="lg" /><p className="text-sm font-medium">جاري تحميل بيانات العميل...</p></div>;

  return <form onSubmit={submit} className="space-y-6">
    <PageHeader title={isEditing ? "تعديل بيانات العميل" : "إضافة عميل جديد"} description="أدخل بيانات العميل الأساسية ومعلومات الحساب." actions={<BackButton to={PATHS.CUSTOMERS} label="العودة إلى العملاء" />} />
    <Card header="بيانات العميل" description="البيانات الأساسية ومعلومات التواصل والحساب.">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="اسم العميل" htmlFor="customer-name" required><Input id="customer-name" value={form.name} placeholder="الاسم الكامل للعميل" onChange={(e) => update("name", e.target.value)} /></FormField>
        <FormField label="رقم الهاتف" htmlFor="customer-phone"><Input id="customer-phone" dir="ltr" value={form.phone} placeholder="09xxxxxxxx" onChange={(e) => update("phone", e.target.value)} /></FormField>
        <FormField label="البريد الإلكتروني" htmlFor="customer-email"><Input id="customer-email" dir="ltr" type="email" value={form.email} placeholder="customer@example.com" onChange={(e) => update("email", e.target.value)} /></FormField>
        <FormField label="العنوان" htmlFor="customer-address"><Input id="customer-address" value={form.address} placeholder="المدينة، الحي، الشارع" onChange={(e) => update("address", e.target.value)} /></FormField>
        <FormField label="الرصيد الافتتاحي" htmlFor="customer-balance" hint="الموجب يعني أن على العميل مبلغًا، والسالب يعني أن له مبلغًا."><NumberInput id="customer-balance" value={form.balance} suffix="ل.س" onChange={(e) => update("balance", e.target.value)} /></FormField>
        <div className="flex items-center justify-between self-end rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-3"><div><p className="text-sm font-bold text-[var(--text-primary)]">العميل نشط</p><p className="mt-1 text-xs text-[var(--text-muted)]">يمكن إيقاف العميل مع الاحتفاظ بسجله.</p></div><Switch checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} /></div>
        <div className="md:col-span-2"><FormField label="ملاحظات" htmlFor="customer-notes"><Textarea id="customer-notes" rows={5} value={form.notes} placeholder="ملاحظات عن العميل أو شروط التعامل..." onChange={(e) => update("notes", e.target.value)} /></FormField></div>
        {error && <p className="md:col-span-2 rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-medium text-[var(--danger)]">{error}</p>}
      </div>
    </Card>
    <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4"><Button variant="secondary" disabled={isSaving} onClick={() => navigate(PATHS.CUSTOMERS)}>إلغاء</Button><Button type="submit" isLoading={isSaving} loadingText="جاري الحفظ..." startIcon={<Save size={17} />}>حفظ العميل</Button></div>
  </form>;
}
