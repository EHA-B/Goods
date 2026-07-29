import { ArrowRight, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, FormField, Input, PageHeader, Switch, Textarea } from "../../components/ui";
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
        actions={<Button variant="secondary" startIcon={<ArrowRight size={17} />} onClick={() => navigate("/customers")}>العودة للعملاء</Button>}
      />
      <Card>
        <div className="mx-auto max-w-4xl space-y-5">
          <FormField label="اسم العميل" htmlFor="customer-name" required error={nameError}>
            <Input id="customer-name" value={form.name} error={Boolean(nameError)} onChange={(e) => { update("name", e.target.value); if (nameError) setNameError(""); }} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="رقم الهاتف" htmlFor="customer-phone"><Input id="customer-phone" dir="ltr" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></FormField>
            <FormField label="العنوان" htmlFor="customer-address"><Input id="customer-address" value={form.address} onChange={(e) => update("address", e.target.value)} /></FormField>
          </div>
          <FormField label="الرصيد الافتتاحي" htmlFor="customer-balance" hint="الموجب يعني أن على العميل مبلغًا، والسالب يعني أن له مبلغًا.">
            <Input id="customer-balance" type="number" step="0.01" dir="ltr" value={form.balance} onChange={(e) => update("balance", Number(e.target.value))} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="customer-notes"><Textarea id="customer-notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} /></FormField>
          <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-3">
            <div><p className="text-sm font-bold text-[var(--text-primary)]">العميل نشط</p><p className="mt-1 text-xs text-[var(--text-muted)]">يمكن إيقاف العميل مع الاحتفاظ بسجله وحركاته.</p></div>
            <Switch checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} />
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-5">
            <Button variant="secondary" onClick={() => navigate("/customers")}>إلغاء</Button>
            <Button startIcon={<Save size={17} />} onClick={submit}>حفظ العميل</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
