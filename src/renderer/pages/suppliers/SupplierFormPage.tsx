import { notifyError, notifySuccess, notifyValidation } from "../../lib/notifications";
import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  BackButton,
  Button,
  Card,
  FormField,
  Input,
  LoadingSpinner,
  NumberInput,
  PageHeader,
  Switch,
  Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import {
  getSupplierErrorMessage,
  suppliersService,
  type SupplierInput,
} from "./suppliersService";

type FormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: string;
  notes: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  balance: "0",
  notes: "",
  isActive: true,
};

export default function SupplierFormPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const id = supplierId ? Number(supplierId) : undefined;
  const isEditing = Number.isFinite(id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(Boolean(isEditing));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing || !id) return;

    let cancelled = false;

    async function loadSupplier() {
      try {
        setIsLoading(true);
        setError("");
        const supplier = await suppliersService.get(id as number);
        if (cancelled) return;

        setForm({
          name: supplier.name,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          balance: String(supplier.balance),
          notes: supplier.notes,
          isActive: supplier.isActive,
        });
      } catch (loadError) {
        if (!cancelled) setError(getSupplierErrorMessage(loadError));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSupplier();
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

    if (!form.name.trim()) {
      setError("اسم المورد مطلوب."); notifyValidation("اسم المورد مطلوب."); return;
    }

    const balance = Number(form.balance || 0);
    if (!Number.isFinite(balance)) {
      setError("الرصيد الافتتاحي غير صالح."); notifyValidation("الرصيد الافتتاحي غير صالح."); return;
    }

    const input: SupplierInput = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      balance,
      notes: form.notes,
      isActive: form.isActive,
    };

    try {
      setIsSaving(true);
      setError("");

      const supplier =
        isEditing && id
          ? await suppliersService.update(id, input)
          : await suppliersService.create(input);

      notifySuccess(
        isEditing ? "تم تعديل بيانات المورد بنجاح" : "تمت إضافة المورد بنجاح",
      );
      navigate(`/suppliers/${supplier.id}`);
    } catch (saveError) {
      const message = getSupplierErrorMessage(saveError);
      setError(message);
      notifyError(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium">جاري تحميل بيانات المورد...</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title={isEditing ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
        description="أدخل بيانات المورد الأساسية ومعلومات الحساب."
        actions={<BackButton to={PATHS.SUPPLIERS} label="العودة إلى الموردين" />}
      />

      <Card
        header="بيانات المورد"
        description="البيانات الأساسية ومعلومات التواصل والحساب."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="اسم المورد" htmlFor="supplier-name" required>
            <Input
              id="supplier-name"
              value={form.name}
              placeholder="اسم الشركة أو المورد"
              onChange={(event) => update("name", event.target.value)}
            />
          </FormField>

          <FormField label="رقم الهاتف" htmlFor="supplier-phone">
            <Input
              id="supplier-phone"
              dir="ltr"
              value={form.phone}
              placeholder="09xxxxxxxx"
              onChange={(event) => update("phone", event.target.value)}
            />
          </FormField>

          <FormField label="البريد الإلكتروني" htmlFor="supplier-email">
            <Input
              id="supplier-email"
              dir="ltr"
              type="email"
              value={form.email}
              placeholder="supplier@example.com"
              onChange={(event) => update("email", event.target.value)}
            />
          </FormField>

          <FormField label="العنوان" htmlFor="supplier-address">
            <Input
              id="supplier-address"
              value={form.address}
              placeholder="المدينة، الحي، الشارع"
              onChange={(event) => update("address", event.target.value)}
            />
          </FormField>

          <FormField
            label="الرصيد الافتتاحي"
            htmlFor="supplier-balance"
            hint="الموجب يعني أن للمورد مبلغًا، والسالب يعني وجود دفعة مقدمة لدينا."
          >
            <NumberInput
              id="supplier-balance"
              value={form.balance}
              suffix="ل.س"
              onChange={(event) => update("balance", event.target.value)}
            />
          </FormField>

          <div className="flex items-center justify-between self-end rounded-[var(--radius-sm)] border border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                المورد نشط
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                يمكن إيقاف المورد مع الاحتفاظ بسجله.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onChange={(event) => update("isActive", event.target.checked)}
            />
          </div>

          <div className="md:col-span-2">
            <FormField label="ملاحظات" htmlFor="supplier-notes">
              <Textarea
                id="supplier-notes"
                rows={5}
                value={form.notes}
                placeholder="ملاحظات وشروط التعامل مع المورد..."
                onChange={(event) => update("notes", event.target.value)}
              />
            </FormField>
          </div>

          {error && (
            <p className="md:col-span-2 rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-medium text-[var(--danger)]">
              {error}
            </p>
          )}
        </div>
      </Card>

      <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Button
          variant="secondary"
          disabled={isSaving}
          onClick={() => navigate(PATHS.SUPPLIERS)}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          isLoading={isSaving}
          loadingText="جاري الحفظ..."
          startIcon={<Save size={17} />}
        >
          حفظ المورد
        </Button>
      </div>
    </form>
  );
}
