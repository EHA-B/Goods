import { notifyError, notifySuccess } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { Building2, LoaderCircle, Save } from "lucide-react";
import {
  BackButton,
  Button,
  Card,
  FormField,
  ImageUploader,
  Input,
  PageHeader,
  Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import {
  defaultCompanySettings,
  settingsService,
  type CompanySettings,
} from "./settingsService";

export default function CompanySettingsPage() {
  const [form, setForm] = useState<CompanySettings>(defaultCompanySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");

      try {
        const company = await settingsService.loadCompany();
        if (!cancelled) setForm(company);
      } catch (error) {
        if (!cancelled) {
          setLoadError(getArabicErrorMessage(error, "تعذر تحميل معلومات الشركة."));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (key: keyof CompanySettings, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleLogo = (file: File | null) => {
    if (!file) {
      update("logo", "");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => update("logo", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      notifyError("أدخل اسم الشركة قبل الحفظ.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await settingsService.saveCompany(form);
      setForm(saved);
      notifySuccess("تم حفظ معلومات الشركة في قاعدة البيانات.");
    } catch (error) {
      notifyError(getArabicErrorMessage(error, "تعذر حفظ معلومات الشركة."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="معلومات الشركة"
        description="تستخدم هذه البيانات في رأس الفواتير والمستندات المطبوعة."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      {loadError && (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-sm font-medium text-[var(--danger)]">
          {loadError}
        </div>
      )}

      {isLoading ? (
        <Card>
          <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-[var(--text-muted)]">
            <LoaderCircle size={20} className="animate-spin" />
            جاري تحميل معلومات الشركة...
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <Card header="البيانات الأساسية" description="أدخل المعلومات الرسمية ووسائل التواصل الخاصة بالشركة.">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="اسم الشركة" required>
                  <Input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="اسم الشركة أو المتجر" />
                </FormField>

                <FormField label="رقم الهاتف">
                  <Input dir="ltr" value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="09xxxxxxxx" />
                </FormField>

                <FormField label="البريد الإلكتروني">
                  <Input dir="ltr" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="company@example.com" />
                </FormField>

                <FormField label="العنوان">
                  <Input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="المدينة، الشارع" />
                </FormField>

                <FormField label="السجل التجاري" className="md:col-span-2">
                  <Input dir="ltr" value={form.commercialRegister} onChange={(event) => update("commercialRegister", event.target.value)} placeholder="رقم السجل التجاري" />
                </FormField>

                <FormField label="تذييل الفاتورة" className="md:col-span-2">
                  <Textarea value={form.invoiceFooter} onChange={(event) => update("invoiceFooter", event.target.value)} placeholder="النص الذي يظهر أسفل الفاتورة" />
                </FormField>
              </div>
            </Card>

            <Card header="شعار الشركة" description="يفضّل استخدام صورة مربعة وواضحة.">
              <div className="flex justify-center py-2">
                <ImageUploader image={form.logo || undefined} onChange={handleLogo} />
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-3 text-xs leading-5 text-[var(--text-muted)]">
                <Building2 size={16} className="mt-0.5 shrink-0" />
                سيظهر الشعار على الفواتير والمستندات المطبوعة.
              </div>
            </Card>
          </div>

          <div className="sticky bottom-0 mt-5 flex justify-end border-t border-[var(--border)] bg-[var(--background)] py-4">
            <Button disabled={isSaving} onClick={() => void handleSave()} startIcon={isSaving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}>
              {isSaving ? "جاري الحفظ..." : "حفظ المعلومات"}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
