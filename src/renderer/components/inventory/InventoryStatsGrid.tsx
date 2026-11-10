import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  PackageX,
  Scale,
} from "lucide-react";

import InventoryStatCard from "./InventoryStatCard";

type Props = {
  totalUnits: number;
  inventoryValue: number;
  totalPurchasedWeight?: number;
  totalSoldWeight?: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringBatchesCount?: number;
};

export default function InventoryStatsGrid({
  totalUnits,
  inventoryValue,
  totalPurchasedWeight = 0,
  totalSoldWeight = 0,
  lowStockCount,
  outOfStockCount,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <InventoryStatCard
        title="إجمالي الوحدات"
        value={totalUnits.toLocaleString("en-US")}
        description="مجموع الكميات المتاحة في المخزون الموحد"
        icon={<Boxes size={20} />}
      />

      <InventoryStatCard
        title="الوزن القائم (شراء / بيع)"
        value={`شراء: ${totalPurchasedWeight.toLocaleString("en-US")}`}
        description={`إجمالي الوزن القائم المباع: ${totalSoldWeight.toLocaleString("en-US")}`}
        icon={<Scale size={20} />}
      />

      <InventoryStatCard
        title="قيمة المخزون"
        value={`${inventoryValue.toLocaleString("en-US")} ل.س`}
        description="بحسب متوسط تكلفة الشراء"
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
        description="منتجات لا تملك كمية متاحة"
        icon={<PackageX size={20} />}
      />
    </div>
  );
}
