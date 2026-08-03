import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TransactionTypeBadge from "../../components/transactions/TransactionTypeBadge";
import type { FinancialTransaction } from "../../components/transactions/types";
import { BackButton, Button, Card, ConfirmDialog, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { transactionsService } from "./transactionsService";

const money = (value: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => <div className="flex justify-between gap-4 border-b border-[var(--border)] py-3 last:border-0"><span className="text-sm text-[var(--text-muted)]">{label}</span><span className="text-sm font-medium text-[var(--text-primary)]">{value}</span></div>;

export default function TransactionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const transactionId = Number(id);
  const [transaction, setTransaction] = useState<FinancialTransaction>();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const result = await transactionsService.getTransaction(transactionId);
        if (!result) throw new Error("المعاملة غير موجودة.");
        setTransaction(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المعاملة.");
      } finally {
        setLoading(false);
      }
    })();
  }, [transactionId]);

  async function remove() {
    if (!transaction) return;
    try {
      setDeleting(true);
      await transactionsService.removeTransaction(transaction.id);
      navigate(PATHS.TRANSACTIONS);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف المعاملة.");
      setConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <Card>جاري تحميل المعاملة...</Card>;
  if (!transaction) return <Card>{error || "المعاملة غير موجودة."}</Card>;

  return (
    <>
      <PageHeader
        title="تفاصيل المعاملة المالية"
        description={transaction.referenceNumber || `معاملة #${transaction.id}`}
        actions={<div className="flex gap-2"><BackButton to={PATHS.TRANSACTIONS} /><Button variant="secondary" startIcon={<Pencil size={16} />} onClick={() => navigate(`/transactions/${transaction.id}/edit`)}>تعديل</Button><Button variant="danger" startIcon={<Trash2 size={16} />} onClick={() => setConfirm(true)}>حذف</Button></div>}
      />
      <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">هذه المعاملة محفوظة في قاعدة البيانات، لكنها لا تعدّل رصيد الصندوق في النسخة الحالية.</div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card header="معلومات المعاملة"><Row label="النوع" value={<TransactionTypeBadge type={transaction.direction} />} /><Row label="الفئة" value={transaction.categoryName} /><Row label="الصندوق" value={transaction.cashboxName} /><Row label="المبلغ" value={<span dir="ltr" className="tabular-nums">{money(transaction.amount)} ل.س</span>} /><Row label="التاريخ" value={<span dir="ltr">{transaction.transactionDate}</span>} /><Row label="رقم المرجع" value={<span dir="ltr">{transaction.referenceNumber || "—"}</span>} /></Card>
        <Card header="البيان والملاحظات"><Row label="الوصف" value={transaction.description || "—"} /><Row label="الملاحظات" value={transaction.notes || "—"} /><p className="mt-4 text-xs text-[var(--text-muted)]">هذه معاملة يدوية مستقلة عن فواتير البيع والشراء.</p></Card>
      </div>
      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
      <ConfirmDialog open={confirm} title="حذف المعاملة" message="سيتم حذف سجل المعاملة فقط، ولن يتغير رصيد الصندوق." loading={deleting} onCancel={() => setConfirm(false)} onConfirm={() => void remove()} />
    </>
  );
}
