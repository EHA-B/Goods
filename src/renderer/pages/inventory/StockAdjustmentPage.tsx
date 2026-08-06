import { notifyError, notifySuccess, notifyValidation } from "../../lib/notifications";
import { ArrowDownToLine, ArrowUpFromLine, PackageCheck, Scale } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BackButton,
  Button,
  Card,
  FormField,
  LoadingSpinner,
  NumberInput,
  PageHeader,
  Select,
  Textarea,
} from "../../components/ui";
import {
  getInventoryErrorMessage,
  inventoryService,
  type InventoryItem,
  type StockBatch,
} from "./inventoryService";

const OPERATION_OPTIONS = [
  { value: "add", label: "إضافة إلى الدفعة" },
  { value: "subtract", label: "خصم من الدفعة" },
];

type FieldErrors = {
  batchId?: string;
  quantity?: string;
  reason?: string;
};

export default function StockAdjustmentPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const id = Number(productId);

  const [product, setProduct] = useState<InventoryItem>();
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [batchId, setBatchId] = useState("");
  const [operation, setOperation] = useState<"add" | "subtract">("subtract");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const batchRef = useRef<HTMLSelectElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const details = await inventoryService.productDetails(id);

        if (!cancelled) {
          setProduct(details.item);
          const active = details.batches.filter((batch) => batch.isActive);
          setBatches(active);

          if (active.length) {
            setBatchId(String(active[0].id));
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getInventoryErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const selectedBatch = useMemo(
    () => batches.find((batch) => batch.id === Number(batchId)),
    [batches, batchId],
  );

  const amount = Number(quantity) || 0;
  const beforeQuantity = selectedBatch?.remainingQuantity ?? 0;
  const signedChange = operation === "add" ? amount : -amount;
  const expectedQuantity = beforeQuantity + signedChange;
  const isExpectedNegative = expectedQuantity < 0;

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusFirstError(errors: FieldErrors) {
    window.requestAnimationFrame(() => {
      if (errors.batchId) {
        batchRef.current?.focus();
        batchRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (errors.quantity) {
        quantityRef.current?.focus();
        quantityRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (errors.reason) {
        reasonRef.current?.focus();
        reasonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (!selectedBatch) {
      errors.batchId = "اختر دفعة موجودة لإجراء التسوية عليها.";
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.quantity = "أدخل كمية أكبر من صفر.";
    } else if (
      operation === "subtract" &&
      selectedBatch &&
      amount > selectedBatch.remainingQuantity
    ) {
      errors.quantity = "لا يمكن خصم كمية أكبر من الرصيد المتوفر في الدفعة.";
    }

    if (!reason.trim()) {
      errors.reason = "سبب التسوية مطلوب لتوثيق حركة المخزون.";
    }

    return errors;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      notifyValidation("يرجى تصحيح الحقول المحددة قبل حفظ تسوية المخزون.");
      focusFirstError(errors);
      return;
    }

    if (!selectedBatch) {
      return;
    }

    try {
      setIsSaving(true);

      await inventoryService.adjust(id, {
        stock_batch_id: selectedBatch.id,
        type: operation,
        quantity: amount,
        reason: reason.trim(),
        notes: notes.trim() || null,
      });

      notifySuccess("تم تسجيل التسوية وتحديث رصيد الدفعة بنجاح.");
      navigate(`/inventory/${id}`);
    } catch (error) {
      notifyError(error, {
        title: "تعذر حفظ تسوية المخزون",
        fallback: getInventoryErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <Card>
        <div className="space-y-4 text-center">
          <p className="text-sm font-medium text-[var(--danger)]">
            {loadError || "تعذر العثور على المادة المطلوبة."}
          </p>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            رجوع
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <PageHeader
        title="تسوية المخزون"
        description="تعديل رصيد دفعة محددة مع توثيق سبب التسوية والرصيد قبل وبعد العملية."
        actions={<BackButton />}
      />

      <Card padding={false}>
        <div className="grid divide-y divide-[var(--border)] md:grid-cols-3 md:divide-x md:divide-x-reverse md:divide-y-0">
          <HeaderInfo label="المادة" value={product.productName} />
          <HeaderInfo label="الكود" value={product.productCode || "—"} />
          <HeaderInfo
            label="الرصيد الإجمالي"
            value={`${product.totalQuantity.toLocaleString("en-US")} ${product.unit}`}
          />
        </div>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card
            header="بيانات التسوية"
            description="حدد الدفعة ونوع الحركة والكمية المراد تعديلها."
          >
            <div className="grid gap-x-5 gap-y-1 md:grid-cols-2">
              <FormField
                label="الدفعة"
                htmlFor="stock-adjustment-batch"
                required
                error={fieldErrors.batchId}
              >
                <Select
                  ref={batchRef}
                  id="stock-adjustment-batch"
                  value={batchId}
                  error={Boolean(fieldErrors.batchId)}
                  placeholder={batches.length ? "اختر الدفعة" : "لا توجد دفعات نشطة"}
                  options={batches.map((batch) => ({
                    value: String(batch.id),
                    label: `${batch.batchCode} — المتبقي ${batch.remainingQuantity.toLocaleString("en-US")} ${product.unit}`,
                  }))}
                  onChange={(event) => {
                    setBatchId(event.target.value);
                    clearFieldError("batchId");
                  }}
                />
              </FormField>

              <FormField
                label="نوع التسوية"
                htmlFor="stock-adjustment-operation"
                required
                hint={
                  operation === "add"
                    ? "تُستخدم عند وجود زيادة فعلية أو تصحيح نقص سابق."
                    : "تُستخدم للتلف أو فرق الجرد أو تصحيح زيادة سابقة."
                }
              >
                <Select
                  id="stock-adjustment-operation"
                  value={operation}
                  options={OPERATION_OPTIONS}
                  onChange={(event) => {
                    setOperation(event.target.value as "add" | "subtract");
                    clearFieldError("quantity");
                  }}
                />
              </FormField>

              <FormField
                label="الكمية"
                htmlFor="stock-adjustment-quantity"
                required
                error={fieldErrors.quantity}
              >
                <NumberInput
                  ref={quantityRef}
                  id="stock-adjustment-quantity"
                  min={0.001}
                  step={0.001}
                  value={String(quantity)}
                  suffix={product.unit}
                  error={Boolean(fieldErrors.quantity)}
                  onChange={(event) => {
                    setQuantity(Number(event.target.value));
                    clearFieldError("quantity");
                  }}
                />
              </FormField>

              <FormField
                label="سبب التسوية"
                htmlFor="stock-adjustment-reason"
                required
                error={fieldErrors.reason}
              >
                <Textarea
                  ref={reasonRef}
                  id="stock-adjustment-reason"
                  rows={3}
                  className="min-h-28"
                  value={reason}
                  error={Boolean(fieldErrors.reason)}
                  placeholder="مثال: تلف، فرق جرد، تصحيح إدخال"
                  onChange={(event) => {
                    setReason(event.target.value);
                    clearFieldError("reason");
                  }}
                />
              </FormField>

              <FormField
                label="ملاحظات"
                htmlFor="stock-adjustment-notes"
                className="md:col-span-2"
                hint="اختياري — أضف أي تفاصيل تساعد في مراجعة العملية لاحقًا."
              >
                <Textarea
                  id="stock-adjustment-notes"
                  rows={3}
                  className="min-h-24"
                  value={notes}
                  placeholder="تفاصيل إضافية عن سبب أو ظروف التسوية..."
                  onChange={(event) => setNotes(event.target.value)}
                />
              </FormField>
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={isSaving}
              onClick={() => navigate(-1)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={!batches.length}
              isLoading={isSaving}
              startIcon={<PackageCheck size={17} />}
            >
              حفظ التسوية
            </Button>
          </div>
        </div>

        <aside className="xl:sticky xl:top-6">
          <Card
            header="ملخص العملية"
            description="راجع أثر التسوية قبل الحفظ."
          >
            <div className="space-y-4">
              <SummaryRow
                label="الدفعة المختارة"
                value={selectedBatch?.batchCode || "لم تُحدد"}
              />
              <SummaryRow
                label="الرصيد قبل"
                value={`${beforeQuantity.toLocaleString("en-US")} ${product.unit}`}
              />

              <div
                className={[
                  "flex items-center justify-between rounded-[var(--radius-sm)] border p-4",
                  operation === "add"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      operation === "add"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600",
                    ].join(" ")}
                  >
                    {operation === "add" ? (
                      <ArrowDownToLine size={18} />
                    ) : (
                      <ArrowUpFromLine size={18} />
                    )}
                  </span>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">التغيير</p>
                    <p className="font-bold text-[var(--text-primary)]">
                      {operation === "add" ? "+" : "-"}
                      {amount.toLocaleString("en-US")} {product.unit}
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={[
                  "rounded-[var(--radius-sm)] border p-4",
                  isExpectedNegative
                    ? "border-[var(--danger)] bg-[var(--danger)]/5"
                    : "border-[var(--primary)]/30 bg-[var(--primary)]/5",
                ].join(" ")}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <Scale size={17} />
                  الرصيد المتوقع بعد التسوية
                </div>
                <p
                  className={[
                    "text-2xl font-extrabold",
                    isExpectedNegative
                      ? "text-[var(--danger)]"
                      : "text-[var(--primary)]",
                  ].join(" ")}
                >
                  {expectedQuantity.toLocaleString("en-US")} {product.unit}
                </p>
                {isExpectedNegative && (
                  <p className="mt-2 text-xs font-medium text-[var(--danger)]">
                    لا يمكن أن يصبح رصيد الدفعة سالبًا.
                  </p>
                )}
              </div>

              <p className="text-xs leading-5 text-[var(--text-muted)]">
                سيتم تسجيل الرصيد قبل وبعد وسبب التسوية ضمن حركة المخزون وسجل النشاط.
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}

function HeaderInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 truncate font-bold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-left text-sm font-bold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
