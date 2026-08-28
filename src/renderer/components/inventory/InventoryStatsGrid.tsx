import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  PackageX,
  TimerReset,
} from "lucide-react";

import InventoryStatCard from "./InventoryStatCard";

type Props = {
  totalUnits: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringBatchesCount: number;
};

export default function InventoryStatsGrid({
  totalUnits,
  inventoryValue,
  lowStockCount,
  outOfStockCount,
  expiringBatchesCount,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <InventoryStatCard
        title="إجمالي الوحدات"
        value={totalUnits.toLocaleString("en-US")}
        description="مجموع الكميات المتبقية في الدفعات"
        icon={<Boxes size={20} />}
      />

      <InventoryStatCard
        title="قيمة المخزون"
        value={`${inventoryValue.toLocaleString("en-US")} ل.س`}
        description="بحسب سعر شراء الكميات المتبقية"
        icon={<CircleDollarSign size={20} />}
      />

      <InventoryStatCard
        title="مخزون منخفض"
        value={lowStockCount.toLocaleString("en-US")}
        description="منتجات وصلت إلى حد التنبيه"
        icon={<AlertTriangle size={20} />}
      />

      <InventoryStatCard
        title="نافد من المخزون"
        value={outOfStockCount.toLocaleString("en-US")}
        description="منتجات لا تملك كمية متبقية"
        icon={<PackageX size={20} />}
      />

      <InventoryStatCard
        title="قريب الانتهاء"
        value={expiringBatchesCount.toLocaleString("en-US")}
        description="دفعات تحتاج إلى متابعة"
        icon={<TimerReset size={20} />}
      />
    </div>
  );
}
