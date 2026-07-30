import { useState } from "react";
import { Banknote, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { PaymentMethod } from "../../components/sales/types";
import { BackButton, Button, Card, FormField, FormSection, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { salesService } from "./salesService";

export default function SalePaymentPage() {
  const navigate = useNavigate();
  const { saleId } = useParams();
  const sale = salesService.getById(Number(saleId));
  const lookups = salesService.getLookups();
  const remaining = sale ? Math.max(0, sale.total - sale.paidAmount) : 0;
  const [amount, setAmount] = useState(remaining);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashboxId, setCashboxId] = useState(sale?.cashboxId ?? 1);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  if (!sale) return null;
  const submit = () => {
    if (amount <= 0 || amount > remaining) return;
    const cashbox = lookups.cashboxes.find((item) => item.id === cashboxId)!;
    salesService.addPayment(sale.id, { amount, date, method, cashboxName: cashbox.name, referenceNumber: reference, notes });
    navigate(`/sales/${sale.id}`);
  };
  return <>
    <PageHeader title="تسجيل دفعة" description={`إضافة دفعة إلى الفاتورة ${sale.invoiceNumber}.`} actions={<BackButton to={`/sales/${sale.id}`} />} />
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <FormSection title="بيانات الدفعة" description="أدخل المبلغ وطريقة الدفع والصندوق." icon={<Banknote size={18} />}>
        <div className="grid gap-4 md:grid-cols-2"><FormField label="المبلغ" htmlFor="amount" required error={amount > remaining ? "المبلغ أكبر من المتبقي." : undefined}><Input id="amount" type="number" min="1" max={remaining} value={amount} error={amount > remaining} onChange={(e) => setAmount(Number(e.target.value))} /></FormField><FormField label="التاريخ" htmlFor="date" required><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField><FormField label="الصندوق" htmlFor="cashbox" required><Select id="cashbox" value={String(cashboxId)} options={lookups.cashboxes.map((item) => ({ value: String(item.id), label: item.name }))} onChange={(e) => setCashboxId(Number(e.target.value))} /></FormField><FormField label="طريقة الدفع" htmlFor="method" required><Select id="method" value={method} options={[{ value: "cash", label: "نقدي" }, { value: "bank", label: "تحويل بنكي" }, { value: "credit_card", label: "بطاقة" }, { value: "cheque", label: "شيك" }, { value: "online", label: "دفع إلكتروني" }]} onChange={(e) => setMethod(e.target.value as PaymentMethod)} /></FormField><FormField label="رقم المرجع" htmlFor="reference"><Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} /></FormField><FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2"><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField></div>
        <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => navigate(`/sales/${sale.id}`)}>إلغاء</Button><Button startIcon={<Save size={17} />} onClick={submit}>حفظ الدفعة</Button></div>
      </FormSection>
      <Card header="ملخص الفاتورة" className="h-fit"><div className="space-y-3 text-sm">{[["رقم الفاتورة", sale.invoiceNumber], ["العميل", sale.customerName], ["الإجمالي", sale.total.toLocaleString("en-US")], ["المدفوع سابقًا", sale.paidAmount.toLocaleString("en-US")], ["المتبقي", remaining.toLocaleString("en-US")]].map(([label, value]) => <div key={String(label)} className="flex justify-between"><span className="text-[var(--text-muted)]">{label}</span><strong>{value}</strong></div>)}</div></Card>
    </div>
  </>;
}
