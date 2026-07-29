import { useState } from "react";
import { Building2, CheckCircle2, Save } from "lucide-react";
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
import { settingsService, type CompanySettings } from "./settingsService";

export default function CompanySettingsPage() {
  const [form, setForm] = useState<CompanySettings>(() => settingsService.loadCompany());
  const [saved, setSaved] = useState(false);

  const update = (key: keyof CompanySettings, value: string) => {
    setSaved(false);
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

  const handleSave = () => {
    settingsService.saveCompany(form);
    setSaved(true);
  };

  return (
    <>
      <PageHeader
        title="معلومات الشركة"
        description="تستخدم هذه البيانات في رأس الفواتير والمستندات المطبوعة."
        actions={<BackButton to={PATHS.SETTINGS} />}
      />

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[#b7d7c5] bg-[#f1f8f4] px-4 py-3 text-sm font-medium text-[#37634d]">
          <CheckCircle2 size={18} />
          تم حفظ معلومات الشركة محليًا بنجاح.
        </div>
      )}

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

            <FormField label="الرقم الضريبي">
              <Input dir="ltr" value={form.taxNumber} onChange={(event) => update("taxNumber", event.target.value)} placeholder="الرقم الضريبي" />
            </FormField>

            <FormField label="السجل التجاري">
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
            سيظهر الشعار لاحقًا على الفواتير والتقارير بعد ربط إعدادات الطباعة.
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 mt-5 flex justify-end border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Button onClick={handleSave} startIcon={<Save size={17} />}>حفظ المعلومات</Button>
      </div>
    </>
  );
}
