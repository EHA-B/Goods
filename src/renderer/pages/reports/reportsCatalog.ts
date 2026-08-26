import {
  BadgeDollarSign,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import type { ReportDefinition } from "./reportsTypes";

export const reportCategories = [
  { value: "all", label: "كل التقارير" },
  { value: "sales", label: "المبيعات" },
  { value: "purchases", label: "المشتريات" },
] as const;

export const reportsCatalog: ReportDefinition[] = [
  {
    id: "sales-details",
    title: "تقرير المبيعات التفصيلي",
    description:
      "تفاصيل فواتير البيع فاتورةً بفاتورة مع العميل والأصناف والدفعات والتكلفة والربح والحالة.",
    category: "sales",
    icon: ReceiptText,
    filters: [
      "dateRange",
      "customer",
      "product",
      "currency",
      "status",
    ],
  },
  {
    id: "sales-profit",
    title: "أرباح وخسائر",
    description:
      "ملخص إيراد المبيعات وتكلفة البضاعة والربح أو الخسارة خلال الفترة المحددة.",
    category: "sales",
    icon: TrendingUp,
    filters: [
      "dateRange",
      "product",
      "groupBy",
    ],
  },
  {
    id: "purchases-details",
    title: "تقرير المشتريات التفصيلي",
    description:
      "تفاصيل فواتير الشراء والأمانات فاتورةً بفاتورة مع المورد والأصناف والدفعات وحالة المخزون.",
    category: "purchases",
    icon: ShoppingCart,
    filters: [
      "dateRange",
      "supplier",
      "product",
      "currency",
      "status",
    ],
  },
  {
    id: "consignment-commission",
    title: "تقرير الكومسيون",
    description:
      "ملخص فواتير الأمانة حسب المورد والبضاعة وسعر التسويق والمبيعات والعمولة وحصة المورد.",
    category: "purchases",
    icon: BadgeDollarSign,
    filters: [
      "dateRange",
      "supplier",
      "product",
      "currency",
      "status",
    ],
  },
];
