import { useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText, Tags } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TableFooter from "../../components/common/TableFooter";
import TransactionsSummaryCards from "../../components/transactions/TransactionsSummaryCards";
import TransactionsTable from "../../components/transactions/TransactionsTable";
import type { FinancialTransaction } from "../../components/transactions/types";
import {
  BackButton,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { transactionsService } from "./transactionsService";

type CashboxOption = { id: number; name: string };

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FinancialTransaction[]>([]);
  const [cashboxes, setCashboxes] = useState<CashboxOption[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [cashbox, setCashbox] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<FinancialTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const data = await transactionsService.loadAll();
      setItems(data.transactions);
      setCashboxes(data.cashboxes.map((item) => ({ id: item.id, name: item.name })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المعاملات المالية.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery =
          !query.trim() ||
          `${item.categoryName} ${item.description} ${item.referenceNumber} ${item.cashboxName}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesType = type === "all" || item.direction === type;
        const matchesCashbox = cashbox === "all" || item.cashboxId === Number(cashbox);
        return matchesQuery && matchesType && matchesCashbox;
      }),
    [items, query, type, cashbox],
  );

  const totalIncome = items
    .filter((item) => item.direction === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = items
    .filter((item) => item.direction === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      setDeleting(true);
      await transactionsService.removeTransaction(pendingDelete.id);
      setPendingDelete(null);
      await loadData();
      toast.success("تم حذف سجل المعاملة.");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "تعذر حذف المعاملة.";
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="المعاملات المالية"
        description="سجل الإيرادات والمصروفات اليدوية المحفوظة في قاعدة البيانات."
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

      <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        هذه النسخة تربط سجل المعاملات والتصنيفات بقاعدة البيانات. تأثير المعاملة على رصيد الصندوق سيُضاف لاحقًا بعد اعتماد منطق الصناديق المالي النهائي.
      </div>

      <TransactionsSummaryCards income={totalIncome} expense={totalExpense} count={items.length} />

      <Card padding={false} className="mt-5" header="سجل المعاملات" description="الإيرادات والمصروفات اليدوية المسجلة في قاعدة البيانات.">
        <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[minmax(240px,1fr)_180px_220px_auto]">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالفئة أو الوصف أو المرجع" />
          <Select value={type} onChange={(event) => setType(event.target.value)} options={[{ value: "all", label: "كل الأنواع" }, { value: "income", label: "إيرادات" }, { value: "expense", label: "مصروفات" }]} />
          <Select value={cashbox} onChange={(event) => setCashbox(event.target.value)} options={[{ value: "all", label: "كل الصناديق" }, ...cashboxes.map((item) => ({ value: String(item.id), label: item.name }))]} />
          <Button variant="secondary" onClick={() => { setQuery(""); setType("all"); setCashbox("all"); }}>
            مسح الفلاتر
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">جاري تحميل المعاملات...</div>
        ) : error ? (
          <EmptyState icon={<ReceiptText size={32} />} title="تعذر تحميل المعاملات" description={error} action={<Button variant="secondary" onClick={() => void loadData()}>إعادة المحاولة</Button>} />
        ) : filteredItems.length ? (
          <>
            <TransactionsTable items={filteredItems} onView={(item) => navigate(`/transactions/${item.id}`)} onEdit={(item) => navigate(`/transactions/${item.id}/edit`)} onDelete={setPendingDelete} />
            <TableFooter visibleCount={filteredItems.length} totalCount={items.length} entityName="معاملة" />
          </>
        ) : (
          <EmptyState icon={<ReceiptText size={32} />} title="لا توجد معاملات مطابقة" description="غيّر البحث أو الفلاتر، أو سجّل معاملة جديدة." />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف المعاملة"
        message="سيتم حذف سجل المعاملة من قاعدة البيانات فقط. هذه النسخة لا تربط المعاملة برصيد الصندوق بعد."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
      />
    </>
  );
}
