import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BackButton, Button, Card, FormField, Input, PageHeader, Select, Switch, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { transactionsService } from "../transactions/transactionsService";

export default function TransactionCategoryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const categoryId = id ? Number(id) : undefined;
  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(Boolean(categoryId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoryId) return;
    void (async () => {
      try {
        const existing = await transactionsService.getCategory(categoryId);
        setName(existing.name ?? "");
        setType(existing.type ?? "expense");
        setDescription(existing.description ?? "");
        setActive(existing.isActive === true || existing.isActive === 1);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الفئة.");
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryId]);

  async function handleSave() {
    if (!name.trim()) {
      setError("اسم الفئة مطلوب.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const input = { name: name.trim(), type, description: description.trim(), isActive: active };
      if (categoryId) await transactionsService.updateCategory(categoryId, input);
      else await transactionsService.createCategory(input);
      toast.success(categoryId ? "تم تحديث الفئة بنجاح." : "تمت إضافة الفئة بنجاح.");
      navigate(PATHS.TRANSACTION_CATEGORIES);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "تعذر حفظ الفئة.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title={categoryId ? "تعديل الفئة" : "إضافة فئة"} description="تستخدم الفئات لتنظيم الإيرادات والمصروفات." actions={<BackButton to={PATHS.TRANSACTION_CATEGORIES} />} />
      <Card header="بيانات الفئة">
        {loading ? <p className="text-sm text-[var(--text-muted)]">جاري تحميل الفئة...</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="اسم الفئة" required><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: إيجار المحل" /></FormField>
            <FormField label="النوع" required><Select value={type} onChange={(event) => setType(event.target.value as "expense" | "income")} options={[{ value: "expense", label: "مصروف" }, { value: "income", label: "إيراد" }]} /></FormField>
            <FormField label="الوصف" className="md:col-span-2"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="وصف اختياري للفئة" /></FormField>
            <FormField label="الحالة"><div className="flex h-11 items-center gap-3"><Switch checked={active} onChange={(event) => setActive(event.target.checked)} /><span className="text-sm text-[var(--text-secondary)]">{active ? "نشطة" : "غير نشطة"}</span></div></FormField>
          </div>
        )}
        {error && <p className="mt-4 text-sm font-medium text-[var(--danger)]">{error}</p>}
      </Card>
      <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Button variant="secondary" onClick={() => navigate(PATHS.TRANSACTION_CATEGORIES)}>إلغاء</Button>
        <Button isLoading={saving} disabled={loading} onClick={() => void handleSave()}>{categoryId ? "حفظ التعديلات" : "حفظ الفئة"}</Button>
      </div>
    </>
  );
}
