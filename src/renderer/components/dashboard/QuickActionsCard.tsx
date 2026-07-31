import {
  Package,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";

import { Card } from "../ui";

import { PATHS } from "../../routes/path";
import ActionCard from "./ActionCard";

const actions = [
  {
    title: "إضافة منتج جديد",
    description: "تسجيل منتج جديد",
    icon: Package,
    to: PATHS.PRODUCTS,
  },
  {
    title: "تسجيل عملية بيع",
    description: "إنشاء فاتورة جديدة",
    icon: ShoppingCart,
    to: PATHS.SALES,
  },
  {
    title: "إضافة عميل",
    description: "تسجيل عميل",
    icon: Users,
    to: PATHS.CUSTOMERS,
  },
  {
    title: "إضافة مورد",
    description: "تسجيل مورد",
    icon: Truck,
    to: PATHS.SUPPLIERS,
  },
];

export default function QuickActionsCard() {
  return (
    <Card
      header="إجراءات سريعة"
      description="الوصول السريع للعمليات"
    >
      <div className="space-y-3">
        {actions.map((action) => (
          <ActionCard
            key={action.title}
            {...action}
          />
        ))}
      </div>
    </Card>
  );
}