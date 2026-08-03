import { Banknote, HandCoins, Pencil, Plus, Printer, ReceiptText, Trash2 } from "lucide-react";
import { useState,useEffect } from "react";
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

const money = (value: number) => value.toLocaleString("en-US");
const typeLabels: Record<string, string> = { standard: "فاتورة عادية", consignment: "فاتورة أمانة" };

export default function PurchaseDetailsPage() {
  const navigate = useNavigate();
  const { purchaseId } = useParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [details, setDetails] = useState<PurchaseInvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const id = Number(purchaseId);
    if (!id) return;
    setLoading(true);
    setError("");
    purchasesService.getDetails(id)
      .then((data) => setDetails(data))
      .catch((err: Error) => setError(err.message || "خطأ في تحميل الفاتورة"))
      .finally(() => setLoading(false));
  }, [purchaseId]);

  if (loading) return <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>;
  if (error || !details) return <EmptyState icon={<ReceiptText size={32} />} title="خطأ في التحميل" description={error || "تعذر العثور على فاتورة الشراء المطلوبة."} />;

  const { invoice, supplier, items, payments, financial_summary } = details;
  const canCancel = invoice.status !== "cancelled";

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const updated = await purchasesService.cancel(invoice.id, "إلغاء يدوي من صفحة التفاصيل");
      setDetails(updated);
      setCancelOpen(false);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "تعذر إلغاء الفاتورة");
    } finally {
      setCancelling(false);
    }
  };

  return <>
    <PageHeader title={`فاتورة الشراء ${purchase.invoiceNumber}`} description="تفاصيل المورد والأصناف ودفعات المخزون والمدفوعات." actions={<div className="flex flex-wrap gap-2"><BackButton to={PATHS.PURCHASES} /><Button variant="secondary" startIcon={<Pencil size={17} />} disabled={!editable} title={!editable ? "التعديل متاح للفواتير المسودة فقط" : undefined} onClick={() => navigate(`/purchases/${purchase.id}/edit`)}>تعديل</Button><Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/purchases/${purchase.id}/print`)}>طباعة / PDF</Button>{purchase.purchaseType === "consignment" && <Button variant="secondary" startIcon={<HandCoins size={17} />} onClick={() => navigate(`/purchases/${purchase.id}/consignment`)}>متابعة الأمانة</Button>}{purchase.status !== "paid" && purchase.status !== "cancelled" && <Button startIcon={<Plus size={17} />} onClick={() => navigate(`/purchases/${purchase.id}/payments/new`)}>تسجيل دفعة</Button>}<Button variant="danger" startIcon={<Trash2 size={17} />} disabled={!editable} title={!editable ? "الحذف متاح للفواتير المسودة فقط" : undefined} onClick={() => setDeleteOpen(true)}>حذف</Button></div>} />
    <p className="mb-5 text-xs text-[var(--text-muted)]">ملاحظة: التعديل والحذف متاحان للفواتير <strong className="text-[var(--text-secondary)]">المسودة</strong> فقط، بينما الفواتير المؤكدة والمدفوعة تكون للقراءة فقط حفاظًا على سلامة المخزون والبيانات المالية.</p>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card header="بيانات الفاتورة">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["رقم الفاتورة", invoice.invoice_number],
              ["التاريخ", invoice.invoice_date],
              ["المورد", supplier?.name ?? "-"],
              ["نوع الفاتورة", typeLabels[invoice.invoice_type] ?? "-"],
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
                  <DataTableCell>{money(Number(item.unit_price ?? 0))}</DataTableCell>
                  <DataTableCell>{money(Number(item.line_total ?? 0))}</DataTableCell>
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
                  {["التاريخ", "الصندوق", "المبلغ", "الحالة", "الملاحظات"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {payments.map((payment) => (
                  <DataTableRow key={payment.id}>
                    <DataTableCell>{payment.payment_date}</DataTableCell>
                    <DataTableCell>{payment.cashbox_name ?? "-"}</DataTableCell>
                    <DataTableCell className="font-bold">{money(payment.amount)}</DataTableCell>
                    <DataTableCell>{payment.status === "reversed" ? "ملغي" : "نشط"}</DataTableCell>
                    <DataTableCell>{payment.notes ?? "-"}</DataTableCell>
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
              <strong>{money(Number(value))}</strong>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-3">
            <div className="flex justify-between text-base">
              <strong>الإجمالي النهائي</strong>
              <strong className="text-[var(--primary)]">{money(financial_summary.total_amount)}</strong>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <ConfirmDialog
      open={cancelOpen}
      title="إلغاء فاتورة الشراء"
      message={`هل تريد إلغاء الفاتورة ${invoice.invoice_number}؟ سيتم عكس جميع الدفعات واستعادة أرصدة المورد.`}
      onCancel={() => setCancelOpen(false)}
      onConfirm={handleCancel}
    />
  </>;
}
