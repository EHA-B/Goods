import type { LucideIcon } from "lucide-react";

export type ReportCategory = "sales" | "purchases" | "inventory" | "finance" | "parties";
export type ReportOutputFormat = "preview" | "pdf" | "excel";
export type ReportFilterKey = "dateRange" | "customer" | "supplier" | "product" | "cashbox" | "status" | "groupBy" | "currency";

export type ReportDefinition = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  icon: LucideIcon;
  filters: ReportFilterKey[];
};

export type ReportFilters = {
  fromDate: string;
  toDate: string;
  customerId?: string;
  supplierId?: string;
  productId?: string;
  cashboxId?: string;
  status?: string;
  groupBy?: string;
  currency?: string;
};

export type ReportColumn = {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
  format?: "text" | "number" | "currency" | "date";
};

export type ReportSummaryItem = {
  label: string;
  value: string | number;
};

export type ReportSection = {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: ReportSummaryItem[];
};

export type ReportResult = {
  title: string;
  generatedAt: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  summary?: ReportSummaryItem[];
  totalRows?: number;
  sections?: ReportSection[];
};

export type ReportOption = { value: string; label: string };
export type ReportFilterOptions = {
  customers: ReportOption[];
  suppliers: ReportOption[];
  products: ReportOption[];
  cashboxes: ReportOption[];
};
