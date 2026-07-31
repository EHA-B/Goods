import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  BackButton,
  Button,
  Card,
  FormField,
  Input,
  LoadingSpinner,
  PageHeader,
  Select,
  Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import {
  getProductErrorMessage,
  productsService,
  type ProductInput,
} from "./productsService";

const STATUS_OPTIONS = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
];

type FormState = {
  name: string;
  code: string;
  category: string;
  unit: string;
  description: string;
  status: "active" | "inactive";
};

const emptyForm: FormState = {
  name: "",
  code: "",
  category: "",
  unit: "",
  description: "",
  status: "active",
};

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const id = productId ? Number(productId) : undefined;
  const isEditing = Number.isFinite(id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(Boolean(isEditing));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing || !id) return;

    let cancelled = false;

    async function loadProduct() {
      try {
        setIsLoading(true);
        setError("");
        const product = await productsService.get(id as number);
        if (cancelled) return;

        setForm({
          name: product.name,
          code: product.code ?? "",
          category: product.category,
          unit: product.unit,
          description: product.description,
          status: product.isActive ? "active" : "inactive",
        });
      } catch (loadError) {
        if (!cancelled) setError(getProductErrorMessage(loadError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.unit.trim()) {
      setError("أكمل اسم المنتج والوحدة.");
      return;
    }

    const input: ProductInput = {
      name: form.name,
      code: form.code,
      category: form.category,
      unit: form.unit,
      description: form.description,
      isActive: form.status === "active",
    };

    try {
      setIsSaving(true);
      setError("");

      if (isEditing && id) {
        await productsService.update(id, input);
        toast.success("تم تعديل المنتج بنجاح");
      } else {
        await productsService.create(input);
        toast.success("تمت إضافة المنتج بنجاح");
      }

      navigate(PATHS.PRODUCTS);
    } catch (saveError) {
      const message = getProductErrorMessage(saveError);
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium">جاري تحميل بيانات المنتج...</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title={isEditing ? "تعديل المنتج" : "إضافة منتج"}
        description="أدخل بيانات المنتج الأساسية التي ستستخدم في المخزون والفواتير."
        actions={<BackButton to={PATHS.PRODUCTS} label="العودة إلى المنتجات" />}
      />

      <Card
        header="بيانات المنتج"
        description="يمكن ترك الكود فارغًا، وإذا تم إدخاله فيجب أن يكون فريدًا."
      >
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="اسم المنتج" required>
            <Input
              value={form.name}
              placeholder="مثال: سكر أبيض 1 كغ"
              onChange={(event) => update("name", event.target.value)}
            />
          </FormField>

          <FormField label="كود المنتج">
            <Input
              dir="ltr"
              value={form.code}
              placeholder="اختياري، مثال: PRD-001"
              onChange={(event) => update("code", event.target.value)}
            />
          </FormField>

          <FormField label="الوحدة" required>
            <Input
              value={form.unit}
              placeholder="مثال: كغ، عبوة، قطعة"
              onChange={(event) => update("unit", event.target.value)}
            />
          </FormField>

          <FormField label="التصنيف">
            <Input
              value={form.category}
              placeholder="مثال: مواد غذائية"
              onChange={(event) => update("category", event.target.value)}
            />
          </FormField>

          <FormField label="الحالة">
            <Select
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(event) =>
                update("status", event.target.value as FormState["status"])
              }
            />
          </FormField>

          <div className="md:col-span-2 xl:col-span-3">
            <FormField label="الوصف">
              <Textarea
                rows={5}
                value={form.description}
                placeholder="وصف أو ملاحظات إضافية عن المنتج..."
                onChange={(event) => update("description", event.target.value)}
              />
            </FormField>
          </div>

          {error && (
            <p className="md:col-span-2 xl:col-span-3 rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-medium text-[var(--danger)]">
              {error}
            </p>
          )}
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Button
          variant="secondary"
          disabled={isSaving}
          onClick={() => navigate(PATHS.PRODUCTS)}
        >
          إلغاء
        </Button>

        <Button
          type="submit"
          isLoading={isSaving}
          loadingText="جاري الحفظ..."
          startIcon={<Save size={17} />}
        >
          حفظ المنتج
        </Button>
      </div>
    </form>
  );
}
