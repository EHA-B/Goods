import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, Input, NumberInput, PageHeader, Switch, Textarea } from "../../components/ui";
import { useSuppliers } from "./SuppliersContext";

type FormState = { name: string; phone: string; email: string; address: string; balance: number; notes: string; isActive: boolean };
const emptyForm: FormState = { name: "", phone: "", email: "", address: "", balance: 0, notes: "", isActive: true };

export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const id = supplierId ? Number(supplierId) : undefined;
  const { getSupplier, saveSupplier } = useSuppliers();
  const supplier = id ? getSupplier(id) : undefined;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setForm(supplier ? { name: supplier.name, phone: supplier.phone, email: supplier.email, address: supplier.address, balance: supplier.balance, notes: supplier.notes, isActive: supplier.isActive } : emptyForm);
  }, [supplier]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit() {
    const name = form.name.trim();
    if (!name) { setNameError("اسم المورد مطلوب"); return; }
    const saved = saveSupplier({ ...form, name, phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), notes: form.notes.trim() }, id);
    navigate(`/suppliers/${saved.id}`);
  }

  return <>
    <PageHeader title={id ? "تعديل بيانات المورد" : "إضافة مورد جديد"} description="أدخل بيانات المورد الأساسية ومعلومات الحساب." actions={<BackButton to="/suppliers" label="العودة إلى الموردين" />} />
    <Card header="بيانات المورد" description="البيانات الأساسية ومعلومات التواصل والحساب.">
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="اسم المورد" htmlFor="supplier-name" required error={nameError}><Input id="supplier-name" value={form.name} error={Boolean(nameError)} onChange={(e) => { update("name", e.target.value); if (nameError) setNameError(""); }} /></FormField>
        <FormField label="رقم الهاتف" htmlFor="supplier-phone"><Input id="supplier-phone" dir="ltr" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></FormField>
        <FormField label="البريد الإلكتروني" htmlFor="supplier-email"><Input id="supplier-email" dir="ltr" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></FormField>
        <FormField label="العنوان" htmlFor="supplier-address"><Input id="supplier-address" value={form.address} onChange={(e) => update("address", e.target.value)} /></FormField>
        <FormField label="الرصيد الافتتاحي" htmlFor="supplier-balance" hint="الموجب يعني أن للمورد مبلغًا، والسالب يعني وجود دفعة مقدمة لدينا."><NumberInput id="supplier-balance" value={String(form.balance)} suffix="ل.س" onChange={(e) => update("balance", Number(e.target.value))} /></FormField>
        <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-3 self-end">
          <div><p className="text-sm font-bold text-[var(--text-primary)]">المورد نشط</p><p className="mt-1 text-xs text-[var(--text-muted)]">يمكن إيقاف المورد مع الاحتفاظ بسجله وحركاته.</p></div>
          <Switch checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} />
        </div>
        <div className="md:col-span-2"><FormField label="ملاحظات" htmlFor="supplier-notes"><Textarea id="supplier-notes" rows={5} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></FormField></div>
      </div>
    </Card>
    <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4"><Button variant="secondary" onClick={() => navigate("/suppliers")}>إلغاء</Button><Button startIcon={<Save size={17} />} onClick={submit}>حفظ المورد</Button></div>
  </>;
}
