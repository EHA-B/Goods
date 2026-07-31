import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BackButton,
  Button,
  Card,
  FormField,
  Input,
  PageHeader,
  Select,
  Switch,
  Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { cashboxesService } from "./cashboxesService";

export default function TransactionCategoryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const existing = id
    ? cashboxesService.categories().find((category) => category.id === Number(id))
    : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<"expense" | "income">(
    existing?.type ?? "expense",
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [active, setActive] = useState(existing?.isActive ?? true);

  const handleSave = () => {
    if (!name.trim()) return;

    cashboxesService.saveCategory(
      {
        name: name.trim(),
        type,
        description,
        isActive: active,
      },
      existing?.id,
    );

    navigate(PATHS.TRANSACTION_CATEGORIES);
  };

  return (
    <>
      <PageHeader
        title={existing ? "تعديل الفئة" : "إضافة فئة"}
        description="تستخدم الفئات لتنظيم الإيرادات والمصروفات."
        actions={<BackButton to={PATHS.TRANSACTION_CATEGORIES} />}
      />

      <Card header="بيانات الفئة">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="اسم الفئة" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="مثال: إيجار المحل"
            />
          </FormField>

          <FormField label="النوع" required>
            <Select
              value={type}
              onChange={(event) =>
                setType(event.target.value as "expense" | "income")
              }
              options={[
                { value: "expense", label: "مصروف" },
                { value: "income", label: "إيراد" },
              ]}
            />
          </FormField>

          <FormField label="الوصف" className="md:col-span-2">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="وصف اختياري للفئة"
            />
          </FormField>

          <FormField label="الحالة">
            <div className="flex h-11 items-center gap-3">
              <Switch
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              <span className="text-sm text-[var(--text-secondary)]">
                {active ? "نشطة" : "غير نشطة"}
              </span>
            </div>
          </FormField>
        </div>
      </Card>

      <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Button
          variant="secondary"
          onClick={() => navigate(PATHS.TRANSACTION_CATEGORIES)}
        >
          إلغاء
        </Button>
        <Button onClick={handleSave}>
          {existing ? "حفظ التعديلات" : "حفظ الفئة"}
        </Button>
      </div>
    </>
  );
}
