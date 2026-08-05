import { useEffect, useState } from "react";
import { Banknote, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, FormSection, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { purchasesService } from "./purchasesService";

export default function PurchasePaymentPage() {
  const navigate = useNavigate();
  const { purchaseId } = useParams();
  const [details, setDetails] = useState<PurchaseInvoiceDetails | null>(null);
  const [cashboxes, setCashboxes] = useState<CashboxApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashboxId, setCashboxId] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const id = Number(purchaseId);
    if (!id) return;
    Promise.all([purchasesService.getDetails(id), purchasesService.getLookups()])
      .then(([data, lookups]) => {
        setDetails(data);
        setCashboxes(lookups.cashboxes);
        const remaining = data.financial_summary.remaining_amount;
        setAmount(remaining);
        if (lookups.cashboxes.length > 0) setCashboxId(lookups.cashboxes[0].id);
      })
      .catch((err: Error) => setError(err.message || "خطأ في التحميل"))
      .finally(() => setLoading(false));
  }, [purchaseId]);

  const remaining = details?.financial_summary.remaining_amount ?? 0;

  const submit = async () => {
    setError("");
    if (amount <= 0) { setError("المبلغ يجب أن يكون موجبًا"); return; }
    if (amount > remaining + 0.001) { setError("المبلغ أكبر من المتبقي"); return; }
    if (!cashboxId) { setError("اختر الصندوق"); return; }

    setSubmitting(true);
    try {
      await purchasesService.recordPayment({
        purchase_invoice_id: Number(purchaseId),
        cashbox_id: cashboxId,
        amount,
        payment_date: date,
        notes: notes || undefined,
      });
      navigate(`/purchases/${purchaseId}`);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "تعذر تسجيل الدفعة");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>;
  if (!details) return null;

  const { invoice } = details;

  return <>
    <PageHeader title="تسجيل دفعة للمورد" description={`إضافة دفعة إلى الفاتورة ${invoice.invoice_number}.`} actions={<BackButton to={`/purchases/${purchaseId}`} />} />
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <FormSection title="بيانات الدفعة" description="أدخل المبلغ والصندوق." icon={<Banknote size={18} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="المبلغ" htmlFor="amount" required error={amount > remaining + 0.001 ? "المبلغ أكبر من المتبقي." : undefined}>
            <Input id="amount" type="number" min="1" max={remaining} value={amount} error={amount > remaining + 0.001} onChange={(e) => setAmount(Number(e.target.value))} />
          </FormField>
          <FormField label="التاريخ" htmlFor="date" required>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="الصندوق" htmlFor="cashbox" required>
            <Select id="cashbox" value={String(cashboxId)} options={[{ value: "0", label: "اختر الصندوق" }, ...cashboxes.map((c) => ({ value: String(c.id), label: `${c.name} — ${Number(c.balance).toLocaleString("en-US")} ${c.currency}` }))]} onChange={(e) => setCashboxId(Number(e.target.value))} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2">
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
        {error && <div className="mt-3 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => navigate(`/purchases/${purchaseId}`)}>إلغاء</Button>
          <Button startIcon={<Save size={17} />} disabled={submitting} onClick={submit}>{submitting ? "جاري الحفظ..." : "حفظ الدفعة"}</Button>
        </div>
      </FormSection>

      <Card header="ملخص الفاتورة" className="h-fit">
        <div className="space-y-3 text-sm">
          {[
            ["رقم الفاتورة", invoice.invoice_number],
            ["المورد", details.supplier?.name ?? "-"],
            ["الإجمالي", details.financial_summary.total_amount.toLocaleString("en-US")],
            ["المدفوع سابقًا", details.financial_summary.paid_amount.toLocaleString("en-US")],
            ["المتبقي", remaining.toLocaleString("en-US")],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between">
              <span className="text-[var(--text-muted)]">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </>;
}
