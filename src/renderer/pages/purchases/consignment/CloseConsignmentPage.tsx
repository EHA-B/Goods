import { getArabicErrorMessage } from "../../../lib/errorNormalizer";
import { Calculator, HandCoins, Info } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import CommissionPreviewCard from "../../../components/consignment/CommissionPreviewCard";
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
  ManualConsignmentItemInput,
} from "./consignmentTypes";
import { money } from "./consignmentUtils";

const today = new Date().toISOString().slice(0, 10);

type ItemDraft = {
  purchase_invoice_item_id: number | null;
  product_id: number;
  product_name: string;
  product_unit: string;
  received_quantity: number;
  estimated_unit_price: number;
  sold_quantity: string;
  sales_amount: string;
};

export default function CloseConsignmentPage() {
  const { purchaseId } = useParams();
  const id = Number(purchaseId);
  const navigate = useNavigate();

  const [summary, setSummary] =
    useState<ConsignmentInvoiceSummary | null>(null);
  const [cashboxes, setCashboxes] =
    useState<ConsignmentCashbox[]>([]);
  const [inputMode, setInputMode] = useState<"per_item" | "overall">("per_item");
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([]);
  const [overallSoldQty, setOverallSoldQty] = useState("");
  const [overallSalesAmount, setOverallSalesAmount] = useState("");
  const [commission, setCommission] = useState("10");
  const [cashboxId, setCashboxId] = useState("");
  const [date, setDate] = useState(today);
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

        const initialDrafts: ItemDraft[] = loadedSummary.items.map((item) => {
          const estTotal = Math.round(
            Number(item.received_quantity || 0) * Number(item.estimated_unit_price || 0) * 100
          ) / 100;
          return {
            purchase_invoice_item_id: item.purchase_invoice_item_id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_unit: item.product_unit ?? "",
            received_quantity: Number(item.received_quantity || 0),
            estimated_unit_price: Number(item.estimated_unit_price || 0),
            sold_quantity: String(item.received_quantity || 0),
            sales_amount: estTotal > 0 ? String(estTotal) : "0",
          };
        });
        setItemDrafts(initialDrafts);

        const totalRecQty = initialDrafts.reduce((s, r) => s + r.received_quantity, 0);
        const totalEstSales = initialDrafts.reduce((s, r) => s + (Number(r.sales_amount) || 0), 0);
        setOverallSoldQty(String(totalRecQty));
        setOverallSalesAmount(String(Math.round(totalEstSales * 100) / 100));

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

  const manualItemsPayload = useMemo<ManualConsignmentItemInput[]>(
    () =>
      itemDrafts.map((row) => ({
        purchase_invoice_item_id: row.purchase_invoice_item_id,
        product_id: row.product_id,
        sold_quantity: Math.max(0, Number(row.sold_quantity) || 0),
        sales_amount: Math.max(0, Number(row.sales_amount) || 0),
      })),
    [itemDrafts],
  );

  const computedSoldQty = useMemo(
    () =>
      inputMode === "per_item"
        ? manualItemsPayload.reduce((sum, r) => sum + r.sold_quantity, 0)
        : Math.max(0, Number(overallSoldQty) || 0),
    [inputMode, manualItemsPayload, overallSoldQty],
  );

  const computedTotalSales = useMemo(
    () =>
      inputMode === "per_item"
        ? Math.round(manualItemsPayload.reduce((sum, r) => sum + r.sales_amount, 0) * 100) / 100
        : Math.max(0, Number(overallSalesAmount) || 0),
    [inputMode, manualItemsPayload, overallSalesAmount],
  );

  const input = useMemo<CloseConsignmentInput>(
    () => ({
      commission_percentage: Number(commission),
      cashbox_id: Number(cashboxId),
      settlement_date: date,
      items: inputMode === "per_item" ? manualItemsPayload : undefined,
      sold_quantity: computedSoldQty,
      total_sales_amount: computedTotalSales,
      remaining_stock_policy: "manual",
      notes: notes.trim() || null,
    }),
    [commission, cashboxId, date, inputMode, manualItemsPayload, computedSoldQty, computedTotalSales, notes],
  );

  useEffect(() => {
    if (!summary || !cashboxId) {
      setPreview(null);
      return;
    }

    const timer = window.setTimeout(() => {
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
    }, 150);

    return () => window.clearTimeout(timer);
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

  const updateItemDraft = (index: number, patch: Partial<ItemDraft>) => {
    setItemDrafts((curr) =>
      curr.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

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
        title="إغلاق وتسوية فاتورة الأمانة (يدوي)"
        description="أدخل الكمية المباعة وإجمالي المبيعات ونسبة العمولة، وسيتم احتساب عمولتك وسحب حصة المورد من الصندوق دون أي تعديل على المخزون."
        actions={
          <BackButton to={`/purchases/${id}/consignment`} />
        }
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
        <Info size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" />
        <span>
          هذه التسوية مالية بالكامل ولا تخصم أو تعدّل أي كميات في المخزون؛ يمكنك إغلاق فاتورة الأمانة في أي وقت حتى لو بقي جزء من البضاعة في المستودع.
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card header="بيانات فاتورة الأمانة">
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["رقم الفاتورة", summary.invoice.invoice_number],
                  ["المورد", summary.invoice.supplier_name],
                  ["إجمالي الكمية المستلمة", summary.stock.received_quantity.toLocaleString("en-US")],
                  ["العملة", summary.invoice.currency],
                  [
                    "المدفوع مسبقاً للمورد",
                    summary.invoice.paid_amount > 0
                      ? money(summary.invoice.paid_amount, summary.invoice.currency)
                      : "—",
                  ],
                  ...(summary.invoice.transport_cost > 0
                    ? [[`تكلفة النقل (${summary.invoice.transport_cost_bearer === "supplier" ? "على المورد" : "علينا"})`, `${summary.invoice.transport_cost_bearer === "supplier" ? "− " : "+ "}${money(summary.invoice.transport_cost, summary.invoice.currency)}`]]
                    : []),
                  ...(summary.invoice.emptying_cost > 0
                    ? [[`تكلفة العتالة (${summary.invoice.emptying_cost_bearer === "supplier" ? "على المورد" : "علينا"})`, `${summary.invoice.emptying_cost_bearer === "supplier" ? "− " : "+ "}${money(summary.invoice.emptying_cost, summary.invoice.currency)}`]]
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

          <Card
            header="المبيعات الفعلية (إدخال يدوي)"
            description="أدخل الكمية المباعة وإجمالي قيمة المبيع حسب كل صنف أو كإجمالي عام للفاتورة."
          >
            {itemDrafts.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={inputMode === "per_item" ? "primary" : "secondary"}
                  onClick={() => setInputMode("per_item")}
                >
                  تفصيل حسب الصنف
                </Button>
                <Button
                  size="sm"
                  variant={inputMode === "overall" ? "primary" : "secondary"}
                  onClick={() => {
                    setOverallSoldQty(String(computedSoldQty));
                    setOverallSalesAmount(String(computedTotalSales));
                    setInputMode("overall");
                  }}
                >
                  إدخال إجمالي عام واحد
                </Button>
              </div>
            )}

            {inputMode === "per_item" ? (
              <div className="space-y-3">
                {itemDrafts.map((row, index) => (
                  <div
                    key={row.purchase_invoice_item_id ?? `${row.product_id}-${index}`}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-black text-[var(--text-primary)]">
                          {row.product_name}
                          {row.product_unit ? ` (${row.product_unit})` : ""}
                        </span>
                        <span className="mr-3 text-xs text-[var(--text-muted)]">
                          المستلم: {row.received_quantity.toLocaleString("en-US")} · سعر التسويق المرجعي:{" "}
                          {money(row.estimated_unit_price, summary.invoice.currency)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        startIcon={<Calculator size={14} />}
                        onClick={() => {
                          const qty = Number(row.sold_quantity) || 0;
                          const calc = Math.round(qty * row.estimated_unit_price * 100) / 100;
                          updateItemDraft(index, { sales_amount: String(calc) });
                        }}
                      >
                        حساب بسعر التسويق
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="الكمية المباعة" required>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={row.sold_quantity}
                          onChange={(e) =>
                            updateItemDraft(index, { sold_quantity: e.target.value })
                          }
                        />
                      </FormField>

                      <FormField label={`إجمالي المبيع (${summary.invoice.currency})`} required>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={row.sales_amount}
                          onChange={(e) =>
                            updateItemDraft(index, { sales_amount: e.target.value })
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--border)] px-4 py-3 text-sm">
                  <span>
                    إجمالي الكمية المباعة: <strong>{computedSoldQty.toLocaleString("en-US")}</strong>
                  </span>
                  <span>
                    إجمالي قيمة المبيعات:{" "}
                    <strong className="text-[var(--primary)]">
                      {money(computedTotalSales, summary.invoice.currency)}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="إجمالي الكمية المباعة" required>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={overallSoldQty}
                    onChange={(e) => setOverallSoldQty(e.target.value)}
                  />
                </FormField>

                <FormField label={`إجمالي قيمة المبيعات (${summary.invoice.currency})`} required>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={overallSalesAmount}
                    onChange={(e) => setOverallSalesAmount(e.target.value)}
                  />
                </FormField>
              </div>
            )}
          </Card>

          <Card header="بيانات العمولة والصندوق">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="نسبة العمولة (لنا)" required>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
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
                label={`الصندوق لسحب حصة المورد (${summary.invoice.currency})`}
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
        title="تأكيد تسوية فاتورة الأمانة"
        message={`سيتم اعتماد كمية مباعة قدرها ${computedSoldQty.toLocaleString("en-US")} بإجمالي مبيعات ${money(
          preview?.total_sales_amount ?? 0,
          summary.invoice.currency,
        )}، وعمولة ${commission}% (${money(
          preview?.commission_amount ?? 0,
          summary.invoice.currency,
        )})، وحصة مورد ${money(
          preview?.supplier_share_base ?? 0,
          summary.invoice.currency,
        )}${
          (preview?.prepaid_amount ?? 0) > 0
            ? ` (مدفوع مسبقاً: ${money(
                preview!.prepaid_amount,
                summary.invoice.currency,
              )}، صافي يُسحب من الصندوق: ${money(
                preview!.net_supplier_payout,
                summary.invoice.currency,
              )})`
            : ` تُسحب من الصندوق المختار`
        }. لن يتأثر المخزون بهذه التسوية.`}
        confirmText="تأكيد التسوية وسحب حصة المورد"
        cancelText="مراجعة"
        loading={submitting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void submit()}
      />
    </>
  );
}
