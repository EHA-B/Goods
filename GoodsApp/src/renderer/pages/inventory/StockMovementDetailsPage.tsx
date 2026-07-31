import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { BackButton, Card, PageHeader } from "../../components/ui";
import StockMovementBadge from "../../components/inventory/StockMovementBadge";
import { useInventory } from "./InventoryContext";

export default function StockMovementDetailsPage() {
  const { productId, movementId } = useParams();
  const { getProduct, movements } = useInventory();
  const product = getProduct(Number(productId));
  const movement = movements.find((item) => item.id === Number(movementId) && item.productId === Number(productId));
  if (!product || !movement) return <Navigate to={`/inventory/${productId ?? ""}`} replace />;
  const quantity = `${movement.quantity > 0 ? "+" : ""}${movement.quantity.toLocaleString()} ${movement.unit}`;
  return <>
    <PageHeader title="تفاصيل حركة المخزون" description={`تفاصيل الحركة الخاصة بالمادة ${product.productName}.`} actions={<BackButton to={`/inventory/${product.productId}`} label="العودة إلى تفاصيل المادة" />} />
    <Card header="بيانات الحركة" description="البيانات المسجلة لهذه الحركة في سجل المخزون.">
      <dl className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
        <DetailRow label="نوع الحركة" value={<StockMovementBadge type={movement.type} />} />
        <DetailRow label="التاريخ" value={movement.createdAt} dir="ltr" />
        <DetailRow label="المادة" value={movement.productName} />
        <DetailRow label="كود المادة" value={movement.productCode} dir="ltr" />
        <DetailRow label="الكمية" value={quantity} dir="ltr" />
        <DetailRow label="الرصيد بعدها" value={`${movement.balanceAfter.toLocaleString()} ${movement.unit}`} dir="ltr" />
        <DetailRow label="المورد" value={movement.supplierName ?? "—"} />
        <DetailRow label="رقم الدفعة" value={movement.batchCode ?? "—"} dir="ltr" />
        <DetailRow label="رقم المرجع" value={movement.referenceNumber ?? "—"} dir="ltr" />
      </dl>
    </Card>
    <Card className="mt-5" header="الملاحظات"><div className="min-h-24 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm leading-7 text-[var(--text-secondary)]">{movement.notes ?? "لا توجد ملاحظات لهذه الحركة."}</div></Card>
  </>;
}

function DetailRow({ label, value, dir = "rtl" }: { label: string; value: ReactNode; dir?: "rtl" | "ltr" }) {
  return <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4 border-b border-[var(--border)] px-4 py-3 last:border-b-0 odd:bg-[var(--surface)] even:bg-[var(--surface-subtle)]"><dt className="text-sm font-medium text-[var(--text-muted)]">{label}</dt><dd dir={dir} className="min-w-0 break-words text-sm font-bold text-[var(--text-primary)]">{value}</dd></div>;
}
