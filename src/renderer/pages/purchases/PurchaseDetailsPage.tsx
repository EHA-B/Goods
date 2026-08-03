import { Banknote, HandCoins, Pencil, Plus, Printer, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
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
const paymentLabels = { cash: "نقدي", bank: "تحويل بنكي", credit_card: "بطاقة", cheque: "شيك", online: "إلكتروني" };
const typeLabels = { standard: "فاتورة عادية", consignment: "فاتورة أمانة" };
export default function PurchaseDetailsPage() {
  const navigate = useNavigate();
  const { purchaseId } = useParams();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const purchase = purchasesService.getById(Number(purchaseId));
  if (!purchase) return <EmptyState icon={<ReceiptText size={32} />} title="الفاتورة غير موجودة" description="تعذر العثور على فاتورة الشراء المطلوبة." />;
  const editable = purchase.status === "draft";
  return <>
    <PageHeader title={`فاتورة الشراء ${purchase.invoiceNumber}`} description="تفاصيل المورد والأصناف ودفعات المخزون والمدفوعات." actions={<div className="flex flex-wrap gap-2"><BackButton to={PATHS.PURCHASES} /><Button variant="secondary" startIcon={<Pencil size={17} />} disabled={!editable} title={!editable ? "التعديل متاح للفواتير المسودة فقط" : undefined} onClick={() => navigate(`/purchases/${purchase.id}/edit`)}>تعديل</Button><Button variant="secondary" startIcon={<Printer size={17} />} onClick={() => navigate(`/purchases/${purchase.id}/print`)}>طباعة / PDF</Button>{purchase.purchaseType === "consignment" && <Button variant="secondary" startIcon={<HandCoins size={17} />} onClick={() => navigate(`/purchases/${purchase.id}/consignment`)}>متابعة الأمانة</Button>}{purchase.status !== "paid" && purchase.status !== "cancelled" && <Button startIcon={<Plus size={17} />} onClick={() => navigate(`/purchases/${purchase.id}/payments/new`)}>تسجيل دفعة</Button>}<Button variant="danger" startIcon={<Trash2 size={17} />} disabled={!editable} title={!editable ? "الحذف متاح للفواتير المسودة فقط" : undefined} onClick={() => setDeleteOpen(true)}>حذف</Button></div>} />
    <p className="mb-5 text-xs text-[var(--text-muted)]">ملاحظة: التعديل والحذف متاحان للفواتير <strong className="text-[var(--text-secondary)]">المسودة</strong> فقط، بينما الفواتير المؤكدة والمدفوعة تكون للقراءة فقط حفاظًا على سلامة المخزون والبيانات المالية.</p>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card header="بيانات الفاتورة"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["رقم الفاتورة", purchase.invoiceNumber], ["التاريخ", purchase.invoiceDate], ["المورد", purchase.supplierName], ["نوع الفاتورة", typeLabels[purchase.purchaseType]], ["الصندوق", purchase.cashboxName ?? "-"], ["الحالة", <PurchaseStatusBadge status={purchase.status} />]].map(([label, value]) => <div key={String(label)}><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><div className="mt-2 text-sm font-bold text-[var(--text-primary)]">{value}</div></div>)}</div>{purchase.notes && <div className="mt-5 border-t border-[var(--border)] pt-4"><p className="text-xs font-bold text-[var(--text-muted)]">الملاحظات</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{purchase.notes}</p></div>}</Card>
        <Card padding={false} header="أصناف الفاتورة" description="المنتجات والكميات وأسعار الشراء وبيانات دفعات المخزون."><DataTable><DataTableHead><DataTableRow>{["المنتج", "الكمية", "سعر الشراء", "الإجمالي", "كود الدفعة", "الاستلام", "الانتهاء"].map((header) => <DataTableHeaderCell key={header}>{header}</DataTableHeaderCell>)}</DataTableRow></DataTableHead><DataTableBody>{purchase.items.map((item) => <DataTableRow key={item.id}><DataTableCell className="font-bold text-[var(--text-primary)]">{item.productName}</DataTableCell><DataTableCell>{item.quantity}</DataTableCell><DataTableCell>{money(item.purchasePrice)}</DataTableCell><DataTableCell>{money(item.lineTotal)}</DataTableCell><DataTableCell>{item.batchCode}</DataTableCell><DataTableCell>{item.receivedDate}</DataTableCell><DataTableCell>{item.expiryDate || "-"}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable></Card>
        <Card padding={false} header="سجل الدفعات" description="كل الدفعات المسجلة على فاتورة الشراء.">{purchase.payments.length ? <DataTable><DataTableHead><DataTableRow>{["التاريخ", "الصندوق", "الطريقة", "المبلغ", "رقم المرجع", "الملاحظات"].map((header) => <DataTableHeaderCell key={header}>{header}</DataTableHeaderCell>)}</DataTableRow></DataTableHead><DataTableBody>{purchase.payments.map((payment) => <DataTableRow key={payment.id}><DataTableCell>{payment.date}</DataTableCell><DataTableCell>{payment.cashboxName}</DataTableCell><DataTableCell>{paymentLabels[payment.method]}</DataTableCell><DataTableCell className="font-bold">{money(payment.amount)}</DataTableCell><DataTableCell>{payment.referenceNumber || "-"}</DataTableCell><DataTableCell>{payment.notes || "-"}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState icon={<Banknote size={30} />} title="لا توجد دفعات" description="لم يتم تسجيل أي دفعة على هذه الفاتورة." />}</Card>
      </div>
      <Card header="الملخص المالي" className="h-fit"><div className="space-y-3 text-sm">{[["المجموع الفرعي", purchase.subtotal], ["الخصم", -purchase.discount], ["الضريبة", purchase.tax], ["المدفوع", purchase.paidAmount], ["المتبقي", Math.max(0, purchase.total - purchase.paidAmount)]].map(([label, value]) => <div key={String(label)} className="flex justify-between"><span className="text-[var(--text-muted)]">{label}</span><strong>{money(Number(value))}</strong></div>)}<div className="border-t border-[var(--border)] pt-3"><div className="flex justify-between text-base"><strong>الإجمالي النهائي</strong><strong className="text-[var(--primary)]">{money(purchase.total)}</strong></div></div></div></Card>
    </div>
    <ConfirmDialog open={deleteOpen} title="حذف فاتورة الشراء" message={`هل تريد حذف الفاتورة ${purchase.invoiceNumber}؟`} onCancel={() => setDeleteOpen(false)} onConfirm={() => { purchasesService.remove(purchase.id); navigate(PATHS.PURCHASES); }} />
  </>;
}
