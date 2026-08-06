import { notifyError, notifySuccess, notifyValidation } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import type { TransactionCategory } from "../../components/transactions/types";
import { transactionsService } from "./transactionsService";

const money = (value: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
type CashboxLite = { id: number; name: string; balance: number; isActive: number | boolean };

export default function TransactionFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [direction, setDirection] = useState<"income" | "expense">((params.get("type") === "income" ? "income" : "expense"));
  const [boxId, setBoxId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [boxes, setBoxes] = useState<CashboxLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const [cashboxes, categories] = await Promise.all([
          transactionsService.loadCashboxes(),
          transactionsService.loadCategories()
        ]);
        const activeBoxes = cashboxes.filter((item: any) => item.isActive === true || item.isActive === 1);
        setBoxes(activeBoxes);
        setCategories(categories);
        
        if (activeBoxes[0]) {
          setBoxId(String(activeBoxes[0].id));
        }
      } catch (loadError) {
        setError(getArabicErrorMessage(loadError, "تعذر تحميل بيانات المعاملة."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const availableCategories = categories.filter((item) => item.type === direction && item.isActive);
  const selected = boxes.find((item) => item.id === Number(boxId));
  const selectedCurrency = "ل.س";
  const displayAmount = useMemo(() => money(amount), [amount]);

  const expectedBalance = useMemo(() => {
    if (!selected) return 0;
    return direction === "income" ? selected.balance + amount : selected.balance - amount;
  }, [selected, direction, amount]);

  async function save() {
    const nextErrors: Record<string, string> = {};
    if (!boxId) nextErrors.boxId = "اختر الصندوق.";
    if (!categoryId) nextErrors.categoryId = "اختر الفئة.";
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = "أدخل مبلغًا أكبر من صفر.";
    
    if (selected && direction === "expense" && amount > selected.balance) {
      nextErrors.amount = "الرصيد في الصندوق غير كافٍ لهذا المصروف.";
    }

    if (!date) nextErrors.date = "اختر تاريخ المعاملة.";
    if (description.trim().length > 200) nextErrors.description = "الوصف يجب ألا يتجاوز 200 حرف.";
    setFieldErrors(nextErrors);
    
    if (Object.keys(nextErrors).length) {
      setError("راجع الحقول المطلوبة قبل الحفظ."); notifyValidation("راجع الحقول المطلوبة قبل الحفظ."); return;
    }
    
    try {
      setSaving(true);
      setError("");
      
      await transactionsService.createFinancial({
        cashboxId: Number(boxId), 
        categoryId: Number(categoryId), 
        amount, 
        type: direction, 
        transactionDate: date,
        description: description.trim(),
        referenceNumber: reference.trim(),
        notes: notes.trim(),
      });
      
      notifySuccess("تم حفظ المعاملة وتحديث الصندوق بنجاح.");
      navigate(PATHS.TRANSACTIONS);
    } catch (saveError) {
      const message = getArabicErrorMessage(saveError, "تعذر حفظ المعاملة.");
      setError(message);
      notifyError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title={direction === "expense" ? "إضافة مصروف" : "إضافة إيراد"} description="تسجيل معاملة مالية جديدة وتحديث رصيد الصندوق تلقائياً." actions={<BackButton to={PATHS.TRANSACTIONS} />} />
      <div className="mb-5 rounded-[var(--radius-md)] border border-green-500 bg-green-50 px-4 py-3 text-sm text-green-800">
        هذه المعاملة ستؤثر على رصيد الصندوق المختار فور حفظها، ولا يمكن تعديلها لاحقاً (يمكن إلغاؤها فقط).
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card header="بيانات المعاملة">
          {loading ? <p className="text-sm text-[var(--text-muted)]">جاري تحميل البيانات...</p> : <div className="grid gap-4 md:grid-cols-2">
            <FormField label="نوع المعاملة"><Select value={direction} onChange={(event) => { setDirection(event.target.value as typeof direction); setCategoryId(""); }} options={[{ value: "expense", label: "مصروف" }, { value: "income", label: "إيراد" }]} /></FormField>
            <FormField label="الصندوق" required error={fieldErrors.boxId}><Select value={boxId} onChange={(event) => setBoxId(event.target.value)} options={boxes.map((item) => ({ value: String(item.id), label: item.name }))} /></FormField>
            <FormField label="الفئة" required error={fieldErrors.categoryId}><Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={[{ value: "", label: "اختر الفئة" }, ...availableCategories.map((item) => ({ value: String(item.id), label: item.name }))]} /></FormField>
            <FormField label="المبلغ" required error={fieldErrors.amount}><Input dir="ltr" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></FormField>
            <FormField label="التاريخ" required error={fieldErrors.date}><Input dir="ltr" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></FormField>
            <FormField label="رقم المرجع (اختياري)"><Input dir="ltr" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="مثال: رقم إيصال خارجي" /></FormField>
            <FormField label="الوصف" error={fieldErrors.description}><Input value={description} placeholder="وصف مختصر للعملية" onChange={(event) => setDescription(event.target.value)} /></FormField>
            <FormField label="الملاحظات (اختياري)"><Textarea value={notes} placeholder="أي تفاصيل إضافية..." onChange={(event) => setNotes(event.target.value)} /></FormField>
          </div>}
          {error && <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>}
        </Card>
        
        <Card header="الأثر المالي">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">الصندوق</span><strong>{selected?.name || "—"}</strong></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">الرصيد الحالي</span><strong dir="ltr" className="tabular-nums">{money(selected?.balance || 0)} {selectedCurrency}</strong></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)]">قيمة الحركة</span><strong dir="ltr" className={`tabular-nums ${direction === 'income' ? 'text-green-600' : 'text-red-600'}`}>{direction === 'income' ? '+' : '-'}{displayAmount} {selectedCurrency}</strong></div>
            
            <div className="border-t border-[var(--border)] pt-4 flex justify-between font-bold">
              <span className="text-[var(--text-primary)]">الرصيد المتوقع</span>
              <span dir="ltr" className={`tabular-nums ${expectedBalance < 0 ? 'text-red-600' : ''}`}>
                {money(expectedBalance)} {selectedCurrency}
              </span>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => navigate(PATHS.TRANSACTIONS)}>إلغاء</Button><Button isLoading={saving} disabled={loading || !boxId || !categoryId || amount <= 0 || (direction === 'expense' && amount > (selected?.balance || 0))} onClick={() => void save()}>حفظ المعاملة</Button></div>
    </>
  );
}
