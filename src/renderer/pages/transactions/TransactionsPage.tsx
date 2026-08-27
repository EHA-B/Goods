import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState, useCallback } from "react";
import { Plus, ReceiptText, Tags } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import TransactionsSummaryCards from "../../components/transactions/TransactionsSummaryCards";
import TransactionsTable from "../../components/transactions/TransactionsTable";
import type { FinancialTransaction } from "../../components/transactions/types";
import {
  BackButton,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { transactionsService } from "./transactionsService";
import { RECORDS_PAGE_SIZE } from "../../lib/pagination";

type CashboxOption = { id: number; name: string };
type SummaryCurrency = { currency: string; totalIncome: number; totalExpense: number; net: number };

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FinancialTransaction[]>([]);
  const [cashboxes, setCashboxes] = useState<CashboxOption[]>([]);
  const [summary, setSummary] = useState<{ byCurrency: SummaryCurrency[], activeTransactionsCount: number, cancelledTransactionsCount: number } | null>(null);
  
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [cashbox, setCashbox] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const filters: any = {};
      if (query.trim()) filters.search = query.trim();
      if (type !== "all") filters.type = type;
      if (cashbox !== "all") filters.cashbox_id = Number(cashbox);
      if (status !== "all") filters.status = status;

      const [data, summaryData, cashboxesData] = await Promise.all([
        transactionsService.list(filters, { page, limit: RECORDS_PAGE_SIZE }),
        transactionsService.getSummary(filters),
        transactionsService.loadCashboxes()
      ]);

      setItems(data.items);
      setTotalCount(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
      setSummary(summaryData);
      setCashboxes(cashboxesData.map((item) => ({ id: item.id, name: item.name })));
    } catch (loadError) {
      setError(getArabicErrorMessage(loadError, "تعذر تحميل المعاملات المالية."));
    } finally {
      setLoading(false);
    }
  }, [query, type, cashbox, status, page]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Use the primary currency for the summary cards, or the first available
  const primarySummary = summary?.byCurrency?.[0] || { totalIncome: 0, totalExpense: 0 };
  const totalIncome = primarySummary.totalIncome;
  const totalExpense = primarySummary.totalExpense;

  return (
    <>
      <PageHeader
        title="المعاملات المالية"
        description="سجل الحركات المالية المباشرة (إيرادات ومصروفات) في الصناديق."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <BackButton to={PATHS.CASHBOXES} />
            <Button variant="secondary" startIcon={<Tags size={16} />} onClick={() => navigate(PATHS.TRANSACTION_CATEGORIES)}>
              إدارة الفئات
            </Button>
            <Button variant="secondary" startIcon={<Plus size={16} />} onClick={() => navigate(`${PATHS.TRANSACTION_NEW}?type=income`)}>
              إضافة إيراد
            </Button>
            <Button startIcon={<Plus size={16} />} onClick={() => navigate(`${PATHS.TRANSACTION_NEW}?type=expense`)}>
              إضافة مصروف
            </Button>
          </div>
        }
      />

      <TransactionsSummaryCards income={totalIncome} expense={totalExpense} count={totalCount} />

      <Card padding={false} className="mt-5" header="سجل المعاملات" description="الإيرادات والمصروفات المالية المسجلة.">
        <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[minmax(240px,1fr)_180px_180px_180px_auto]">
          <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ابحث بالوصف أو الملاحظات" />
          <Select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} options={[{ value: "all", label: "كل الأنواع" }, { value: "income", label: "إيرادات" }, { value: "expense", label: "مصروفات" }]} />
          <Select value={cashbox} onChange={(event) => { setCashbox(event.target.value); setPage(1); }} options={[{ value: "all", label: "كل الصناديق" }, ...cashboxes.map((item) => ({ value: String(item.id), label: item.name }))]} />
          <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} options={[{ value: "all", label: "كل الحالات" }, { value: "active", label: "فعال" }, { value: "cancelled", label: "ملغي" }]} />
          <Button variant="secondary" onClick={() => { setQuery(""); setType("all"); setCashbox("all"); setStatus("all"); setPage(1); }}>
            مسح الفلاتر
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">جاري تحميل المعاملات...</div>
        ) : error ? (
          <EmptyState icon={<ReceiptText size={32} />} title="تعذر تحميل المعاملات" description={error} action={<Button variant="secondary" onClick={() => void loadData()}>إعادة المحاولة</Button>} />
        ) : items.length ? (
          <>
            <TransactionsTable 
              items={items} 
              onView={(item) => navigate(`/transactions/${item.id}`)} 
              // Edit and delete are removed per the hardening plan
            />
            <TableFooter
              visibleCount={items.length}
              totalCount={totalCount}
              entityName="معاملة"
              page={page}
              totalPages={Math.max(1, totalPages)}
              pageSize={RECORDS_PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState icon={<ReceiptText size={32} />} title="لا توجد معاملات مطابقة" description="غيّر البحث أو الفلاتر، أو سجّل معاملة جديدة." />
        )}
      </Card>
    </>
  );
}
