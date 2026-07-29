import { useState } from "react";
import { Banknote, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { PaymentMethod } from "../../components/purchases/types";
import { BackButton, Button, Card, FormField, FormSection, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { purchasesService } from "./purchasesService";

export default function PurchasePaymentPage() {
  const navigate = useNavigate();
  const { purchaseId } = useParams();
  const purchase = purchasesService.getById(Number(purchaseId));
  const lookups = purchasesService.getLookups();
  const remaining = purchase ? Math.max(0, purchase.total - purchase.paidAmount) : 0;
  const [amount, setAmount] = useState(remaining);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashboxId, setCashboxId] = useState(purchase?.cashboxId ?? 1);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  if (!purchase) return null;
  const submit = () => {
    if (amount <= 0 || amount > remaining) return;
    const cashbox = lookups.cashboxes.find((item) => item.id === cashboxId)!;
    purchasesService.addPayment(purchase.id, { amount, date, method, cashboxName: cashbox.name, referenceNumber: reference, notes });
    navigate(`/purchases/${purchase.id}`);
  };
  return <>
    <PageHeader title="تسجيل دفعة للمورد" description={`إضافة دفعة إلى الفاتورة ${purchase.invoiceNumber}.`} actions={<BackButton to={`/purchases/${purchase.id}`} />} />
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <FormSection title="بيانات الدفعة" description="أدخل المبلغ وطريقة الدفع والصندوق." icon={<Banknote size={18} />}><div className="grid gap-4 md:grid-cols-2"><FormField label="المبلغ" htmlFor="amount" required error={amount > remaining ? "المبلغ أكبر من المتبقي." : undefined}><Input id="amount" type="number" min="1" max={remaining} value={amount} error={amount > remaining} onChange={(event) => setAmount(Number(event.target.value))} /></FormField><FormField label="التاريخ" htmlFor="date" required><Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></FormField><FormField label="الصندوق" htmlFor="cashbox" required><Select id="cashbox" value={String(cashboxId)} options={lookups.cashboxes.map((item) => ({ value: String(item.id), label: item.name }))} onChange={(event) => setCashboxId(Number(event.target.value))} /></FormField><FormField label="طريقة الدفع" htmlFor="method" required><Select id="method" value={method} options={[{ value: "cash", label: "نقدي" }, { value: "bank", label: "تحويل بنكي" }, { value: "credit_card", label: "بطاقة" }, { value: "cheque", label: "شيك" }, { value: "online", label: "دفع إلكتروني" }]} onChange={(event) => setMethod(event.target.value as PaymentMethod)} /></FormField><FormField label="رقم المرجع" htmlFor="reference"><Input id="reference" value={reference} onChange={(event) => setReference(event.target.value)} /></FormField><FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2"><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} /></FormField></div><div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => navigate(`/purchases/${purchase.id}`)}>إلغاء</Button><Button startIcon={<Save size={17} />} onClick={submit}>حفظ الدفعة</Button></div></FormSection>
      <Card header="ملخص الفاتورة" className="h-fit"><div className="space-y-3 text-sm">{[["رقم الفاتورة", purchase.invoiceNumber], ["المورد", purchase.supplierName], ["الإجمالي", purchase.total.toLocaleString("en-US")], ["المدفوع سابقًا", purchase.paidAmount.toLocaleString("en-US")], ["المتبقي", remaining.toLocaleString("en-US")]].map(([label, value]) => <div key={String(label)} className="flex justify-between"><span className="text-[var(--text-muted)]">{label}</span><strong>{value}</strong></div>)}</div></Card>
    </div>
  </>;
}
