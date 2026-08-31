import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { Banknote, HandCoins, Plus, Pencil, Printer, ReceiptText, RotateCcw, Trash2, XCircle, SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import DataTableBody from "../../components/common/DataTableBody";
import DataTableCell from "../../components/common/DataTableCell";
import DataTableHead from "../../components/common/DataTableHead";
import DataTableHeaderCell from "../../components/common/DataTableHeaderCell";
import DataTableRow from "../../components/common/DataTableRow";
import PurchaseStatusBadge from "../../components/purchases/PurchaseStatusBadge";
import { BackButton, Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";

const money = (value: number, currency = "SYP") =>
  `${value.toLocaleString("en-US")} ${currency === "SYP" ? "ل.س" : currency}`;
const typeLabels: Record<string, string> = { standard: "فاتورة عادية", consignment: "فاتورة أمانة" };

// ─── Adjust Paid Amount Dialog ─────────────────────────────────────────────

type AdjustDialogState = {
  open: boolean;
  direction: "add" | "reduce";
  amount: string;
  cashboxId: string;
  date: string;
  notes: string;
  submitting: boolean;
  error: string;
};

const EMPTY_ADJUST: AdjustDialogState = {
  open: false,
  direction: "add",
  amount: "",
  cashboxId: "",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
  submitting: false,
  error: "",
};

export default function PurchaseDetailsPage() {
  const navigate = useNavigate();
  const { purchaseId } = useParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [details, setDetails] = useState<PurchaseInvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Cashbox list for the adjustment dialog
  const [cashboxes, setCashboxes] = useState<CashboxApiRecord[]>([]);
  const [adjust, setAdjust] = useState<AdjustDialogState>(EMPTY_ADJUST);

  const loadDetails = async (id: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await purchasesService.getDetails(id);
      setDetails(data);
    } catch (err: unknown) {
      setError(getArabicErrorMessage(err as Error, "خطأ في تحميل الفاتورة"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = Number(purchaseId);
    if (!id) return;
    loadDetails(id);
    // Pre-fetch cashbox list for the adjustment dialog
    purchasesService.getLookups().then(({ cashboxes: cb }) => setCashboxes(cb)).catch(() => {});
  }, [purchaseId]);

  if (loading) return <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>;
  if (error || !details) return <EmptyState icon={<ReceiptText size={32} />} title="خطأ في التحميل" description={error || "تعذر العثور على فاتورة الشراء المطلوبة."} />;

  const { invoice, supplier, items, payments, financial_summary, activity } = details;
  const editHistory = (activity ?? []).filter((entry) => entry.action === "purchase_edited");
  const editable = invoice.status === "draft";
  const canCancel = ["confirmed", "partially_paid", "paid"].includes(invoice.status);
  // Allow paid-amount adjustment on any non-cancelled invoice
  const canAdjustPaid = invoice.status !== "cancelled";

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const reason = window.prompt("اكتب سبب إلغاء فاتورة الشراء:", "إلغاء بطلب المستخدم");
      if (!reason?.trim()) { setCancelling(false); return; }
      const updated = await purchasesService.cancel(invoice.id, reason.trim());
      setDetails(updated);
      setCancelOpen(false);
    } catch (err: unknown) {
      const e = err as Error;
      setError(getArabicErrorMessage(e, "تعذر إلغاء الفاتورة"));
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await purchasesService.deleteDraft(invoice.id);
      navigate(PATHS.PURCHASES);
    } catch (err: unknown) {
      const e = err as Error;
      setError(getArabicErrorMessage(e, "تعذر حذف الفاتورة"));
    } finally {
      setDeleting(false);
    }
  };

  // ─── Adjust paid amount handler ─────────────────────────────────────────

  const openAdjustDialog = (direction: "add" | "reduce") => {
    setAdjust({ ...EMPTY_ADJUST, open: true, direction, date: new Date().toISOString().slice(0, 10) });
  };

  const handleAdjustSubmit = async () => {
    const amount = parseFloat(adjust.amount);
    if (!amount || amount <= 0) {
      setAdjust((a) => ({ ...a, error: "يرجى إدخال مبلغ صحيح أكبر من الصفر" }));
      return;
    }
    if (!adjust.cashboxId) {
      setAdjust((a) => ({ ...a, error: "يرجى اختيار الصندوق" }));
      return;
    }
    if (!adjust.date) {
      setAdjust((a) => ({ ...a, error: "يرجى تحديد التاريخ" }));
      return;
    }

    setAdjust((a) => ({ ...a, submitting: true, error: "" }));
    try {
      if (adjust.direction === "add") {
        // Regular payment: money OUT of cashbox, supplier balance DOWN, paid_amount UP
        await purchasesService.recordPayment({
          purchase_invoice_id: invoice.id,
          cashbox_id: Number(adjust.cashboxId),
          amount,
          payment_date: adjust.date,
          notes: adjust.notes || "تصحيح / زيادة مبلغ مدفوع",
        } as never);
      } else {
        // Refund: money IN to cashbox, supplier balance UP, paid_amount DOWN
        await purchasesService.recordPaymentRefund({
          purchase_invoice_id: invoice.id,
          cashbox_id: Number(adjust.cashboxId),
          amount,
          payment_date: adjust.date,
          notes: adjust.notes || "تصحيح / استرداد مبلغ مدفوع",
        });
      }
      setAdjust(EMPTY_ADJUST);
      await loadDetails(invoice.id);
    } catch (err: unknown) {
      setAdjust((a) => ({
        ...a,
        submitting: false,
        error: getArabicErrorMessage(err as Error, "تعذر تنفيذ التعديل"),
      }));
    }
  };

  const cashboxOptions = [
    { value: "", label: "— اختر الصندوق —" },
    ...cashboxes.map((c) => ({ value: String(c.id), label: `${c.name} (${c.currency})` })),
  ];

  const adjustTitle = adjust.direction === "add" ? "زيادة المبلغ المدفوع" : "تخفيض المبلغ المدفوع";
  const adjustDesc =
    adjust.direction === "add"
      ? "سيُخصم المبلغ من الصندوق المحدد ويُضاف إلى المدفوع على الفاتورة، مع تخفيض رصيد المورد."
      : "سيُضاف المبلغ إلى الصندوق المحدد ويُخصم من المدفوع على الفاتورة، مع زيادة رصيد المورد.";

  return <>
    <PageHeader
      title={`فاتورة الشراء ${invoice.invoice_number}`}
      description="تفاصيل المورد والأصناف ودفعات المخزون والمدفوعات."
      actions={
        <div className="flex flex-wrap gap-2">
          <BackButton to={PATHS.PURCHASES} />
          {invoice.status !== "cancelled" && (
            <Button variant="secondary" startIcon={<Pencil size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/edit`)}>
              تعديل محمي
            </Button>
          )}
          <Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/print`)}>
            طباعة / PDF
          </Button>
          {invoice.invoice_type === "consignment" && (
            <Button variant="secondary" startIcon={<HandCoins size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/consignment`)}>
              متابعة الأمانة
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" &&
            !(invoice.invoice_type === "consignment" && invoice.settlement_status === "settled") && (
            <Button startIcon={<Plus size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/payments/new`)}>
              تسجيل دفعة
            </Button>
          )}
          {canAdjustPaid && (
            <Button
              variant="secondary"
              startIcon={<SlidersHorizontal size={17} />}
              onClick={() => openAdjustDialog("add")}
              title="تعديل المبلغ المدفوع — زيادة أو تخفيض مع ضمان سلامة الصندوق"
            >
              تعديل المدفوع
            </Button>
          )}
          {canCancel && (
            <Button variant="danger" startIcon={<XCircle size={17} />} onClick={() => setCancelOpen(true)}>
              إلغاء الفاتورة
            </Button>
          )}
          <Button
            variant="danger"
            startIcon={<Trash2 size={17} />}
            disabled={!editable}
            title={!editable ? "الحذف متاح للفواتير المسودة فقط" : undefined}
            onClick={() => setDeleteOpen(true)}
          >
            حذف
          </Button>
        </div>
      }
    />
    <p className="mb-5 text-xs text-[var(--text-muted)]">التعديل محمي بكلمة مرور، ويُرفض تلقائيًا إذا كانت دفعات المخزون الناتجة عن الفاتورة قد دخلت في حركات لاحقة.</p>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card header="بيانات الفاتورة">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["رقم الفاتورة", <span className="inline-flex items-center gap-2">{invoice.invoice_number}{Boolean(invoice.is_edited) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">معدلة</span>}</span>],
              ["التاريخ", invoice.invoice_date],
              ["المورد", supplier?.name ?? "-"],
              ["نوع الفاتورة", typeLabels[invoice.invoice_type] ?? "-"],
              ["العملة", invoice.currency || "SYP"],
              ["الحالة", <PurchaseStatusBadge status={invoice.status as never} />],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-xs font-bold text-[var(--text-muted)]">{label}</p>
                <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">{value}</div>
              </div>
            ))}
          </div>
          {invoice.notes && (
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-bold text-[var(--text-muted)]">الملاحظات</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{invoice.notes}</p>
            </div>
          )}
        </Card>

        {editHistory.length > 0 && <Card header="سجل تعديلات الفاتورة" description="كل حفظ تعديل موثق في سجل النشاط مع النسخة السابقة والجديدة.">
          <div className="space-y-2">{editHistory.map((entry, index) => <div key={String(entry.id ?? index)} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm"><span className="font-bold text-[var(--text-primary)]">تعديل #{editHistory.length - index}</span><span className="text-[var(--text-muted)]">{String(entry.created_at ?? "—")}</span></div>)}</div>
        </Card>}

        <Card padding={false} header="أصناف الفاتورة" description="المنتجات والكميات وأسعار الشراء وبيانات دفعات المخزون.">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                {["المنتج", "الكمية", "سعر الشراء", "الإجمالي", "كود الدفعة", "الاستلام", "الانتهاء"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {items.map((item: Record<string, unknown>, idx) => (
                <DataTableRow key={idx}>
                  <DataTableCell className="font-bold text-[var(--text-primary)]">{String(item.product_name ?? "-")}</DataTableCell>
                  <DataTableCell>{String(item.quantity ?? "-")}</DataTableCell>
                  <DataTableCell>{money(Number(item.unit_price ?? 0), invoice.currency)}</DataTableCell>
                  <DataTableCell>{money(Number(item.line_total ?? 0), invoice.currency)}</DataTableCell>
                  <DataTableCell>{String(item.batch_code ?? "-")}</DataTableCell>
                  <DataTableCell>{String(item.batch_received_date ?? item.received_date ?? "-")}</DataTableCell>
                  <DataTableCell>{String(item.batch_expiry_date ?? item.expiry_date ?? "-")}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>

        {((financial_summary.transport_cost ?? 0) > 0 ||
          (financial_summary.emptying_cost ?? 0) > 0) && (
          <Card header="التكاليف الإضافية" description="تكاليف مرتبطة مباشرة بهذه الفاتورة وتدخل ضمن إجماليها.">
            <div className="grid gap-3 sm:grid-cols-2">
              {(financial_summary.transport_cost ?? 0) > 0 && (
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-xs font-medium text-[var(--text-muted)]">تكلفة النقل</div>
                  <div dir="ltr" className="mt-2 text-right text-lg font-extrabold tabular-nums text-[var(--text-primary)]">
                    {money(Number(financial_summary.transport_cost ?? 0), invoice.currency)}
                  </div>
                </div>
              )}
              {(financial_summary.emptying_cost ?? 0) > 0 && (
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                  <div className="text-xs font-medium text-[var(--text-muted)]">تكلفة العتالة</div>
                  <div dir="ltr" className="mt-2 text-right text-lg font-extrabold tabular-nums text-[var(--text-primary)]">
                    {money(Number(financial_summary.emptying_cost ?? 0), invoice.currency)}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card padding={false} header="سجل الدفعات" description="كل الدفعات المسجلة على فاتورة الشراء.">
          {payments.length ? (
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  {["التاريخ", "الصندوق", "المبلغ", "النوع", "الحالة", "الملاحظات", "الإجراء"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {payments.map((payment) => {
                  const isRefund = (payment as Record<string, unknown>).payment_type === "purchase_refund";
                  return (
                    <DataTableRow key={payment.id}>
                      <DataTableCell>{payment.payment_date}</DataTableCell>
                      <DataTableCell>{payment.cashbox_name ?? "-"}</DataTableCell>
                      <DataTableCell className={`font-bold ${isRefund ? "text-orange-500" : ""}`}>
                        {isRefund ? "− " : ""}{money(payment.amount, payment.currency || invoice.currency)}
                      </DataTableCell>
                      <DataTableCell>
                        {isRefund
                          ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">استرداد</span>
                          : <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">دفعة</span>
                        }
                      </DataTableCell>
                      <DataTableCell>{payment.status === "reversed" ? "ملغي" : "نشط"}</DataTableCell>
                      <DataTableCell>{payment.notes ?? "-"}</DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" startIcon={<Printer size={15} />} onClick={() => navigate(`/print/payments/${payment.id}`)}>طباعة</Button>
                          {payment.status === "active" ? (
                            <Button size="sm" variant="secondary" startIcon={<RotateCcw size={15} />} onClick={async () => {
                              const reason = window.prompt("سبب عكس الدفعة:", "تصحيح دفعة");
                              if (!reason?.trim()) return;
                              try {
                                await purchasesService.reversePayment(payment.id, reason.trim());
                                await loadDetails(invoice.id);
                              } catch (err: unknown) { setError(getArabicErrorMessage(err, "تعذر عكس الدفعة")); }
                            }}>عكس الدفعة</Button>
                          ) : null}
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState icon={<Banknote size={30} />} title="لا توجد دفعات" description="لم يتم تسجيل أي دفعة على هذه الفاتورة." />
          )}
        </Card>
      </div>

      <Card header="الملخص المالي" className="h-fit">
        <div className="space-y-3 text-sm">
          {(
            [
              ["المجموع الفرعي", financial_summary.subtotal],
              financial_summary.discount_amount > 0 ? ["الخصم", -financial_summary.discount_amount] : null,
              (financial_summary.transport_cost ?? 0) > 0 ? ["تكلفة النقل", financial_summary.transport_cost ?? 0] : null,
              (financial_summary.emptying_cost ?? 0) > 0 ? ["تكلفة العتالة", financial_summary.emptying_cost ?? 0] : null,
              ["المدفوع", financial_summary.paid_amount],
              ["المتبقي", financial_summary.remaining_amount],
            ] as ([string, number] | null)[]
          )
            .filter((row): row is [string, number] => row !== null)
            .map(([label, value]) => (
            <div key={String(label)} className="flex justify-between">
              <span className="text-[var(--text-muted)]">{label}</span>
              <strong>{money(Number(value), invoice.currency)}</strong>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between text-base">
              <strong>الإجمالي النهائي</strong>
              <strong className="text-[var(--primary)]">{money(financial_summary.total_amount, invoice.currency)}</strong>
            </div>
          </div>
          {invoice.currency !== "SYP" && (
            <div className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
              1 {invoice.currency} = {Number(invoice.exchange_rate).toLocaleString("en-US")} SYP ·
              القيمة الأساسية: {money(financial_summary.total_base, "SYP")}
            </div>
          )}
        </div>

        {/* Quick adjustment shortcuts */}
        {canAdjustPaid && (
          <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)]">تعديل المبلغ المدفوع</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openAdjustDialog("add")}
                className="text-[var(--success)] border-[var(--success)] hover:bg-[var(--success)]/10"
              >
                + زيادة
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => openAdjustDialog("reduce")}
                className="text-[var(--warning)] border-[var(--warning)] hover:bg-[var(--warning)]/10"
                disabled={financial_summary.paid_amount <= 0}
                title={financial_summary.paid_amount <= 0 ? "لا يوجد مبلغ مدفوع للتخفيض" : undefined}
              >
                − تخفيض
              </Button>
            </div>
          </div>
        )}
      </Card>

    </div>

    {/* ─── Adjust Paid Amount Modal ───────────────────────────────────────── */}
    {adjust.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-2xl">
          <h2 className="mb-1 text-lg font-bold text-[var(--text-primary)]">{adjustTitle}</h2>
          <p className="mb-5 text-sm text-[var(--text-muted)]">{adjustDesc}</p>

          {/* Direction toggle */}
          <div className="mb-4 flex rounded-lg overflow-hidden border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setAdjust((a) => ({ ...a, direction: "add", error: "" }))}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                adjust.direction === "add"
                  ? "bg-[var(--success)] text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              زيادة المدفوع
            </button>
            <button
              type="button"
              onClick={() => setAdjust((a) => ({ ...a, direction: "reduce", error: "" }))}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                adjust.direction === "reduce"
                  ? "bg-[var(--warning)] text-white"
                  : "bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              تخفيض المدفوع
            </button>
          </div>

          {/* Context info */}
          <div className="mb-4 rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-xs text-[var(--text-muted)] space-y-1">
            <div className="flex justify-between">
              <span>إجمالي الفاتورة:</span>
              <strong className="text-[var(--text-primary)]">{money(financial_summary.total_amount, invoice.currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>المدفوع حالياً:</span>
              <strong className="text-[var(--success)]">{money(financial_summary.paid_amount, invoice.currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>المتبقي:</span>
              <strong className="text-[var(--danger)]">{money(financial_summary.remaining_amount, invoice.currency)}</strong>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                المبلغ ({invoice.currency}) *
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={adjust.amount}
                onChange={(e) => setAdjust((a) => ({ ...a, amount: e.target.value, error: "" }))}
                placeholder="أدخل المبلغ..."
              />
              {adjust.direction === "add" && financial_summary.remaining_amount > 0 && (
                <button
                  type="button"
                  onClick={() => setAdjust((a) => ({ ...a, amount: String(financial_summary.remaining_amount) }))}
                  className="mt-1 text-xs text-[var(--primary)] hover:underline"
                >
                  تعبئة المتبقي: {money(financial_summary.remaining_amount, invoice.currency)}
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">الصندوق *</label>
              <Select
                value={adjust.cashboxId}
                onChange={(e) => setAdjust((a) => ({ ...a, cashboxId: e.target.value, error: "" }))}
                options={cashboxOptions}
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {adjust.direction === "add"
                  ? "سيُخصم المبلغ من هذا الصندوق."
                  : "سيُضاف المبلغ إلى هذا الصندوق."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">التاريخ *</label>
              <Input
                type="date"
                value={adjust.date}
                onChange={(e) => setAdjust((a) => ({ ...a, date: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ملاحظات / سبب التعديل</label>
              <textarea
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                rows={2}
                value={adjust.notes}
                onChange={(e) => setAdjust((a) => ({ ...a, notes: e.target.value }))}
                placeholder="مثال: تصحيح دفعة مدفوعة نقداً..."
              />
            </div>
          </div>

          {adjust.error && (
            <p className="mt-3 rounded-md bg-[var(--danger-muted)] px-3 py-2 text-sm text-[var(--danger)]">
              {adjust.error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="secondary"
              disabled={adjust.submitting}
              onClick={() => setAdjust(EMPTY_ADJUST)}
            >
              إلغاء
            </Button>
            <Button
              disabled={adjust.submitting || !adjust.amount || !adjust.cashboxId}
              onClick={handleAdjustSubmit}
            >
              {adjust.submitting ? "جارٍ التنفيذ…" : `تأكيد ${adjust.direction === "add" ? "الزيادة" : "التخفيض"}`}
            </Button>
          </div>
        </div>
      </div>
    )}

    <ConfirmDialog
      open={cancelOpen}
      title="إلغاء فاتورة الشراء"
      message={`هل تريد إلغاء الفاتورة ${invoice.invoice_number}؟ سيتم عكس جميع الدفعات واستعادة أرصدة المورد.`}
      onCancel={() => setCancelOpen(false)}
      onConfirm={handleCancel}
      loading={cancelling}
    />
    <ConfirmDialog
      open={deleteOpen}
      title="حذف مسودة الفاتورة"
      message={`هل تريد حذف المسودة ${invoice.invoice_number} نهائيًا؟`}
      onCancel={() => setDeleteOpen(false)}
      onConfirm={handleDelete}
      loading={deleting}
    />
  </>;
}
