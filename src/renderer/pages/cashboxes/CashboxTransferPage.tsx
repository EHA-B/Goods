import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BackButton, Button, Card, FormField, Input, PageHeader, Select, Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { cashboxesService, translateCashboxError } from "./cashboxesService";
import { RefreshCw } from "lucide-react";
import { currencyName, currencySymbol, formatMoney } from "./currency";

export default function CashboxTransferPage() {
  const nav = useNavigate();

  const [cashboxes, setCashboxes] = useState<CashboxApiRecord[]>([]);
  const [loadingBoxes, setLoadingBoxes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    cashboxesService
      .list()
      .then((list) => setCashboxes(list.filter((c) => c.isActive)))
      .catch((e) => setError(getArabicErrorMessage(e, "تعذر تحميل الصناديق")))
      .finally(() => setLoadingBoxes(false));
  }, []);

  const fromBox = cashboxes.find((c) => c.id === Number(from));
  const toBox = cashboxes.find((c) => c.id === Number(to));

  // Frontend pre-validation hints
  const isCrossCurrency = Boolean(fromBox && toBox && fromBox.currency !== toBox.currency);
  const insufficientBalance = fromBox && amount > 0 && Number(fromBox.balance) < amount;
  const sameBox = from && to && from === to;

  const canSubmit =
    from && to && amount > 0 && !sameBox && !insufficientBalance && (!isCrossCurrency || exchangeRate > 0) && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await cashboxesService.transfer({
        from_cashbox_id: Number(from),
        to_cashbox_id: Number(to),
        amount,
        exchange_rate: isCrossCurrency ? exchangeRate : undefined,
        transaction_date: date,
        notes: notes || null,
      });
      nav(PATHS.CASHBOXES);
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

  return (
    <>
      <PageHeader
        title="تحويل بين الصناديق"
        description="ينشئ التحويل حركة خروج من المصدر وحركة دخول إلى الوجهة. يمكن عكس التحويل من صفحة تفاصيل الصندوق."
        actions={<BackButton to={PATHS.CASHBOXES} />}
      />

      <Card header="بيانات التحويل">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="من صندوق">
            <Select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              options={[
                { value: "", label: "اختر الصندوق المصدر" },
                ...cashboxes.map((c) => ({
                  value: String(c.id),
                  label: `${c.name} — الرصيد: ${formatMoney(c.balance, c.currency)}`,
                })),
              ]}
            />
          </FormField>

          <FormField label="إلى صندوق">
            <Select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              options={[
                { value: "", label: "اختر الصندوق الوجهة" },
                ...cashboxes.map((c) => ({
                  value: String(c.id),
                  label: `${c.name} (${currencyName(c.currency)} · ${currencySymbol(c.currency)})`,
                })),
              ]}
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

          {isCrossCurrency && (
            <FormField label="سعر الصرف">
              <Input
                type="number"
                min="0.0001"
                step="any"
                value={exchangeRate || ""}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
                placeholder="أدخل سعر الصرف"
              />
            </FormField>
          )}

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

        {/* Live validation hints */}
        {sameBox && (
          <p className="mt-3 text-sm text-[var(--warning)]">لا يمكن التحويل بين نفس الصندوق.</p>
        )}
        {isCrossCurrency && (
          <div className="mt-3 text-sm text-[var(--primary)] bg-[var(--primary-muted)] p-3 rounded-md">
            عملة الصندوقين مختلفة ({currencyName(fromBox?.currency)} ← {currencyName(toBox?.currency)}).
            {exchangeRate > 0 && (
              <div className="mt-1 font-medium">
                {fromBox?.currency === 'USD' && toBox?.currency === 'SYP' 
                  ? `سيتم إيداع: ${formatMoney(amount * exchangeRate, toBox?.currency)}`
                  : fromBox?.currency === 'SYP' && toBox?.currency === 'USD'
                  ? `سيتم إيداع: ${formatMoney(amount / exchangeRate, toBox?.currency)}`
                  : `سيتم إيداع: ${formatMoney(amount * exchangeRate, toBox?.currency)}`
                }
              </div>
            )}
          </div>
        )}
        {insufficientBalance && !sameBox && (
          <p className="mt-3 text-sm text-[var(--warning)]">
            الرصيد الحالي ({formatMoney(fromBox?.balance, fromBox?.currency)}) أقل من المبلغ المطلوب.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-[var(--danger-muted)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </Card>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => nav(PATHS.CASHBOXES)}>
          إلغاء
        </Button>
        <Button disabled={!canSubmit} onClick={handleSave}>
          {saving ? "جارٍ التحويل…" : "تنفيذ التحويل"}
        </Button>
      </div>
    </>
  );
}
