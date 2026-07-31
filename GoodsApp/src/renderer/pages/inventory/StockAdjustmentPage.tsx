import { useState } from "react";
import { ArrowRight, PackageCheck } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button, Card, FormField, NumberInput, PageHeader, Select, Textarea } from "../../components/ui";
import { useInventory } from "./InventoryContext";

const OPERATION_OPTIONS = [{ value: "add", label: "إضافة إلى المخزون" }, { value: "subtract", label: "خصم من المخزون" }];
export default function StockAdjustmentPage() {
  const { productId } = useParams(); const navigate = useNavigate();
  const { getProduct, saveAdjustment } = useInventory(); const product = getProduct(Number(productId));
  const [operation, setOperation] = useState<"add" | "subtract">("add"); const [quantity, setQuantity] = useState("1"); const [notes, setNotes] = useState(""); const [error, setError] = useState("");
  if (!product) return <Navigate to="/inventory" replace />;
  function submit(event: React.FormEvent) { event.preventDefault(); const parsed = Number(quantity); if (!Number.isFinite(parsed) || parsed <= 0) return setError("أدخل كمية أكبر من صفر."); if (operation === "subtract" && parsed > product.totalQuantity) return setError("لا يمكن خصم كمية أكبر من الرصيد الحالي."); saveAdjustment({ productId: product.productId, operation, quantity: parsed, notes: notes.trim() }); navigate(`/inventory/${product.productId}`); }
  const nextBalance = product.totalQuantity + (operation === "add" ? Number(quantity || 0) : -Number(quantity || 0));
  return <form onSubmit={submit} className="space-y-6">
    <PageHeader title="تسوية المخزون" description="تسجيل فرق جرد أو تلف أو تصحيح رصيد مع الاحتفاظ بحركة واضحة." actions={<Button variant="secondary" startIcon={<ArrowRight size={17} />} onClick={() => navigate(-1)}>رجوع</Button>} />
    <Card header="المادة المحددة" description="راجع المادة والرصيد قبل تنفيذ التسوية."><div className="grid gap-4 md:grid-cols-3"><Info label="المادة" value={product.productName} /><Info label="الكود" value={product.productCode} /><Info label="الرصيد الحالي" value={`${product.totalQuantity.toLocaleString()} ${product.unit}`} /></div></Card>
    <Card header="بيانات التسوية" description="حدد نوع العملية والكمية والسبب بشكل واضح."><div className="grid gap-5 md:grid-cols-2"><FormField label="نوع التسوية" required><Select value={operation} options={OPERATION_OPTIONS} onChange={(e) => { setOperation(e.target.value as "add" | "subtract"); setError(""); }} /></FormField><FormField label="الكمية" required error={error || undefined}><NumberInput min={1} value={quantity} suffix={product.unit} error={Boolean(error)} onChange={(e) => { setQuantity(e.target.value); setError(""); }} /></FormField><div className="md:col-span-2"><FormField label="سبب التسوية" hint="اكتب سببًا يساعد في مراجعة الحركة لاحقًا."><Textarea rows={5} value={notes} placeholder="مثال: فرق جرد، تلف، تصحيح إدخال..." onChange={(e) => setNotes(e.target.value)} /></FormField></div></div></Card>
    <Card header="ملخص العملية"><div className="grid gap-4 md:grid-cols-3"><Info label="الرصيد قبل" value={`${product.totalQuantity.toLocaleString()} ${product.unit}`} /><Info label="التغيير" value={`${operation === "add" ? "+" : "-"}${Number(quantity || 0).toLocaleString()} ${product.unit}`} /><Info label="الرصيد المتوقع" value={`${Math.max(nextBalance, 0).toLocaleString()} ${product.unit}`} /></div></Card>
    <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4"><Button variant="secondary" onClick={() => navigate(-1)}>إلغاء</Button><Button type="submit" startIcon={<PackageCheck size={17} />}>حفظ التسوية</Button></div>
  </form>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 font-bold text-[var(--text-primary)]">{value}</p></div>; }
