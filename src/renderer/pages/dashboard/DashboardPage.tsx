import {
  CircleDollarSign,
  Package,
  Truck,
  Users,
} from "lucide-react";

import DashboardClock from "../../components/dashboard/DashboardClock";
import QuickActionsCard from "../../components/dashboard/QuickActionsCard";
import RecentSalesCard from "../../components/dashboard/RecentSalesCard";
import StatCard from "../../components/dashboard/StatCard";
import StatsGrid from "../../components/dashboard/StatsGrid";

import { PageHeader } from "../../components/ui";

import { PATHS } from "../../routes/path";

const stats = [
  {
    title: "رصيد الصندوق",
    value: "0",
    suffix: "ل.س",
    description: "الرصيد المتوفر حاليًا",
    icon: CircleDollarSign,
    to: PATHS.CASHBOXES,
  },
  {
    title: "المنتجات",
    value: "0",
    suffix: "منتج",
    description: "إجمالي المنتجات",
    icon: Package,
    to: PATHS.PRODUCTS,
  },
  {
    title: "العملاء",
    value: "0",
    suffix: "عميل",
    description: "إجمالي العملاء",
    icon: Users,
    to: PATHS.CUSTOMERS,
  },
  {
    title: "الموردون",
    value: "0",
    suffix: "مورد",
    description: "إجمالي الموردين",
    icon: Truck,
    to: PATHS.SUPPLIERS,
  },
];

function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة عامة على حركة المخزون والمبيعات."
        actions={<DashboardClock />}
      />

      <StatsGrid>
        {stats.map((stat) => (
          <StatCard
            key={stat.title}
            {...stat}
          />
        ))}
      </StatsGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <RecentSalesCard />

        <QuickActionsCard />
      </div>
    </div>
  );
}

export default DashboardPage;