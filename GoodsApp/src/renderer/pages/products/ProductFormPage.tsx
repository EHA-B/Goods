import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, Input, NumberInput, PageHeader, Select, Textarea } from "../../components/ui";
import type { ProductStatus } from "../../components/products/ProductsTable";
import { useProducts } from "./ProductsContext";

const STATUS_OPTIONS = [{ value: "available", label: "متوفر" }, { value: "low", label: "كمية منخفضة" }, { value: "out", label: "غير متوفر" }];
type FormState = { name: string; code: string; category: string; quantity: string; unit: string; salePrice: string; status: ProductStatus; notes: string };
const emptyForm: FormState = { name: "", code: "", category: "", quantity: "0", unit: "", salePrice: "0", status: "available", notes: "" };

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const id = productId ? Number(productId) : undefined;
  const { getProduct, saveProduct } = useProducts();
  const product = id ? getProduct(id) : undefined;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  useEffect(() => { if (product) setForm({ name: product.name, code: product.code, category: product.category, quantity: String(product.quantity), unit: product.unit, salePrice: String(product.salePrice), status: product.status, notes: "" }); }, [product]);
  if (id && !product) return <Navigate to="/products" replace />;
  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); setError(""); }
  function submit(event: React.FormEvent) { event.preventDefault(); if (!form.name.trim() || !form.code.trim() || !form.unit.trim()) return setError("أكمل اسم المنتج والكود والوحدة."); const saved = saveProduct({ name: form.name.trim(), code: form.code.trim(), category: form.category.trim(), quantity: Math.max(0, Number(form.quantity) || 0), unit: form.unit.trim(), salePrice: Math.max(0, Number(form.salePrice) || 0), status: form.status }, id); navigate("/products"); return saved; }
  return <form onSubmit={submit} className="space-y-6">
    <PageHeader title={id ? "تعديل المنتج" : "إضافة منتج"} description="أدخل بيانات المنتج الأساسية والأسعار وحالة التوفر." actions={<BackButton to="/products" label="العودة إلى المنتجات" />} />
    <Card header="بيانات المنتج" description="الحقول الأساسية المستخدمة في القوائم والفواتير.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <FormField label="اسم المنتج" required><Input value={form.name} onChange={(e) => update("name", e.target.value)} /></FormField>
        <FormField label="الكود" required><Input dir="ltr" value={form.code} onChange={(e) => update("code", e.target.value)} /></FormField>
        <FormField label="التصنيف"><Input value={form.category} onChange={(e) => update("category", e.target.value)} /></FormField>
        <FormField label="الوحدة" required><Input value={form.unit} onChange={(e) => update("unit", e.target.value)} /></FormField>
        <FormField label="الكمية"><NumberInput min={0} value={form.quantity} onChange={(e) => update("quantity", e.target.value)} /></FormField>
        <FormField label="سعر البيع"><NumberInput min={0} value={form.salePrice} suffix="ل.س" onChange={(e) => update("salePrice", e.target.value)} /></FormField>
        <FormField label="الحالة"><Select value={form.status} options={STATUS_OPTIONS} onChange={(e) => update("status", e.target.value as ProductStatus)} /></FormField>
        <div className="md:col-span-2 xl:col-span-3"><FormField label="ملاحظات"><Textarea rows={5} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></FormField></div>
        {error && <p className="md:col-span-2 xl:col-span-3 text-sm font-medium text-[var(--danger)]">{error}</p>}
      </div>
    </Card>
    <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4"><Button variant="secondary" onClick={() => navigate("/products")}>إلغاء</Button><Button type="submit" startIcon={<Save size={17} />}>حفظ المنتج</Button></div>
  </form>;
}
