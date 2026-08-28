import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import TableFooter from "../../components/common/TableFooter";
import { RECORDS_PAGE_SIZE } from "../../lib/pagination";
import ActivityLogsTable from "../../components/activity-logs/ActivityLogsTable";
import ActivityLogsToolbar from "../../components/activity-logs/ActivityLogsToolbar";
import { PATHS } from "../../routes/path";
import type { ActivityLog, ActivityLogFilters } from "./activityLogsTypes";
import { activityLogsService } from "./activityLogsService";

const initialFilters: ActivityLogFilters = { query: "", user: "all", module: "all", action: "all", severity: "all", dateFrom: "", dateTo: "" };

export default function ActivityLogsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [options, setOptions] = useState<{ users: string[]; modules: string[]; actions: string[] }>({ users: [], modules: [], actions: [] });

  useEffect(() => { activityLogsService.options().then(setOptions).catch(() => undefined); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    activityLogsService.list(filters, page, RECORDS_PAGE_SIZE)
      .then((result) => { if (!active) return; setItems(result.items); setTotalPages(result.pagination.totalPages); setTotalCount(result.pagination.total); })
      .catch((reason) => { if (active) setError(getArabicErrorMessage(reason, "تعذر تحميل سجل النشاط")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page]);

  function update(key: keyof ActivityLogFilters, value: string) { setFilters((current) => ({ ...current, [key]: value })); setPage(1); }

  return <>
    <PageHeader title="سجل النشاط" description="سجل تدقيق حقيقي للعمليات المنفذة داخل النظام. السجل للقراءة فقط ولا يمكن تعديله أو حذفه." />
    <Card padding={false} header="سجل العمليات" description="ابحث وفلتر السجلات ثم افتح التفاصيل لمقارنة البيانات قبل وبعد العملية.">
      <ActivityLogsToolbar filters={filters} onChange={update} onClear={() => { setFilters(initialFilters); setPage(1); }} users={options.users} modules={options.modules} />
      {loading ? <div className="p-10 text-center text-sm text-[var(--text-muted)]">جاري تحميل سجل النشاط...</div>
        : error ? <div className="p-10 text-center text-sm text-red-600">{error}</div>
        : items.length ? <><ActivityLogsTable items={items} onView={(item) => navigate(PATHS.ACTIVITY_LOG_DETAILS.replace(":activityLogId", String(item.id)))} /><TableFooter
          visibleCount={items.length}
          totalCount={totalCount.toLocaleString("en-US")}
          entityName="سجل"
          page={Math.min(page, Math.max(1, totalPages))}
          totalPages={Math.max(1, totalPages)}
          pageSize={RECORDS_PAGE_SIZE}
          onPageChange={setPage}
        /></>
        : <EmptyState icon={<History size={34} />} title="لا توجد سجلات مطابقة" description="غيّر الفلاتر أو امسح عبارة البحث لعرض السجلات." />}
    </Card>
  </>;
}
