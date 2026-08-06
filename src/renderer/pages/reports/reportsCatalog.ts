import {
  BadgeDollarSign,
  Banknote,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { ReportDefinition } from "./reportsTypes";

export const reportCategories = [
  { value: "all", label: "كل التقارير" },
  { value: "sales", label: "المبيعات" },
  { value: "purchases", label: "المشتريات" },
  { value: "inventory", label: "المخزون" },
  { value: "finance", label: "المالية" },
  { value: "parties", label: "العملاء والموردون" },
] as const;

export const reportsCatalog: ReportDefinition[] = [
  { id: "sales-summary", title: "ملخص المبيعات", description: "إجمالي المبيعات والمدفوع والمتبقي خلال فترة.", category: "sales", icon: ShoppingCart, filters: ["dateRange", "status", "groupBy"] },
  { id: "sales-details", title: "تفاصيل المبيعات", description: "الفواتير والأصناف والكميات والأسعار بالتفصيل.", category: "sales", icon: ReceiptText, filters: ["dateRange", "customer", "product", "status"] },
  { id: "sales-profit", title: "أرباح المبيعات", description: "الإيراد والتكلفة والربح حسب الفاتورة أو الصنف.", category: "sales", icon: TrendingUp, filters: ["dateRange", "product", "groupBy"] },
  { id: "purchases-summary", title: "ملخص المشتريات", description: "إجمالي المشتريات والمدفوع والديون للموردين.", category: "purchases", icon: Truck, filters: ["dateRange", "supplier", "status", "groupBy"] },
  { id: "purchases-details", title: "تفاصيل المشتريات", description: "تفاصيل فواتير الشراء والأصناف والكميات.", category: "purchases", icon: ClipboardList, filters: ["dateRange", "supplier", "product", "status"] },
  { id: "stock-balance", title: "أرصدة المخزون", description: "الرصيد الحالي والتكلفة والقيمة لكل صنف.", category: "inventory", icon: Boxes, filters: ["product"] },
  { id: "stock-movements", title: "حركة المخزون", description: "دخول وخروج وتسويات المخزون ضمن فترة.", category: "inventory", icon: PackageSearch, filters: ["dateRange", "product"] },
  { id: "low-stock", title: "المخزون المنخفض", description: "الأصناف النافدة أو القريبة من حد إعادة الطلب.", category: "inventory", icon: BadgeDollarSign, filters: [] },
  { id: "cashbox-movements", title: "حركات الصندوق", description: "كل الإيرادات والمصروفات والتحويلات حسب الصندوق.", category: "finance", icon: CircleDollarSign, filters: ["dateRange", "cashbox", "groupBy"] },
  { id: "expenses", title: "المصروفات", description: "تحليل المصروفات حسب الفئة والفترة.", category: "finance", icon: Banknote, filters: ["dateRange", "cashbox", "groupBy"] },
  { id: "customer-balances", title: "أرصدة العملاء", description: "المبالغ المستحقة والمدفوعات وآخر حركة لكل عميل.", category: "parties", icon: UsersRound, filters: ["customer", "status"] },
  { id: "supplier-balances", title: "أرصدة الموردين", description: "ديون الموردين والمدفوعات وآخر حركة.", category: "parties", icon: UserRoundCheck, filters: ["supplier", "status"] },
];
