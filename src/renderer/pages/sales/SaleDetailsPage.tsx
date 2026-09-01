import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { Banknote, Plus, Pencil, Printer, ReceiptText, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import DataTableBody from "../../components/common/DataTableBody";
import DataTableCell from "../../components/common/DataTableCell";
import DataTableHead from "../../components/common/DataTableHead";
import DataTableHeaderCell from "../../components/common/DataTableHeaderCell";
import DataTableRow from "../../components/common/DataTableRow";
import PaymentReversalDialog from "../../components/payments/PaymentReversalDialog";
import SaleStatusBadge from "../../components/sales/SaleStatusBadge";
import { BackButton, Button, Card, ConfirmDialog, EmptyState, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";

const money = (value: number, currency = "SYP") =>
  `${value.toLocaleString("en-US")} ${currency === "SYP" ? "ل.س" : currency}`;

export default function SaleDetailsPage() {
  const navigate = useNavigate();
  const { saleId } = useParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [details, setDetails] = useState<SaleInvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [reversalPayment, setReversalPayment] = useState<PaymentRecord | null>(null);
  const [reversalLoading, setReversalLoading] = useState(false);
  const [reversalError, setReversalError] = useState("");

  useEffect(() => {
    const id = Number(saleId);
    if (!id) return;
    setLoading(true);
    setError("");
    salesService.getDetails(id)
      .then((data) => setDetails(data))
      .catch((err: Error) => setError(getArabicErrorMessage(err, "خطأ في تحميل الفاتورة")))
      .finally(() => setLoading(false));
  }, [saleId]);

  if (loading) return <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>;
  if (error || !details) return <EmptyState icon={<ReceiptText size={32} />} title="خطأ في التحميل" description={error || "تعذر العثور على فاتورة البيع المطلوبة."} />;

  const { invoice, customer, items, payments, financial_summary, activity } = details;
  const editHistory = (activity ?? []).filter((entry) => entry.action === "sale_edited");

  const cost = items.reduce((sum, item: Record<string, unknown>) => sum + Number(item.cost_price ?? 0) * Number(item.quantity ?? 0), 0);
  const profit = items.reduce((sum, item: Record<string, unknown>) => sum + Number(item.profit ?? 0), 0);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const reason = window.prompt("اكتب سبب إلغاء فاتورة البيع:", "إلغاء بطلب المستخدم");
      if (!reason?.trim()) { setCancelling(false); return; }
      const updated = await salesService.cancel(invoice.id, reason.trim());
      setDetails(updated);
      setCancelOpen(false);
    } catch (err: unknown) {
      const e = err as Error;
      setError(getArabicErrorMessage(e, "تعذر إلغاء الفاتورة"));
    } finally {
      setCancelling(false);
    }
  };

  return <>
    <PageHeader
      title={`فاتورة البيع ${invoice.invoice_number}`}
      description="تفاصيل الفاتورة والأصناف والدفعات والنتيجة المالية."
      actions={
        <div className="flex flex-wrap gap-2">
          <BackButton to={PATHS.SALES} />
          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
            <Button startIcon={<Plus size={17} />} onClick={() => navigate(`/sales/${invoice.id}/payments/new`)}>تسجيل دفعة</Button>
          )}
          {invoice.status !== "cancelled" && <Button variant="secondary" startIcon={<Pencil size={17} />} onClick={() => navigate(`/sales/${invoice.id}/edit`)}>تعديل محمي</Button>}<Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/sales/${invoice.id}/print`)}>طباعة / PDF</Button>
          {invoice.status !== "cancelled" && (
            <Button variant="danger" startIcon={<XCircle size={17} />} onClick={() => setCancelOpen(true)}>إلغاء الفاتورة</Button>
          )}
        </div>
      }
    />
    {error && <div className="mb-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card header="بيانات الفاتورة">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["رقم الفاتورة", <span className="inline-flex items-center gap-2">{invoice.invoice_number}{Boolean(invoice.is_edited) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">معدلة</span>}</span>],
              ["التاريخ", invoice.invoice_date],
              ["العميل", customer?.name ?? "بيع نقدي"],
              ["العملة", invoice.currency || "SYP"],
              ["الحالة", <SaleStatusBadge status={invoice.status as never} />],
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

        <Card padding={false} header="أصناف الفاتورة" description="المنتجات والدفعات والكميات والأسعار والأرباح.">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                {["المنتج", "الدفعة", "الكمية", "سعر البيع", "التكلفة", "الإجمالي", "الربح"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {items.map((item: Record<string, unknown>, idx) => (
                <DataTableRow key={idx}>
                  <DataTableCell className="font-bold text-[var(--text-primary)]">{String(item.product_name ?? "-")}</DataTableCell>
                  <DataTableCell>{String(item.batch_code ?? "-")}</DataTableCell>
                  <DataTableCell>{String(item.quantity ?? "-")}</DataTableCell>
                  <DataTableCell>{money(Number(item.unit_price ?? 0), invoice.currency)}</DataTableCell>
                  <DataTableCell>{money(Number(item.cost_price ?? 0), "SYP")}</DataTableCell>
                  <DataTableCell>{money(Number(item.line_total ?? 0), invoice.currency)}</DataTableCell>
                  <DataTableCell>{money(Number(item.profit ?? 0), "SYP")}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </Card>

        <Card padding={false} header="سجل الدفعات" description="كل الدفعات المسجلة على الفاتورة.">
          {payments.length ? (
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  {["التاريخ", "الصندوق", "المبلغ", "الحالة", "الملاحظات", "الإجراء"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {payments.map((payment) => (
                  <DataTableRow key={payment.id}>
                    <DataTableCell>{payment.payment_date}</DataTableCell>
                    <DataTableCell>{payment.cashbox_name ?? "-"}</DataTableCell>
                    <DataTableCell className="font-bold">{money(payment.amount, payment.currency || invoice.currency)}</DataTableCell>
                    <DataTableCell>{payment.status === "reversed" ? "معكوس" : "نشط"}</DataTableCell>
                    <DataTableCell>{payment.status === "reversed" ? (payment.reversal_reason ?? payment.notes ?? "-") : (payment.notes ?? "-")}</DataTableCell>
                    <DataTableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" startIcon={<Printer size={15} />} onClick={() => navigate(`/print/payments/${payment.id}`)}>طباعة</Button>{payment.status === "active" ? <Button size="sm" variant="secondary" startIcon={<RotateCcw size={15} />} onClick={() => { setReversalError(""); setReversalPayment(payment); }}>عكس الدفعة</Button> : null}</div></DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          ) : (
            <EmptyState icon={<Banknote size={30} />} title="لا توجد دفعات" description="لم يتم تسجيل أي دفعة على هذه الفاتورة." />
          )}
        </Card>
      </div>

      <Card header="الملخص المالي" className="h-fit">
        <div className="space-y-3 text-sm">
          {[
            ["المجموع الفرعي", financial_summary.subtotal],
            ["الخصم", -financial_summary.discount_amount],
            ["إجمالي التكلفة", cost],
            ["صافي الربح", profit],
            ["المدفوع", financial_summary.paid_amount],
            ["المتبقي", financial_summary.remaining_amount],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between">
              <span className="text-[var(--text-muted)]">{label}</span>
              <strong>{money(
                Number(value),
                label === "إجمالي التكلفة" || label === "صافي الربح" ? "SYP" : invoice.currency,
              )}</strong>
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
      </Card>
    </div>

    <PaymentReversalDialog
      open={Boolean(reversalPayment)}
      payment={reversalPayment}
      invoiceLabel={invoice.invoice_number}
      partyLabel="العميل"
      loading={reversalLoading}
      error={reversalError}
      onClose={() => { if (!reversalLoading) { setReversalPayment(null); setReversalError(""); } }}
      onConfirm={async ({ reason, password }) => {
        if (!reversalPayment) return;
        setReversalLoading(true);
        setReversalError("");
        try {
          await salesService.reversePayment(reversalPayment.id, reason, password);
          setDetails(await salesService.getDetails(invoice.id));
          setReversalPayment(null);
        } catch (err: unknown) {
          setReversalError(getArabicErrorMessage(err, "تعذر عكس الدفعة"));
        } finally {
          setReversalLoading(false);
        }
      }}
    />

    <ConfirmDialog
      open={cancelOpen}
      title="إلغاء فاتورة البيع"
      message={`هل تريد إلغاء الفاتورة ${invoice.invoice_number}؟ سيتم عكس جميع الدفعات واستعادة كميات المخزون.`}
      onCancel={() => setCancelOpen(false)}
      onConfirm={handleCancel}
      loading={cancelling}
    />
  </>;
}
