import type { ReportFilterOptions, ReportFilters, ReportOutputFormat, ReportResult } from "./reportsTypes";

type ReportsApi = {
  options?: () => Promise<ReportFilterOptions>;
  generate?: (input: { reportId: string; filters: ReportFilters }) => Promise<ReportResult>;
  export?: (input: { reportId: string; filters: ReportFilters; format: Exclude<ReportOutputFormat, "preview"> }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
};

function api(): ReportsApi | undefined {
  return (window as unknown as { stockliteApi?: { reports?: ReportsApi } }).stockliteApi?.reports;
}

const emptyOptions: ReportFilterOptions = { customers: [], suppliers: [], products: [], cashboxes: [] };

export const reportsService = {
  async loadOptions(): Promise<ReportFilterOptions> {
    return (await api()?.options?.()) ?? emptyOptions;
  },

  async generate(reportId: string, filters: ReportFilters): Promise<ReportResult> {
    const generate = api()?.generate;
    if (!generate) {
      return {
        title: "",
        generatedAt: new Date().toISOString(),
        columns: [],
        rows: [],
        totalRows: 0,
      };
    }
    return generate({ reportId, filters });
  },

  async export(reportId: string, filters: ReportFilters, format: "pdf" | "excel") {
    const exporter = api()?.export;
    if (!exporter) throw new Error("تصدير التقارير غير مربوط بالباك بعد.");
    return exporter({ reportId, filters, format });
  },
};
