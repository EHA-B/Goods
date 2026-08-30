import { notifyValidation } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { Banknote, Save } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BackButton, Button, FormField, FormSection, Input, PageHeader, SearchableSelect, Select, Textarea } from "../../components/ui";

export default function PaymentFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPartyType = searchParams.get("partyType") || "customer";
  const initialPartyId = searchParams.get("partyId") ? Number(searchParams.get("partyId")) : 0;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [cashboxes, setCashboxes] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [partyType, setPartyType] = useState<"customer" | "supplier">(initialPartyType as any);
  const [partyId, setPartyId] = useState<number>(initialPartyId);
  const [paymentType, setPaymentType] = useState<"receipt" | "payment">("receipt");
  
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashboxId, setCashboxId] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      window.stockliteApi.cashboxes.list(),
      window.stockliteApi.customers.list(),
      window.stockliteApi.suppliers.list()
    ]).then(([cbRes, cuRes, suRes]) => {
      const activeCashboxes = cbRes.filter((item: any) => Boolean(item.isActive));
      setCashboxes(activeCashboxes);
      if (activeCashboxes.length > 0) setCashboxId(activeCashboxes[0].id);
      
      setCustomers(cuRes);
      setSuppliers(suRes);
    }).catch(err => {
      setError(getArabicErrorMessage(err, "خطأ في التحميل"));
    }).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    setError("");
    if (!partyId) { setError("اختر الحساب"); notifyValidation("اختر الحساب"); return; }
    if (amount <= 0) { setError("المبلغ يجب أن يكون موجبًا"); notifyValidation("المبلغ يجب أن يكون موجبًا"); return; }
    if (!cashboxId) { setError("اختر الصندوق"); notifyValidation("اختر الصندوق"); return; }

    setSubmitting(true);
    try {
      const payload = {
        party_type: partyType,
        party_id: partyId,
        cashbox_id: cashboxId,
        amount,
        payment_date: date,
        notes: notes || undefined,
      };

      if (paymentType === "receipt") {
        await window.stockliteApi.payments.recordGeneralReceipt(payload);
      } else {
        await window.stockliteApi.payments.recordGeneralPayment(payload);
      }
      
      // Go back to the party's details page if we came from there, otherwise to general payments
      if (initialPartyId) {
        navigate(`/${partyType}s/${partyId}`);
      } else {
        navigate('/payments');
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(getArabicErrorMessage(e, "تعذر تسجيل الدفعة"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>;

  const partyOptions = partyType === "customer" 
    ? customers.map(c => ({ value: String(c.id), label: c.name }))
    : suppliers.map(s => ({ value: String(s.id), label: s.name }));

  return <>
    <PageHeader 
      title={paymentType === "receipt" ? "سند قبض عام" : "سند دفع عام"} 
      description="تسجيل دفعة من/إلى عميل أو مورد." 
      actions={<BackButton to={initialPartyId ? `/${partyType}s/${partyId}` : '/payments'} />} 
    />
    <div className="grid gap-5 xl:grid-cols-1">
      <FormSection title="بيانات الدفعة" description="أدخل المبلغ وطريقة الدفع والصندوق." icon={<Banknote size={18} />}>
        <div className="grid gap-4 md:grid-cols-2">
          
          <FormField label="نوع السند" htmlFor="paymentType" required>
            <Select id="paymentType" value={paymentType} options={[
              { value: "receipt", label: "سند قبض (استلام دفعة)" },
              { value: "payment", label: "سند دفع (تسديد دفعة)" }
            ]} onChange={(e) => setPaymentType(e.target.value as "receipt" | "payment")} />
          </FormField>

          <FormField label="نوع الحساب" htmlFor="partyType" required>
            <Select id="partyType" value={partyType} options={[
              { value: "customer", label: "عميل" },
              { value: "supplier", label: "مورد" }
            ]} onChange={(e) => {
              setPartyType(e.target.value as "customer" | "supplier");
              setPartyId(0);
            }} disabled={!!initialPartyId} />
          </FormField>
          
          <FormField label="الحساب" htmlFor="partyId" required>
            <SearchableSelect
              id="partyId"
              value={partyId ? String(partyId) : ""}
              options={partyOptions}
              onValueChange={(value) => setPartyId(Number(value))}
              placeholder="اختر الحساب"
              searchPlaceholder={partyType === "customer" ? "ابحث باسم العميل..." : "ابحث باسم المورد..."}
              emptyMessage={partyType === "customer" ? "لا يوجد عميل بهذا الاسم" : "لا يوجد مورد بهذا الاسم"}
              disabled={!!initialPartyId}
            />
          </FormField>
          
          <FormField label="المبلغ" htmlFor="amount" required>
            <Input id="amount" type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </FormField>

          <FormField label="التاريخ" htmlFor="date" required>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>

          <FormField label="الصندوق" htmlFor="cashbox" required>
            <Select id="cashbox" value={String(cashboxId)} options={[{ value: "0", label: "اختر الصندوق" }, ...cashboxes.map((c) => ({ value: String(c.id), label: `${c.name} — ${Number(c.balance ?? 0).toLocaleString("en-US")} ${c.currency}` }))]} onChange={(e) => setCashboxId(Number(e.target.value))} />
          </FormField>

          <FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>

        </div>
        {error && <div className="mt-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>إلغاء</Button>
          <Button startIcon={<Save size={17} />} disabled={submitting} onClick={submit}>{submitting ? "جاري الحفظ..." : "حفظ الدفعة"}</Button>
        </div>
      </FormSection>
    </div>
  </>;
}
