import { Banknote, Pencil, Plus, Printer, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import DataTableBody from "../../components/common/DataTableBody";
import DataTableCell from "../../components/common/DataTableCell";
import DataTableHead from "../../components/common/DataTableHead";
import DataTableHeaderCell from "../../components/common/DataTableHeaderCell";
import DataTableRow from "../../components/common/DataTableRow";
import SaleStatusBadge from "../../components/sales/SaleStatusBadge";
import { BackButton, Button, Card, ConfirmDialog, EmptyState, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";

const money = (value: number) => value.toLocaleString("en-US");
const paymentLabels = { cash: "نقدي", bank: "تحويل بنكي", credit_card: "بطاقة", cheque: "شيك", online: "إلكتروني" };
export default function SaleDetailsPage() {
  const navigate = useNavigate();
  const { saleId } = useParams();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const sale = salesService.getById(Number(saleId));
  if (!sale) return <EmptyState icon={<ReceiptText size={32} />} title="الفاتورة غير موجودة" description="تعذر العثور على فاتورة البيع المطلوبة." />;
  const cost = sale.items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0);
  const profit = sale.items.reduce((sum, item) => sum + item.profit, 0);
  return <>
    <PageHeader title={`فاتورة البيع ${sale.invoiceNumber}`} description="تفاصيل الفاتورة والأصناف والدفعات والنتيجة المالية." actions={<div className="flex flex-wrap gap-2"><BackButton to={PATHS.SALES} /><Button variant="secondary" startIcon={<Pencil size={17} />} onClick={() => navigate(`/sales/${sale.id}/edit`)}>تعديل</Button><Button variant="secondary" startIcon={<Printer size={17} />}>طباعة</Button>{sale.status !== "paid" && sale.status !== "cancelled" && <Button startIcon={<Plus size={17} />} onClick={() => navigate(`/sales/${sale.id}/payments/new`)}>تسجيل دفعة</Button>}<Button variant="danger" startIcon={<Trash2 size={17} />} onClick={() => setDeleteOpen(true)}>حذف</Button></div>} />
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card header="بيانات الفاتورة"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["رقم الفاتورة", sale.invoiceNumber], ["التاريخ", sale.invoiceDate], ["العميل", sale.customerName], ["نوع البيع", sale.saleTypeName], ["الصندوق", sale.cashboxName ?? "-"], ["الحالة", <SaleStatusBadge status={sale.status} />]].map(([label, value]) => <div key={String(label)}><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><div className="mt-2 text-sm font-bold text-[var(--text-primary)]">{value}</div></div>)}</div>{sale.notes && <div className="mt-5 border-t border-[var(--border)] pt-4"><p className="text-xs font-bold text-[var(--text-muted)]">الملاحظات</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{sale.notes}</p></div>}</Card>
        <Card padding={false} header="أصناف الفاتورة" description="المنتجات والدفعات والكميات والأسعار والأرباح."><DataTable><DataTableHead><DataTableRow>{["المنتج", "الدفعة", "الكمية", "سعر البيع", "التكلفة", "الإجمالي", "الربح"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}</DataTableRow></DataTableHead><DataTableBody>{sale.items.map((item) => <DataTableRow key={item.id}><DataTableCell className="font-bold text-[var(--text-primary)]">{item.productName}</DataTableCell><DataTableCell>{item.batchCode}</DataTableCell><DataTableCell>{item.quantity}</DataTableCell><DataTableCell>{money(item.unitPrice)}</DataTableCell><DataTableCell>{money(item.costPrice)}</DataTableCell><DataTableCell>{money(item.lineTotal)}</DataTableCell><DataTableCell>{money(item.profit)}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable></Card>
        <Card padding={false} header="سجل الدفعات" description="كل الدفعات المسجلة على الفاتورة.">{sale.payments.length ? <DataTable><DataTableHead><DataTableRow>{["التاريخ", "الصندوق", "الطريقة", "المبلغ", "رقم المرجع", "الملاحظات"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}</DataTableRow></DataTableHead><DataTableBody>{sale.payments.map((payment) => <DataTableRow key={payment.id}><DataTableCell>{payment.date}</DataTableCell><DataTableCell>{payment.cashboxName}</DataTableCell><DataTableCell>{paymentLabels[payment.method]}</DataTableCell><DataTableCell className="font-bold">{money(payment.amount)}</DataTableCell><DataTableCell>{payment.referenceNumber || "-"}</DataTableCell><DataTableCell>{payment.notes || "-"}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState icon={<Banknote size={30} />} title="لا توجد دفعات" description="لم يتم تسجيل أي دفعة على هذه الفاتورة." />}</Card>
      </div>
      <Card header="الملخص المالي" className="h-fit"><div className="space-y-3 text-sm">{[["المجموع الفرعي", sale.subtotal], ["الخصم", -sale.discount], ["العمولة", sale.commissionAmount], ["الضريبة", sale.tax], ["إجمالي التكلفة", cost], ["صافي الربح", profit], ["المدفوع", sale.paidAmount], ["المتبقي", Math.max(0, sale.total - sale.paidAmount)]].map(([label, value]) => <div key={String(label)} className="flex justify-between"><span className="text-[var(--text-muted)]">{label}</span><strong>{money(Number(value))}</strong></div>)}<div className="border-t border-[var(--border)] pt-3"><div className="flex justify-between text-base"><strong>الإجمالي النهائي</strong><strong className="text-[var(--primary)]">{money(sale.total)}</strong></div></div></div></Card>
    </div>
    <ConfirmDialog open={deleteOpen} title="حذف فاتورة البيع" message={`هل تريد حذف الفاتورة ${sale.invoiceNumber}؟`} onCancel={() => setDeleteOpen(false)} onConfirm={() => { salesService.remove(sale.id); navigate(PATHS.SALES); }} />
  </>;
}
