import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BackButton, Button, Card, FormField, Input, PageHeader, Select, Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { cashboxesService } from "./cashboxesService";
import { RefreshCw } from "lucide-react";

const DIRECTION_OPTIONS = [
  { value: "expense", label: "مصروف (خروج)" },
  { value: "income", label: "إيراد (دخول)" },
];

export default function CashboxTransactionFormPage() {
  const nav = useNavigate();
  const { cashboxId } = useParams();

  const [cashboxes, setCashboxes] = useState<CashboxApiRecord[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [boxId, setBoxId] = useState(cashboxId ?? "");
  const [direction, setDirection] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    cashboxesService
      .list()
      .then((list) => {
        const active = list.filter((c) => c.isActive);
        setCashboxes(active);
        if (!boxId && active.length) setBoxId(String(active[0].id));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "تعذر تحميل الصناديق"))
      .finally(() => setLoadingBoxes(false));
  }, []);

  const back = cashboxId ? `/cashboxes/${cashboxId}` : PATHS.CASHBOXES;

  const handleSave = async () => {
    if (!boxId || amount <= 0) {
      setError("يرجى اختيار الصندوق وإدخال مبلغ صحيح");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await cashboxesService.createMovement({
        cashbox_id: Number(boxId),
        direction: direction === "income" ? "in" : "out",
        amount,
        reference_type: direction === "income" ? "income" : "expense",
        transaction_date: date,
        notes: notes || null,
      });
      nav(back);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      const codeMessages: Record<string, string> = {
        INSUFFICIENT_BALANCE: "الرصيد غير كافٍ لتنفيذ هذه الحركة.",
        INACTIVE_CASHBOX: "الصندوق غير نشط.",
        VALIDATION_ERROR: err.message ?? "بيانات غير صحيحة.",
      };
      setError(codeMessages[err.code ?? ""] ?? err.message ?? "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loadingBoxes) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-[var(--text-muted)]">
        <RefreshCw size={20} className="animate-spin" />
        <span>جارٍ التحميل…</span>
      </div>
    );
  }

  const selectedBox = cashboxes.find((c) => c.id === Number(boxId));

  return (
    <>
      <PageHeader
        title={direction === "expense" ? "إضافة مصروف" : "إضافة إيراد"}
        description="تُحدّث هذه الحركة رصيد الصندوق تلقائيًا."
        actions={<BackButton to={back} />}
      />

      <Card header="بيانات الحركة">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="نوع الحركة">
            <Select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "income" | "expense")}
              options={DIRECTION_OPTIONS}
            />
          </FormField>

          <FormField label="الصندوق">
            <Select
              value={boxId}
              onChange={(e) => setBoxId(e.target.value)}
              options={cashboxes.map((c) => ({
                value: String(c.id),
                label: `${c.name} — الرصيد: ${Number(c.balance).toLocaleString("en-US")} ${c.currency}`,
              }))}
            />
          </FormField>

          <FormField label="المبلغ">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </FormField>

          <FormField label="التاريخ">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>

          <FormField label="الملاحظات" className="md:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>

        {selectedBox && direction === "expense" && (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            الرصيد الحالي للصندوق:{" "}
            <strong>{Number(selectedBox.balance).toLocaleString("en-US")} {selectedBox.currency}</strong>
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </Card>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => nav(back)}>
          إلغاء
        </Button>
        <Button
          disabled={!boxId || amount <= 0 || saving}
          onClick={handleSave}
        >
          {saving ? "جارٍ الحفظ…" : "حفظ الحركة"}
        </Button>
      </div>
    </>
  );
}
