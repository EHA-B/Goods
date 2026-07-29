import { Button, Dialog } from "../../components/ui";
import {
  StockMovementBadge,
  type StockMovement,
} from "../../components/inventory";

type Props = {
  movement?: StockMovement;
  onClose: () => void;
};

export default function StockMovementDetailsDialog({
  movement,
  onClose,
}: Props) {
  return (
    <Dialog
      open={Boolean(movement)}
      title="تفاصيل حركة المخزون"
      onClose={onClose}
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      {movement && (
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div>
              <p className="font-bold text-[var(--text-primary)]">
                {movement.productName}
              </p>
              <p dir="ltr" className="mt-1 text-xs text-[var(--text-muted)]">
                {movement.productCode}
              </p>
            </div>

            <StockMovementBadge type={movement.type} />
          </div>

          <section>
            <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">
              بيانات الحركة
            </h3>

            <dl className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
              <DetailRow label="تاريخ الحركة" value={movement.createdAt} dir="ltr" />
              <DetailRow
                label="الكمية"
                value={`${movement.quantity > 0 ? "+" : ""}${movement.quantity.toLocaleString()} ${movement.unit}`}
                dir="ltr"
              />
              <DetailRow
                label="الرصيد بعد الحركة"
                value={`${movement.balanceAfter.toLocaleString()} ${movement.unit}`}
                dir="ltr"
              />
              <DetailRow label="اسم المورد" value={movement.supplierName ?? "غير مرتبط بمورد"} />
              <DetailRow label="رقم الدفعة" value={movement.batchCode ?? "—"} dir="ltr" />
              <DetailRow label="رقم المرجع" value={movement.referenceNumber ?? "—"} dir="ltr" />
              <DetailRow label="معرّف المرجع" value={movement.referenceId?.toString() ?? "—"} dir="ltr" />
              <DetailRow label="معرّف الدفعة" value={movement.stockBatchId?.toString() ?? "—"} dir="ltr" isLast />
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">
              الملاحظات
            </h3>
            <div className="min-h-24 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
              {movement.notes ?? "لا توجد ملاحظات لهذه الحركة."}
            </div>
          </section>
        </div>
      )}
    </Dialog>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
  dir?: "rtl" | "ltr";
  isLast?: boolean;
};

function DetailRow({ label, value, dir = "rtl", isLast = false }: DetailRowProps) {
  return (
    <div
      className={[
        "grid grid-cols-[145px_minmax(0,1fr)] items-center gap-4 px-4 py-3",
        "odd:bg-[var(--surface)] even:bg-[var(--surface-subtle)]",
        !isLast ? "border-b border-[var(--border)]" : "",
      ].join(" ")}
    >
      <dt className="text-sm font-medium text-[var(--text-muted)]">{label}</dt>
      <dd dir={dir} className="min-w-0 break-words text-sm font-bold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}
