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
    to: PATHS.PRODUCT_NEW,
  },
  {
    title: "تسجيل عملية بيع",
    description: "إنشاء فاتورة جديدة",
    icon: ShoppingCart,
    to: PATHS.SALE_NEW,
  },
  {
    title: "إضافة عميل",
    description: "تسجيل عميل",
    icon: Users,
    to: PATHS.CUSTOMER_NEW,
  },
  {
    title: "إضافة مورد",
    description: "تسجيل مورد",
    icon: Truck,
    to: PATHS.SUPPLIER_NEW,
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