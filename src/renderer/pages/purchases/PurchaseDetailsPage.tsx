import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { Banknote, HandCoins, Plus, Pencil, Printer, ReceiptText, RotateCcw, Trash2, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import DataTableBody from "../../components/common/DataTableBody";
import DataTableCell from "../../components/common/DataTableCell";
import DataTableHead from "../../components/common/DataTableHead";
import DataTableHeaderCell from "../../components/common/DataTableHeaderCell";
import DataTableRow from "../../components/common/DataTableRow";
import PurchaseStatusBadge from "../../components/purchases/PurchaseStatusBadge";
import { BackButton, Button, Card, ConfirmDialog, EmptyState, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";

const money = (value: number, currency = "SYP") =>
  `${value.toLocaleString("en-US")} ${currency === "SYP" ? "ل.س" : currency}`;
const typeLabels: Record<string, string> = { standard: "فاتورة عادية", consignment: "فاتورة أمانة" };

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

  useEffect(() => {
    const id = Number(purchaseId);
    if (!id) return;
    setLoading(true);
    setError("");
    purchasesService.getDetails(id)
      .then((data) => setDetails(data))
      .catch((err: Error) => setError(getArabicErrorMessage(err, "خطأ في تحميل الفاتورة")))
      .finally(() => setLoading(false));
  }, [purchaseId]);

  if (loading) return <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>;
  if (error || !details) return <EmptyState icon={<ReceiptText size={32} />} title="خطأ في التحميل" description={error || "تعذر العثور على فاتورة الشراء المطلوبة."} />;

  const { invoice, supplier, items, payments, financial_summary, activity } = details;
  const editHistory = (activity ?? []).filter((entry) => entry.action === "purchase_edited");
  const editable = invoice.status === "draft";
  const canCancel = ["confirmed", "partially_paid", "paid"].includes(invoice.status);

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

  return <>
    <PageHeader title={`فاتورة الشراء ${invoice.invoice_number}`} description="تفاصيل المورد والأصناف ودفعات المخزون والمدفوعات." actions={<div className="flex flex-wrap gap-2"><BackButton to={PATHS.PURCHASES} />{invoice.status !== "cancelled" && <Button variant="secondary" startIcon={<Pencil size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/edit`)}>تعديل محمي</Button>}<Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/print`)}>طباعة / PDF</Button>{invoice.invoice_type === "consignment" && <Button variant="secondary" startIcon={<HandCoins size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/consignment`)}>متابعة الأمانة</Button>}{invoice.status !== "paid" && invoice.status !== "cancelled" && !(invoice.invoice_type === "consignment" && invoice.settlement_status === "settled") && <Button startIcon={<Plus size={17} />} onClick={() => navigate(`/purchases/${invoice.id}/payments/new`)}>تسجيل دفعة</Button>}{canCancel && <Button variant="danger" startIcon={<XCircle size={17} />} onClick={() => setCancelOpen(true)}>إلغاء الفاتورة</Button>}<Button variant="danger" startIcon={<Trash2 size={17} />} disabled={!editable} title={!editable ? "الحذف متاح للفواتير المسودة فقط" : undefined} onClick={() => setDeleteOpen(true)}>حذف</Button></div>} />
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

        <Card padding={false} header="سجل الدفعات" description="كل الدفعات المسجلة على فاتورة الشراء.">
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
                    <DataTableCell>{payment.status === "reversed" ? "ملغي" : "نشط"}</DataTableCell>
                    <DataTableCell>{payment.notes ?? "-"}</DataTableCell>
                    <DataTableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" startIcon={<Printer size={15} />} onClick={() => navigate(`/print/payments/${payment.id}`)}>طباعة</Button>{payment.status === "active" ? <Button size="sm" variant="secondary" startIcon={<RotateCcw size={15} />} onClick={async () => {
                      const reason = window.prompt("سبب عكس الدفعة:", "تصحيح دفعة");
                      if (!reason?.trim()) return;
                      try {
                        await purchasesService.reversePayment(payment.id, reason.trim());
                        setDetails(await purchasesService.getDetails(invoice.id));
                      } catch (err: unknown) { setError(getArabicErrorMessage(err, "تعذر عكس الدفعة")); }
                    }}>عكس الدفعة</Button> : null}</div></DataTableCell>
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
            ["المدفوع", financial_summary.paid_amount],
            ["المتبقي", financial_summary.remaining_amount],
          ].map(([label, value]) => (
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
      </Card>
    </div>

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
