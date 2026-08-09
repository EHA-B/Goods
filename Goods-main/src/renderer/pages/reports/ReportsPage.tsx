import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Download, FileSpreadsheet, FileText, Play, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, EmptyState, Input, PageHeader, Select } from "../../components/ui";
import { reportCategories, reportsCatalog } from "./reportsCatalog";
import { reportsService } from "./reportsService";
import type { ReportDefinition, ReportFilterKey, ReportFilterOptions, ReportFilters, ReportResult } from "./reportsTypes";

const today = new Date().toISOString().slice(0, 10);
const monthStart = `${today.slice(0, 8)}01`;
const initialFilters: ReportFilters = { fromDate: monthStart, toDate: today, status: "all", groupBy: "day" };
const emptyOptions: ReportFilterOptions = { customers: [], suppliers: [], products: [], cashboxes: [] };

function formatCell(value: unknown, format?: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "number") return Number(value).toLocaleString("ar-SY");
  if (format === "currency") return Number(value).toLocaleString("ar-SY", { maximumFractionDigits: 2 });
  if (format === "date") return new Date(String(value)).toLocaleDateString("ar-SY");
  return String(value);
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportDefinition | null>(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [options, setOptions] = useState<ReportFilterOptions>(emptyOptions);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  useEffect(() => { void reportsService.loadOptions().then(setOptions).catch(() => undefined); }, []);

  const visibleReports = useMemo(() => reportsCatalog.filter((report) => {
    const matchesCategory = category === "all" || report.category === category;
    const term = query.trim();
    return matchesCategory && (!term || `${report.title} ${report.description}`.includes(term));
  }), [category, query]);

  const chooseReport = (report: ReportDefinition) => {
    setSelectedReport(report);
    setFilters(initialFilters);
    setResult(null);
  };

  const generate = async () => {
    if (!selectedReport) return;
    setLoading(true);
    try {
      const data = await reportsService.generate(selectedReport.id, filters);
      setResult({ ...data, title: data.title || selectedReport.title });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر توليد التقرير.");
    } finally { setLoading(false); }
  };

  const exportReport = async (format: "pdf" | "excel") => {
    if (!selectedReport) return;
    setExporting(format);
    try {
      await reportsService.export(selectedReport.id, filters, format);
      toast.success(format === "pdf" ? "تم إنشاء ملف PDF." : "تم إنشاء ملف Excel.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تصدير التقرير.");
    } finally { setExporting(null); }
  };

  if (!selectedReport) {
    return <>
      <PageHeader title="التقارير" description="اختر التقرير المطلوب، ثم حدّد الفلاتر واعرضه أو صدّره إلى PDF وExcel." />
      <Card padding={false}>
        <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[minmax(260px,1fr)_220px]">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن تقرير" startContent={<Search size={17} />} />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} options={reportCategories.map((item) => ({ value: item.value, label: item.label }))} />
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleReports.map((report) => {
            const Icon = report.icon;
            return <button key={report.id} onClick={() => chooseReport(report)} className="group flex min-h-40 flex-col rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 text-right transition hover:border-[var(--primary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-subtle)] text-[var(--primary)]"><Icon size={22} /></span>
              <strong className="text-base text-[var(--text-primary)]">{report.title}</strong>
              <span className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{report.description}</span>
              <span className="mt-auto pt-4 text-xs font-bold text-[var(--primary)]">اختيار التقرير ←</span>
            </button>;
          })}
        </div>
        {!visibleReports.length && <EmptyState icon={<FileText size={32} />} title="لا توجد تقارير مطابقة" description="غيّر البحث أو التصنيف." />}
      </Card>
    </>;
  }

  const has = (key: ReportFilterKey) => selectedReport.filters.includes(key);

  return <>
    <PageHeader title={selectedReport.title} description={selectedReport.description} actions={<Button variant="secondary" startIcon={<ArrowRight size={16} />} onClick={() => setSelectedReport(null)}>كل التقارير</Button>} />

    <Card header="إعدادات التقرير" description="حدد البيانات المطلوبة ثم اضغط عرض التقرير." actions={<SlidersHorizontal size={19} className="text-[var(--text-muted)]" />}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {has("dateRange") && <>
          <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>من تاريخ</span><Input type="date" value={filters.fromDate} onChange={(e) => setFilters((v) => ({ ...v, fromDate: e.target.value }))} startContent={<CalendarDays size={16} />} /></label>
          <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>إلى تاريخ</span><Input type="date" value={filters.toDate} onChange={(e) => setFilters((v) => ({ ...v, toDate: e.target.value }))} startContent={<CalendarDays size={16} />} /></label>
        </>}
        {has("customer") && <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>العميل</span><Select value={filters.customerId ?? "all"} onChange={(e) => setFilters((v) => ({ ...v, customerId: e.target.value }))} options={[{ value: "all", label: "كل العملاء" }, ...options.customers]} /></label>}
        {has("supplier") && <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>المورد</span><Select value={filters.supplierId ?? "all"} onChange={(e) => setFilters((v) => ({ ...v, supplierId: e.target.value }))} options={[{ value: "all", label: "كل الموردين" }, ...options.suppliers]} /></label>}
        {has("product") && <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>الصنف</span><Select value={filters.productId ?? "all"} onChange={(e) => setFilters((v) => ({ ...v, productId: e.target.value }))} options={[{ value: "all", label: "كل الأصناف" }, ...options.products]} /></label>}
        {has("cashbox") && <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>الصندوق</span><Select value={filters.cashboxId ?? "all"} onChange={(e) => setFilters((v) => ({ ...v, cashboxId: e.target.value }))} options={[{ value: "all", label: "كل الصناديق" }, ...options.cashboxes]} /></label>}
        {has("status") && <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>الحالة</span><Select value={filters.status ?? "all"} onChange={(e) => setFilters((v) => ({ ...v, status: e.target.value }))} options={[{ value: "all", label: "كل الحالات" }, { value: "paid", label: "مدفوعة" }, { value: "partial", label: "مدفوعة جزئيًا" }, { value: "unpaid", label: "غير مدفوعة" }, { value: "active", label: "فعالة" }]} /></label>}
        {has("groupBy") && <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]"><span>التجميع حسب</span><Select value={filters.groupBy ?? "day"} onChange={(e) => setFilters((v) => ({ ...v, groupBy: e.target.value }))} options={[{ value: "day", label: "اليوم" }, { value: "month", label: "الشهر" }, { value: "product", label: "الصنف" }, { value: "party", label: "العميل / المورد" }, { value: "category", label: "الفئة" }]} /></label>}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <Button startIcon={<Play size={16} />} isLoading={loading} loadingText="جاري توليد التقرير" onClick={() => void generate()}>عرض التقرير</Button>
        <Button variant="secondary" startIcon={<FileText size={16} />} isLoading={exporting === "pdf"} onClick={() => void exportReport("pdf")}>تصدير PDF</Button>
        <Button variant="secondary" startIcon={<FileSpreadsheet size={16} />} isLoading={exporting === "excel"} onClick={() => void exportReport("excel")}>تصدير Excel</Button>
      </div>
    </Card>

    <Card className="mt-5" padding={false} header="معاينة التقرير" description={result ? `تم التوليد: ${new Date(result.generatedAt).toLocaleString("ar-SY")}` : "سيظهر التقرير هنا بعد توليده."} actions={result?.rows.length ? <Button size="sm" variant="ghost" startIcon={<Download size={15} />} onClick={() => void exportReport("excel")}>تنزيل</Button> : undefined}>
      {!result ? <EmptyState icon={<FileText size={34} />} title="لم يتم توليد التقرير بعد" description="اضبط الفلاتر ثم اضغط عرض التقرير." /> : result.summary?.length || result.rows.length ? <>
        {!!result.summary?.length && <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-4">{result.summary.map((item) => <div key={item.label} className="rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-4"><div className="text-xs text-[var(--text-muted)]">{item.label}</div><div className="mt-2 text-xl font-bold text-[var(--text-primary)]">{String(item.value)}</div></div>)}</div>}
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead className="bg-[var(--surface-subtle)]"><tr>{result.columns.map((column) => <th key={column.key} className="border-b border-[var(--border)] px-4 py-3 text-right font-bold text-[var(--text-secondary)]">{column.label}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]">{result.columns.map((column) => <td key={column.key} className="px-4 py-3 text-[var(--text-primary)]">{formatCell(row[column.key], column.format)}</td>)}</tr>)}</tbody></table></div>
        <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)]">عدد النتائج: {result.totalRows ?? result.rows.length}</div>
      </> : <EmptyState icon={<FileText size={34} />} title="لا توجد بيانات" description="لا توجد نتائج مطابقة للفلاتر المحددة، أو لم يتم ربط مصدر هذا التقرير بالباك بعد." />}
    </Card>
  </>;
}
