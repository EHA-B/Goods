import {
  BadgeDollarSign,
  TrendingUp,
} from "lucide-react";
import type { ReportDefinition } from "./reportsTypes";

export const reportCategories = [
  { value: "all", label: "كل التقارير" },
  { value: "sales", label: "الأرباح والخسائر" },
  { value: "purchases", label: "الكومسيون" },
] as const;

export const reportsCatalog: ReportDefinition[] = [
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
