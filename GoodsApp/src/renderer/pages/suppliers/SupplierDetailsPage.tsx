import { Boxes, CreditCard, FileText, PencilLine, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell, DataTableRow } from "../../components/common";
import { BackButton, Button, Card, EmptyState, PageHeader, Select, StatusBadge } from "../../components/ui";
import { useSuppliers } from "./SuppliersContext";

const money = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });
const movementOptions = [{ value: "all", label: "كل الحركات" }, { value: "purchase", label: "فواتير الشراء" }, { value: "payment", label: "المدفوعات" }, { value: "consignment", label: "الأمانة" }, { value: "stock_batch", label: "دفعات المخزون" }];
const typeLabel = { purchase: "شراء", payment: "دفعة", consignment: "أمانة", stock_batch: "دفعة مخزون" } as const;
const statusLabel = { draft: "مسودة", confirmed: "مؤكدة", paid: "مدفوعة", cancelled: "ملغاة", received: "مستلمة" } as const;

export default function SupplierDetailsPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const id = Number(supplierId);
  const { getSupplier, movements, batches } = useSuppliers();
  const supplier = getSupplier(id);
  const [filter, setFilter] = useState("all");
  const rows = useMemo(() => movements.filter((movement) => movement.supplierId === id && (filter === "all" || movement.type === filter)), [movements, id, filter]);
  const supplierBatches = useMemo(() => batches.filter((batch) => batch.supplierId === id), [batches, id]);
  const summary = useMemo(() => {
    const related = movements.filter((movement) => movement.supplierId === id);
    const invoices = related.filter((movement) => movement.type === "purchase" || movement.type === "consignment");
    return { purchases: invoices.reduce((sum, item) => sum + item.total, 0), paid: related.filter((item) => item.type === "payment").reduce((sum, item) => sum + item.paid, 0), remaining: invoices.reduce((sum, item) => sum + item.remaining, 0), invoices: invoices.length };
  }, [movements, id]);

  if (!supplier) return <EmptyState title="المورد غير موجود" description="تعذر العثور على بيانات المورد المطلوبة." action={<Button onClick={() => navigate("/suppliers")}>العودة للموردين</Button>} />;

  return <>
    <PageHeader title={supplier.name} description="بيانات المورد وملخص الحساب وحركات الشراء والمخزون المرتبطة به." actions={<div className="flex gap-2"><BackButton to="/suppliers" label="العودة إلى الموردين" /><Button variant="secondary" startIcon={<PencilLine size={17} />} onClick={() => navigate(`/suppliers/${id}/edit`)}>تعديل</Button></div>} />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--text-muted)]">الرصيد الحالي</p><p className="mt-2 text-lg font-bold">{money(Math.abs(supplier.balance))} ل.س</p><p className="mt-1 text-xs text-[var(--text-muted)]">{supplier.balance > 0 ? "للمورد" : supplier.balance < 0 ? "دفعة مقدمة" : "متوازن"}</p></div><WalletCards size={20} className="text-[var(--primary)]" /></div></Card>
      <Card><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--text-muted)]">إجمالي المشتريات</p><p className="mt-2 text-lg font-bold">{money(summary.purchases)} ل.س</p></div><FileText size={20} className="text-[var(--primary)]" /></div></Card>
      <Card><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--text-muted)]">إجمالي المدفوعات</p><p className="mt-2 text-lg font-bold">{money(summary.paid)} ل.س</p></div><CreditCard size={20} className="text-[var(--primary)]" /></div></Card>
      <Card><div className="flex items-start justify-between"><div><p className="text-xs text-[var(--text-muted)]">عدد الفواتير</p><p className="mt-2 text-lg font-bold">{summary.invoices}</p></div><Boxes size={20} className="text-[var(--primary)]" /></div></Card>
    </div>

    <Card header="بيانات المورد" description="معلومات التواصل والحالة والملاحظات." className="mt-5">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs text-[var(--text-muted)]">رقم الهاتف</p><p className="mt-2 font-bold" dir="ltr">{supplier.phone || "—"}</p></div>
        <div><p className="text-xs text-[var(--text-muted)]">البريد الإلكتروني</p><p className="mt-2 font-bold" dir="ltr">{supplier.email || "—"}</p></div>
        <div><p className="text-xs text-[var(--text-muted)]">العنوان</p><p className="mt-2 font-bold">{supplier.address || "—"}</p></div>
        <div><p className="text-xs text-[var(--text-muted)]">الحالة</p><div className="mt-2"><StatusBadge variant={supplier.isActive ? "success" : "danger"}>{supplier.isActive ? "نشط" : "غير نشط"}</StatusBadge></div></div>
        <div className="md:col-span-2 xl:col-span-4"><p className="text-xs text-[var(--text-muted)]">ملاحظات</p><p className="mt-2 text-sm leading-7">{supplier.notes || "لا توجد ملاحظات."}</p></div>
      </div>
    </Card>

    <Card padding={false} className="mt-5">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4"><div><h2 className="font-bold">حركات المورد</h2><p className="mt-1 text-xs text-[var(--text-muted)]">الفواتير والمدفوعات والأمانة ودفعات المخزون.</p></div><Select value={filter} options={movementOptions} onChange={(event) => setFilter(event.target.value)} /></div>
      {rows.length ? <DataTable className="min-w-[1100px]"><DataTableHead><DataTableRow><DataTableHeaderCell>النوع</DataTableHeaderCell><DataTableHeaderCell>المرجع</DataTableHeaderCell><DataTableHeaderCell>التاريخ</DataTableHeaderCell><DataTableHeaderCell>البيان</DataTableHeaderCell><DataTableHeaderCell>الإجمالي</DataTableHeaderCell><DataTableHeaderCell>المدفوع</DataTableHeaderCell><DataTableHeaderCell>المتبقي</DataTableHeaderCell><DataTableHeaderCell>الحالة</DataTableHeaderCell></DataTableRow></DataTableHead><DataTableBody>{rows.map((movement) => <DataTableRow key={movement.id}><DataTableCell><StatusBadge variant={movement.type === "payment" ? "success" : movement.type === "consignment" ? "warning" : "info"}>{typeLabel[movement.type]}</StatusBadge></DataTableCell><DataTableCell><span dir="ltr">{movement.reference}</span></DataTableCell><DataTableCell>{movement.date}</DataTableCell><DataTableCell>{movement.description}</DataTableCell><DataTableCell>{money(movement.total)}</DataTableCell><DataTableCell>{money(movement.paid)}</DataTableCell><DataTableCell>{money(movement.remaining)}</DataTableCell><DataTableCell>{statusLabel[movement.status]}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState title="لا توجد حركات" description="لا توجد حركات مطابقة لهذا المورد." />}
    </Card>

    <Card padding={false} className="mt-5">
      <div className="border-b border-[var(--border)] p-4"><h2 className="font-bold">دفعات المخزون</h2><p className="mt-1 text-xs text-[var(--text-muted)]">الدفعات المستلمة من هذا المورد والكميات المتبقية منها.</p></div>
      {supplierBatches.length ? <DataTable className="min-w-[950px]"><DataTableHead><DataTableRow><DataTableHeaderCell>المادة</DataTableHeaderCell><DataTableHeaderCell>كود الدفعة</DataTableHeaderCell><DataTableHeaderCell>الكمية الأصلية</DataTableHeaderCell><DataTableHeaderCell>المتبقي</DataTableHeaderCell><DataTableHeaderCell>سعر الشراء</DataTableHeaderCell><DataTableHeaderCell>تاريخ الاستلام</DataTableHeaderCell><DataTableHeaderCell>تاريخ الانتهاء</DataTableHeaderCell></DataTableRow></DataTableHead><DataTableBody>{supplierBatches.map((batch) => <DataTableRow key={batch.id}><DataTableCell><span className="font-bold">{batch.productName}</span></DataTableCell><DataTableCell><span dir="ltr">{batch.batchCode}</span></DataTableCell><DataTableCell>{batch.originalQuantity}</DataTableCell><DataTableCell>{batch.remainingQuantity}</DataTableCell><DataTableCell>{money(batch.purchasePrice)} ل.س</DataTableCell><DataTableCell>{batch.receivedAt}</DataTableCell><DataTableCell>{batch.expiryDate || "—"}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState title="لا توجد دفعات مخزون" description="لا توجد دفعات مخزون مرتبطة بهذا المورد حاليًا." />}
    </Card>
  </>;
}
