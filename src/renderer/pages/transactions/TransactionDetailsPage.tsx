import { notifyError, notifySuccess } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { Printer, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TransactionTypeBadge from "../../components/transactions/TransactionTypeBadge";
import { BackButton, Button, Card, PageHeader, Input, Dialog } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { transactionsService } from "./transactionsService";
import Badge from "../../components/ui/Badge";

const money = (value: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => <div className="flex justify-between gap-4 border-b border-[var(--border)] py-3 last:border-0"><span className="text-sm text-[var(--text-muted)]">{label}</span><span className="text-sm font-medium text-[var(--text-primary)]">{value}</span></div>;

export default function TransactionDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const transactionId = Number(id);
  const [data, setData] = useState<any>(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, [transactionId]);

  async function loadData() {
    try {
      setLoading(true);
      const result = await transactionsService.getDetails(transactionId);
      if (!result || !result.transaction) throw new Error("المعاملة غير موجودة.");
      setData(result);
    } catch (loadError) {
      setError(getArabicErrorMessage(loadError, "تعذر تحميل المعاملة."));
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!data?.transaction) return;
    if (!cancelReason.trim()) {
      notifyError("يرجى إدخال سبب الإلغاء.");
      return;
    }

    try {
      setCancelling(true);
      await transactionsService.cancel(data.transaction.id, cancelReason);
      setCancelDialog(false);
      notifySuccess("تم إلغاء المعاملة المالية وعكس أثرها على الصندوق بنجاح.");
      void loadData();
    } catch (err) {
      notifyError(getArabicErrorMessage(err, "تعذر إلغاء المعاملة."));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <Card>جاري تحميل المعاملة...</Card>;
  if (!data || !data.transaction) return <Card>{error || "المعاملة غير موجودة."}</Card>;

  const { transaction, category, cashbox, cashbox_movement } = data;

  return (
    <>
      <PageHeader
        title="تفاصيل المعاملة المالية"
        description={transaction.reference_number || `معاملة #${transaction.id}`}
        actions={
          <div className="flex gap-2">
            <BackButton to={PATHS.TRANSACTIONS} />
            <Button variant="secondary" startIcon={<Printer size={16} />} onClick={() => navigate(`/print/transactions/${transaction.id}`)}>طباعة المستند</Button>
            {transaction.status === "active" && (
              <Button variant="danger" startIcon={<Undo2 size={16} />} onClick={() => setCancelDialog(true)}>
                إلغاء وعكس العملية
              </Button>
            )}
          </div>
        }
      />
      
      {transaction.status === "cancelled" && (
        <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-light)] px-4 py-3 text-sm text-[var(--danger-dark)]">
          <strong>معاملة ملغية:</strong> تم إلغاء هذه المعاملة بتاريخ {new Date(transaction.cancelled_at).toLocaleString('ar-SA')} بسبب: "{transaction.cancellation_reason}". أثرها المالي معكوس.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card header="معلومات المعاملة">
          <Row label="الحالة" value={transaction.status === "active" ? <Badge variant="success">فعال</Badge> : <Badge variant="danger">ملغي</Badge>} />
          <Row label="النوع" value={<TransactionTypeBadge type={transaction.direction} />} />
          <Row label="الفئة" value={category?.name || "—"} />
          <Row label="الصندوق" value={cashbox?.name || "—"} />
          <Row label="المبلغ" value={<span dir="ltr" className="font-bold tabular-nums">{money(transaction.amount)} ل.س</span>} />
          <Row label="التاريخ" value={<span dir="ltr">{transaction.transaction_date}</span>} />
          <Row label="رقم المرجع" value={<span dir="ltr">{transaction.reference_number || "—"}</span>} />
        </Card>
        
        <div className="flex flex-col gap-5">
          <Card header="البيان والملاحظات">
            <Row label="الوصف" value={transaction.description || "—"} />
            <Row label="الملاحظات" value={transaction.notes || "—"} />
          </Card>
          
          <Card header="معلومات الصندوق (الأثر المالي)">
            {cashbox_movement ? (
              <>
                <Row label="رقم حركة الصندوق" value={`#${cashbox_movement.id}`} />
                <Row label="أثر الحركة" value={cashbox_movement.direction === "in" ? <span className="text-green-600">دخول أموال</span> : <span className="text-red-600">خروج أموال</span>} />
              </>
            ) : (
              <div className="py-4 text-sm text-[var(--text-muted)] text-center">لا يوجد حركة صندوق مرتبطة</div>
            )}
          </Card>
        </div>
      </div>
      
      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      {cancelDialog && (
        <Dialog
          open={cancelDialog}
          title="إلغاء المعاملة المالية"
          onClose={() => setCancelDialog(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setCancelDialog(false)} disabled={cancelling}>تراجع</Button>
              <Button variant="danger" onClick={() => void handleCancel()} disabled={cancelling || !cancelReason.trim()}>تأكيد الإلغاء</Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--text-secondary)]">هل أنت متأكد من رغبتك في إلغاء هذه المعاملة؟ سيتم إنشاء حركة صندوق معاكسة فوراً وتحديث الرصيد.</p>
            <Input
              placeholder="سبب الإلغاء (مطلوب)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}
    </>
  );
}
