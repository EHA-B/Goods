import {
  BriefcaseBusiness,
  Save,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  BackButton,
  Button,
  Card,
  FormField,
  Input,
  LoadingSpinner,
  NumberInput,
  PageHeader,
  Select,
  Switch,
  Textarea,
} from "../../components/ui";
import {
  notifyError,
  notifySuccess,
  notifyValidation,
} from "../../lib/notifications";
import { PATHS } from "../../routes/path";
import {
  getWorkerErrorMessage,
  workersService,
  type WorkerInput,
  type WorkerState,
  type WorkerType,
} from "./workersService";

type FormState = {
  name: string;
  phone: string;
  type: WorkerType;
  balance: string;
  address: string;
  notes: string;
  state: WorkerState;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  type: "worker",
  balance: "0",
  address: "",
  notes: "",
  state: "active",
};

export default function WorkerFormPage() {
  const navigate = useNavigate();
  const { workerId } = useParams();
  const id = workerId ? Number(workerId) : undefined;
  const isEditing = Number.isFinite(id);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(Boolean(isEditing));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEditing || !id) return;

    let cancelled = false;

    void (async () => {
      try {
        setIsLoading(true);
        setError("");

        const worker = await workersService.get(id);
        if (cancelled) return;

        setForm({
          name: worker.name,
          phone: worker.phone,
          type: worker.type,
          balance: String(worker.balance),
          address: worker.address,
          notes: worker.notes,
          state: worker.state,
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(getWorkerErrorMessage(loadError));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isEditing]);

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("الاسم مطلوب.");
      notifyValidation("الاسم مطلوب.");
      return;
    }

    const balance = Number(form.balance || 0);
    if (!Number.isFinite(balance)) {
      setError("الرصيد غير صالح.");
      notifyValidation("أدخل رصيدًا صالحًا.");
      return;
    }

    const input: WorkerInput = {
      name: form.name,
      phone: form.phone,
      type: form.type,
      balance,
      address: form.address,
      notes: form.notes,
      state: form.state,
    };

    try {
      setIsSaving(true);
      setError("");

      const worker =
        isEditing && id
          ? await workersService.update(id, input)
          : await workersService.create(input);

      notifySuccess(
        isEditing
          ? "تم تعديل بيانات العامل أو الموظف بنجاح."
          : "تمت إضافة العامل أو الموظف بنجاح.",
      );

      navigate(`/workers/${worker.id}`);
    } catch (saveError) {
      const message = getWorkerErrorMessage(saveError);
      setError(message);
      notifyError(saveError, { fallback: message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title={isEditing ? "تعديل البيانات" : "إضافة عامل أو موظف"}
        description="أدخل بيانات الشخص ونوعه ورصيده وحالته داخل النظام."
        actions={<BackButton to={PATHS.WORKERS} label="العودة إلى العمال" />}
      />

      <Card
        header="البيانات الأساسية"
        description="النوع في الباك الحالي يميز بين موظف وعامل."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FormField label="الاسم" htmlFor="worker-name" required>
            <Input
              id="worker-name"
              value={form.name}
              placeholder="اسم العامل أو الموظف"
              onChange={(event) => update("name", event.target.value)}
            />
          </FormField>

          <FormField label="النوع" htmlFor="worker-type" required>
            <Select
              id="worker-type"
              value={form.type}
              onChange={(event) =>
                update("type", event.target.value as WorkerType)
              }
              options={[
                { value: "worker", label: "عامل" },
                { value: "employee", label: "موظف" },
              ]}
            />
          </FormField>

          <FormField label="رقم الهاتف" htmlFor="worker-phone">
            <Input
              id="worker-phone"
              dir="ltr"
              value={form.phone}
              placeholder="09xxxxxxxx"
              onChange={(event) => update("phone", event.target.value)}
            />
          </FormField>

          <FormField
            label="الرصيد"
            htmlFor="worker-balance"
            hint="الرصيد يمثل القيمة الحالية المسجلة على العامل أو الموظف في الباك. دفع الرواتب يخفض هذا الرصيد."
          >
            <NumberInput
              id="worker-balance"
              value={form.balance}
              onChange={(event) => update("balance", event.target.value)}
              step={0.01}
              suffix="ل.س"
            />
          </FormField>

          <FormField
            label="العنوان"
            htmlFor="worker-address"
            className="md:col-span-2"
          >
            <Input
              id="worker-address"
              value={form.address}
              placeholder="المدينة، الحي، الشارع"
              onChange={(event) => update("address", event.target.value)}
            />
          </FormField>

          <FormField
            label="الملاحظات"
            htmlFor="worker-notes"
            className="md:col-span-2"
          >
            <Textarea
              id="worker-notes"
              value={form.notes}
              placeholder="أي معلومات إضافية..."
              onChange={(event) => update("notes", event.target.value)}
            />
          </FormField>

          <div
            className={[
              "flex items-center justify-between rounded-[var(--radius-sm)] border px-4 py-3 transition-colors md:col-span-2",
              form.state === "active"
                ? "border-[color-mix(in_srgb,var(--success)_45%,var(--border))] bg-[var(--success-subtle)]"
                : "border-[color-mix(in_srgb,var(--danger)_45%,var(--border))] bg-[var(--danger-subtle)]",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-muted)]">
                {form.type === "employee" ? (
                  <BriefcaseBusiness size={17} />
                ) : (
                  <UserRound size={17} />
                )}
              </span>

              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  حالة السجل
                </p>
                <p
                  className={[
                    "mt-1 text-xs font-bold",
                    form.state === "active"
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]",
                  ].join(" ")}
                >
                  {form.state === "active" ? "نشط" : "غير نشط"}
                </p>
              </div>
            </div>

            <Switch
              checked={form.state === "active"}
              onChange={(event) =>
                update(
                  "state",
                  event.target.checked ? "active" : "inactive",
                )
              }
              aria-label={
                form.state === "active" ? "تعطيل السجل" : "تفعيل السجل"
              }
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm font-bold text-[var(--danger)]">
            {error}
          </p>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => navigate(PATHS.WORKERS)}
        >
          إلغاء
        </Button>

        <Button
          type="submit"
          startIcon={<Save size={17} />}
          isLoading={isSaving}
          loadingText="جاري الحفظ..."
        >
          {isEditing ? "حفظ التعديلات" : "حفظ السجل"}
        </Button>
      </div>
    </form>
  );
}
