import { notifyValidation } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BackButton, Button, Card, FormField, Input, PageHeader, Select, Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { cashboxesService, translateCashboxError } from "./cashboxesService";
import { RefreshCw } from "lucide-react";
import { formatMoney } from "./currency";

type MovementKind = "income" | "expense" | "adjustment_in" | "adjustment_out";

const DIRECTION_OPTIONS: { value: MovementKind; label: string }[] = [
  { value: "expense",        label: "مصروف (خروج)" },
  { value: "income",         label: "إيراد (دخول)" },
  { value: "adjustment_in",  label: "تسوية زيادة (دخول)" },
  { value: "adjustment_out", label: "تسوية نقص (خروج)" },
];

function mapKindToApi(kind: MovementKind): { direction: "in" | "out"; reference_type: "income" | "expense" | "adjustment" } {
  switch (kind) {
    case "income":         return { direction: "in",  reference_type: "income"     };
    case "expense":        return { direction: "out", reference_type: "expense"    };
    case "adjustment_in":  return { direction: "in",  reference_type: "adjustment" };
    case "adjustment_out": return { direction: "out", reference_type: "adjustment" };
  }
}

export default function CashboxTransactionFormPage() {
  const nav = useNavigate();
  const { cashboxId } = useParams();

  const [cashboxes, setCashboxes] = useState<CashboxApiRecord[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [boxId, setBoxId] = useState(cashboxId ?? "");
  const [kind, setKind] = useState<MovementKind>("expense");
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
      .catch((e) => setError(getArabicErrorMessage(e, "تعذر تحميل الصناديق")))
      .finally(() => setLoadingBoxes(false));
  }, []);

  const back = cashboxId ? `/cashboxes/${cashboxId}` : PATHS.CASHBOXES;
  const selectedBox = cashboxes.find((c) => c.id === Number(boxId));
  const isOutgoing = kind === "expense" || kind === "adjustment_out";

  const handleSave = async () => {
    if (!boxId || amount <= 0) {
      setError("يرجى اختيار الصندوق وإدخال مبلغ صحيح"); notifyValidation("يرجى اختيار الصندوق وإدخال مبلغ صحيح"); return;
    }
    if (!date) {
      setError("التاريخ مطلوب"); notifyValidation("التاريخ مطلوب"); return;
    }
    setSaving(true);
    setError(null);
    try {
      const { direction, reference_type } = mapKindToApi(kind);
      await cashboxesService.createMovement({
        cashbox_id: Number(boxId),
        direction,
        amount,
        reference_type,
        transaction_date: date,
        notes: notes || null,
      });
      nav(back);
    } catch (e: unknown) {
      setError(translateCashboxError(e));
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

  const pageTitle = {
    expense:        "إضافة مصروف",
    income:         "إضافة إيراد",
    adjustment_in:  "تسوية زيادة",
    adjustment_out: "تسوية نقص",
  }[kind];

  return (
    <>
      <PageHeader
        title={pageTitle}
        description="تُحدّث هذه الحركة رصيد الصندوق تلقائيًا."
        actions={<BackButton to={back} />}
      />

      <Card header="بيانات الحركة">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="نوع الحركة">
            <Select
              value={kind}
              onChange={(e) => setKind(e.target.value as MovementKind)}
              options={DIRECTION_OPTIONS}
            />
          </FormField>

          <FormField label="الصندوق">
            <Select
              value={boxId}
              onChange={(e) => setBoxId(e.target.value)}
              options={cashboxes.map((c) => ({
                value: String(c.id),
                label: `${c.name} — الرصيد: ${formatMoney(c.balance, c.currency)}`,
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

        {selectedBox && isOutgoing && (
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            الرصيد الحالي للصندوق:{" "}
            <strong>{formatMoney(selectedBox.balance, selectedBox.currency)}</strong>
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
