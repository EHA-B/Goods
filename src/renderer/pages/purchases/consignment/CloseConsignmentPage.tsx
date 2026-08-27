import { getArabicErrorMessage } from "../../../lib/errorNormalizer";
import { HandCoins } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CommissionPreviewCard from "../../../components/consignment/CommissionPreviewCard";
import RemainingStockPolicySelector from "../../../components/consignment/RemainingStockPolicySelector";
import {
  BackButton,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Input,
  LoadingSpinner,
  PageHeader,
  Select,
  Textarea,
} from "../../../components/ui";
import { consignmentService } from "./consignmentService";
import type {
  CloseConsignmentInput,
  ConsignmentCashbox,
  ConsignmentClosingPreview,
  ConsignmentInvoiceSummary,
  RemainingStockPolicy,
} from "./consignmentTypes";
import { money, policyLabels } from "./consignmentUtils";

const today = new Date().toISOString().slice(0, 10);

export default function CloseConsignmentPage() {
  const { purchaseId } = useParams();
  const id = Number(purchaseId);
  const navigate = useNavigate();

  const [summary, setSummary] =
    useState<ConsignmentInvoiceSummary | null>(null);
  const [cashboxes, setCashboxes] =
    useState<ConsignmentCashbox[]>([]);
  const [commission, setCommission] = useState("10");
  const [cashboxId, setCashboxId] = useState("");
  const [date, setDate] = useState(today);
  const [policy, setPolicy] =
    useState<RemainingStockPolicy>("return_to_supplier");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] =
    useState<ConsignmentClosingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setError("");

        const [loadedSummary, loadedCashboxes] = await Promise.all([
          consignmentService.getSummary(id),
          consignmentService.getCashboxes(),
        ]);

        const normalizedCashboxes: ConsignmentCashbox[] =
          loadedCashboxes.map((cashbox) => ({
            ...cashbox,
            isActive: Boolean(cashbox.isActive),
          }));

        setSummary(loadedSummary);
        setCashboxes(normalizedCashboxes);

        const matchingCashbox = normalizedCashboxes.find(
          (cashbox) =>
            cashbox.isActive &&
            cashbox.currency === loadedSummary.invoice.currency,
        );

        setCashboxId(
          matchingCashbox ? String(matchingCashbox.id) : "",
        );
      } catch (loadError) {
        setError(
          getArabicErrorMessage(
            loadError,
            "تعذر تحميل بيانات التسوية.",
          ),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const matchingCashboxes = useMemo(
    () =>
      cashboxes.filter(
        (cashbox) =>
          cashbox.isActive &&
          cashbox.currency === summary?.invoice.currency,
      ),
    [cashboxes, summary?.invoice.currency],
  );

  const input = useMemo<CloseConsignmentInput>(
    () => ({
      commission_percentage: Number(commission),
      cashbox_id: Number(cashboxId),
      settlement_date: date,
      remaining_stock_policy: policy,
      notes: notes.trim() || null,
    }),
    [commission, cashboxId, date, policy, notes],
  );

  useEffect(() => {
    if (!summary || !cashboxId) {
      setPreview(null);
      return;
    }

    void consignmentService
      .getClosingPreview(id, input)
      .then((value) => {
        setPreview(value);
        setError("");
      })
      .catch((previewError) => {
        setPreview(null);
        setError(
          getArabicErrorMessage(
            previewError,
            "تعذر حساب معاينة التسوية.",
          ),
        );
      });
  }, [summary, id, input, cashboxId]);

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] p-5 text-sm font-bold text-[var(--danger)]">
        {error || "تعذر تحميل بيانات التسوية."}
      </div>
    );
  }

  const submit = async () => {
    try {
      setSubmitting(true);
      setError("");

      if (!preview?.calculation_hash) {
        throw new Error("يجب تحديث المعاينة قبل التسوية.");
      }

      const result = await consignmentService.close(id, {
        ...input,
        calculation_hash: preview.calculation_hash,
      });

      navigate(`/purchases/${id}/consignment-settlement`, {
        state: { settlement: result },
      });
    } catch (submitError) {
      setError(
        getArabicErrorMessage(
          submitError,
          "تعذر إتمام التسوية.",
        ),
      );
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <PageHeader
        title="إغلاق وتسوية فاتورة الأمانة"
        description="راجع المبيعات والعمولة والصندوق ومصير الكمية المتبقية قبل التأكيد. يجب أن تكون عملة الصندوق مطابقة لعملة الفاتورة."
        actions={
          <BackButton to={`/purchases/${id}/consignment`} />
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card header="بيانات الفاتورة">
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["رقم الفاتورة", summary.invoice.invoice_number],
                  ["المورد", summary.invoice.supplier_name],
                  [
                    "إجمالي المبيعات",
                    money(
                      summary.sales.total_sales_amount,
                      summary.invoice.currency,
                    ),
                  ],
                  ["الكمية المباعة", summary.sales.sold_quantity],
                  ["الكمية المتبقية", summary.stock.remaining_quantity],
                  ["العملة", summary.invoice.currency],
                  ...(summary.invoice.transport_cost > 0
                    ? [["تكلفة النقل", money(summary.invoice.transport_cost, summary.invoice.currency)]]
                    : []),
                  ...(summary.invoice.emptying_cost > 0
                    ? [["تكلفة العتالة", money(summary.invoice.emptying_cost, summary.invoice.currency)]]
                    : []),
                ] as [string, React.ReactNode][]
              ).map(([label, value]) => (
                <div key={String(label)}>
                  <p className="text-xs font-bold text-[var(--text-muted)]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card header="بيانات التسوية">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="نسبة العمولة" required>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={commission}
                  onChange={(event) =>
                    setCommission(event.target.value)
                  }
                  endContent={
                    <span className="px-3 text-sm text-[var(--text-muted)]">
                      %
                    </span>
                  }
                />
              </FormField>

              <FormField label="تاريخ التسوية" required>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </FormField>

              <FormField
                label={`الصندوق (${summary.invoice.currency})`}
                required
                hint="تظهر فقط الصناديق النشطة التي تطابق عملة فاتورة الأمانة."
              >
                <Select
                  value={cashboxId}
                  onChange={(event) =>
                    setCashboxId(event.target.value)
                  }
                  placeholder="اختر الصندوق"
                  options={matchingCashboxes.map((cashbox) => ({
                    value: String(cashbox.id),
                    label: `${cashbox.name} — ${money(
                      cashbox.balance,
                      cashbox.currency,
                    )}`,
                  }))}
                />
              </FormField>

              <FormField label="الملاحظات">
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="ملاحظات اختيارية حول التسوية"
                />
              </FormField>
            </div>

            {matchingCashboxes.length === 0 && (
              <div className="mt-4 rounded-lg border border-[var(--warning)] bg-[var(--warning-subtle)] p-3 text-sm font-bold text-[var(--warning)]">
                لا يوجد صندوق نشط بعملة {summary.invoice.currency}.
                أنشئ أو فعّل صندوقًا بنفس العملة قبل إتمام التسوية.
              </div>
            )}
          </Card>

          <Card
            header="معالجة الكمية المتبقية"
            description="يجب تحديد مصير المتبقي بدل اعتباره تالفًا تلقائيًا."
          >
            <RemainingStockPolicySelector
              value={policy}
              onChange={setPolicy}
            />
          </Card>

          <div className="flex justify-end">
            <Button
              startIcon={<HandCoins size={18} />}
              disabled={
                !preview?.can_submit ||
                submitting ||
                !cashboxId
              }
              onClick={() => setConfirmOpen(true)}
            >
              مراجعة وتأكيد التسوية
            </Button>
          </div>
        </div>

        {preview && (
          <CommissionPreviewCard preview={preview} />
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="تأكيد إغلاق فاتورة الأمانة"
        message={`سيتم اعتماد إجمالي مبيعات ${money(
          preview?.total_sales_amount ?? 0,
          summary.invoice.currency,
        )}، وعمولة ${commission}%، وحصة مورد إجمالية ${money(
          preview?.adjusted_supplier_share ?? 0,
          summary.invoice.currency,
        )}${
          (preview?.prepaid_amount ?? 0) > 0
            ? ` (مدفوع مسبقاً: ${money(
                preview!.prepaid_amount,
                summary.invoice.currency,
              )}، صافي من الصندوق: ${money(
                preview!.net_supplier_payout,
                summary.invoice.currency,
              )})`
            : ""
        }${
          summary.invoice.transport_cost > 0 || summary.invoice.emptying_cost > 0
            ? `\n\nالمصاريف الإضافية المسجلة: ${
                summary.invoice.transport_cost > 0
                  ? `تكلفة نقل ${money(summary.invoice.transport_cost, summary.invoice.currency)}`
                  : ""
              }${
                summary.invoice.transport_cost > 0 && summary.invoice.emptying_cost > 0 ? "، " : ""
              }${
                summary.invoice.emptying_cost > 0
                  ? `تكلفة عتالة ${money(summary.invoice.emptying_cost, summary.invoice.currency)}`
                  : ""
              } (مسجلة كمصروفات ضمن الحسابات).`
            : ""
        }، ومعالجة المتبقي عبر: ${policyLabels[policy]}. سيتم تنفيذ جميع الآثار المخزنية والمالية وحفظها في قاعدة البيانات.`}
        confirmText="تأكيد التسوية"
        cancelText="مراجعة"
        loading={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void submit()}
      />
    </>
  );
}
