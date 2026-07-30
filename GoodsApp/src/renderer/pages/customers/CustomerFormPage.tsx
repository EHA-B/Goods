import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, Input, NumberInput, PageHeader, Switch, Textarea } from "../../components/ui";
import { useCustomers } from "./CustomersContext";

type FormState = { name: string; phone: string; address: string; balance: number; notes: string; isActive: boolean };
const emptyForm: FormState = { name: "", phone: "", address: "", balance: 0, notes: "", isActive: true };

export default function CustomerFormPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const id = customerId ? Number(customerId) : undefined;
  const { getCustomer, saveCustomer } = useCustomers();
  const customer = id ? getCustomer(id) : undefined;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    setForm(customer ? { name: customer.name, phone: customer.phone, address: customer.address, balance: customer.balance, notes: customer.notes, isActive: customer.isActive } : emptyForm);
  }, [customer]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit() {
    const name = form.name.trim();
    if (!name) { setNameError("اسم العميل مطلوب"); return; }
    const saved = saveCustomer({ ...form, name, phone: form.phone.trim(), address: form.address.trim(), notes: form.notes.trim() }, id);
    navigate(`/customers/${saved.id}`);
  }

  return (
    <>
      <PageHeader
        title={id ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
        description="أدخل بيانات العميل الأساسية ومعلومات الحساب."
        actions={<BackButton to="/customers" label="العودة إلى العملاء" />}
      />
      <Card header="بيانات العميل" description="البيانات الأساسية ومعلومات الحساب.">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="اسم العميل" htmlFor="customer-name" required error={nameError}>
            <Input id="customer-name" value={form.name} placeholder="الاسم الكامل للعميل" error={Boolean(nameError)} onChange={(e) => { update("name", e.target.value); if (nameError) setNameError(""); }} />
          </FormField>
          
            <FormField label="رقم الهاتف" htmlFor="customer-phone"><Input id="customer-phone" dir="ltr" value={form.phone} placeholder="09xxxxxxxx" onChange={(e) => update("phone", e.target.value)} /></FormField>
            <FormField label="العنوان" htmlFor="customer-address"><Input id="customer-address" value={form.address} placeholder="المدينة، الحي، الشارع" onChange={(e) => update("address", e.target.value)} /></FormField>
          <FormField label="الرصيد الافتتاحي" htmlFor="customer-balance" hint="الموجب يعني أن على العميل مبلغًا، والسالب يعني أن له مبلغًا.">
            <NumberInput id="customer-balance" value={String(form.balance)} suffix="ل.س" onChange={(e) => update("balance", Number(e.target.value))} />
          </FormField>
          <div className="md:col-span-2"><FormField label="ملاحظات" htmlFor="customer-notes"><Textarea id="customer-notes" rows={5} value={form.notes} placeholder="ملاحظات عن العميل أو شروط التعامل..." onChange={(e) => update("notes", e.target.value)} /></FormField></div>
          <div className="md:col-span-2 flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-3">
            <div><p className="text-sm font-bold text-[var(--text-primary)]">العميل نشط</p><p className="mt-1 text-xs text-[var(--text-muted)]">يمكن إيقاف العميل مع الاحتفاظ بسجله وحركاته.</p></div>
            <Switch checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} />
          </div>

        </div>
      </Card>
      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4"><Button variant="secondary" onClick={() => navigate("/customers")}>إلغاء</Button><Button startIcon={<Save size={17} />} onClick={submit}>حفظ العميل</Button></div>
    </>
  );
}
