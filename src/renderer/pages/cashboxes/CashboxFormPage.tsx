import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, Input, PageHeader, Select, Switch, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { cashboxesService, translateCashboxError } from "./cashboxesService";
import { RefreshCw } from "lucide-react";
import { CASHBOX_CURRENCIES } from "./currency";

export default function CashboxFormPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [allCashboxes, setAllCashboxes] = useState<CashboxApiRecord[]>([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMovements, setHasMovements] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [initialBalance, setInitialBalance] = useState(0);
  const [currency, setCurrency] = useState("SYP");
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const list = await cashboxesService.list();
        setAllCashboxes(list);

        if (isEditMode && id) {
          const existing = list.find((c) => c.id === Number(id));
          if (existing) {
            setName(existing.name);
            setParentId(existing.parent_id ? String(existing.parent_id) : "");
            setInitialBalance(Number(existing.initial_balance));
            setCurrency(existing.currency);
            setActive(Boolean(existing.isActive));
            setNotes(existing.notes ?? "");

            // Check if cashbox has movements (to disable currency edit)
            try {
              const details = await cashboxesService.getDetails(Number(id));
              setHasMovements(details.movement_count > 0);
            } catch {
              setHasMovements(false);
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذر تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, isEditMode]);

  // Filter parent options: exclude self, inactive cashboxes, and descendants.
  const currentId = Number(id);
  const descendantIds = new Set<number>();
  if (isEditMode && Number.isFinite(currentId)) {
    const queue = [currentId];
    while (queue.length) {
      const parent = queue.shift()!;
      for (const item of allCashboxes) {
        if (Number(item.parent_id) === parent && !descendantIds.has(item.id)) {
          descendantIds.add(item.id);
          queue.push(item.id);
        }
      }
    }
  }
  const availableParents = allCashboxes.filter(
    (c) => c.id !== currentId && !descendantIds.has(c.id) && Boolean(c.isActive)
  );

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("اسم الصندوق مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEditMode && id) {
        await cashboxesService.update(Number(id), {
          name: name.trim(),
          parent_id: parentId ? Number(parentId) : null,
          currency,
          isActive: active,
          notes: notes || null,
        });
      } else {
        await cashboxesService.create({
          name: name.trim(),
          parent_id: parentId ? Number(parentId) : null,
          initial_balance: initialBalance,
          currency,
          isActive: active,
          notes: notes || null,
        });
      }
      nav(PATHS.CASHBOXES);
    } catch (e: unknown) {
      setError(translateCashboxError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-[var(--text-muted)]">
        <RefreshCw size={20} className="animate-spin" />
        <span>جارٍ التحميل…</span>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={isEditMode ? "تعديل الصندوق" : "إضافة صندوق"}
        description="أدخل المعلومات الأساسية للصندوق. الرصيد الحالي يُدار من الحركات فقط."
        actions={<BackButton to={PATHS.CASHBOXES} />}
      />

      <Card header="بيانات الصندوق">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="اسم الصندوق" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>

          <FormField label="الصندوق الأب">
            <Select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              options={[
                { value: "", label: "بدون صندوق أب" },
                ...availableParents.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />
          </FormField>

          {/* Only show initial_balance in create mode */}
          {!isEditMode && (
            <FormField label="الرصيد الافتتاحي">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
              />
            </FormField>
          )}

          <FormField
            label="العملة"
            hint={
              isEditMode && hasMovements
                ? "لا يمكن تغيير العملة بعد تسجيل حركات على الصندوق."
                : undefined
            }
          >
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[...CASHBOX_CURRENCIES]}
              disabled={isEditMode && hasMovements}
            />
          </FormField>

          <FormField label="الملاحظات" className="md:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>

          <FormField label="الحالة">
            <div className="flex h-11 items-center gap-3">
              <Switch checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span className="text-sm">{active ? "نشط" : "غير نشط"}</span>
            </div>
          </FormField>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </Card>

      <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-[var(--border)] bg-[var(--background)] py-4">
        <Button variant="secondary" onClick={() => nav(PATHS.CASHBOXES)}>
          إلغاء
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "جارٍ الحفظ…" : isEditMode ? "حفظ التعديلات" : "حفظ الصندوق"}
        </Button>
      </div>
    </>
  );
}
