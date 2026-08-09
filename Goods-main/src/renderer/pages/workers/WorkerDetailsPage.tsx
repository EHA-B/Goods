import {
  AlertCircle,
  ArrowDownLeft,
  BriefcaseBusiness,
  PencilLine,
  Phone,
  RefreshCw,
  RotateCcw,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  BackButton,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  StatusBadge,
} from "../../components/ui";
import {
  notifyError,
  notifySuccess,
} from "../../lib/notifications";
import { PATHS } from "../../routes/path";
import {
  getWorkerErrorMessage,
  getWorkerTypeLabel,
  workersService,
  type Worker,
  type WorkerPayment,
} from "./workersService";

const money = (value: number, currency = "SYP") =>
  `${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency === "SYP" ? "ل.س" : currency}`;

const formatDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB");
};

export default function WorkerDetailsPage() {
  const navigate = useNavigate();
  const { workerId } = useParams();
  const id = Number(workerId);

  const [worker, setWorker] = useState<Worker>();
  const [payments, setPayments] = useState<WorkerPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingReverse, setPendingReverse] =
    useState<WorkerPayment>();
  const [isReversing, setIsReversing] = useState(false);

  const loadData = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoadError("معرّف العامل أو الموظف غير صالح.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError("");

      const [workerData, paymentRows] = await Promise.all([
        workersService.get(id),
        workersService.getPayments(id),
      ]);

      setWorker(workerData);
      setPayments(paymentRows);
    } catch (error) {
      setLoadError(getWorkerErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function reversePayment() {
    if (!pendingReverse) return;

    const reason = window.prompt("أدخل سبب عكس الدفعة:")?.trim();
    if (!reason) return;

    try {
      setIsReversing(true);
      await workersService.reversePayment(pendingReverse.id, reason);
      setPendingReverse(undefined);
      notifySuccess("تم عكس الدفعة وإعادة أثرها على الصندوق والرصيد.");
      await loadData();
    } catch (error) {
      notifyError(error, {
        title: "تعذر عكس الدفعة",
        fallback: "تعذر عكس دفعة العامل أو الموظف.",
      });
    } finally {
      setIsReversing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium">جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (loadError || !worker) {
    return (
      <EmptyState
        icon={<AlertCircle size={26} />}
        title="تعذر تحميل السجل"
        description={loadError || "تعذر العثور على البيانات المطلوبة."}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate(PATHS.WORKERS)}
            >
              العودة إلى العمال
            </Button>
            <Button
              startIcon={<RefreshCw size={16} />}
              onClick={() => void loadData()}
            >
              إعادة المحاولة
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title={worker.name}
        description="بيانات العامل أو الموظف ورصيده وسجل دفعاته."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BackButton to={PATHS.WORKERS} label="العودة إلى العمال" />
            <Button
              variant="secondary"
              startIcon={<PencilLine size={16} />}
              onClick={() => navigate(`/workers/${worker.id}/edit`)}
            >
              تعديل
            </Button>
            <Button
              startIcon={<ArrowDownLeft size={16} />}
              onClick={() =>
                navigate(`/transactions/new?type=expense&workerId=${worker.id}`)
              }
            >
              تسجيل راتب أو أجر
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)]">
                الرصيد الحالي
              </p>
              <p
                dir="ltr"
                className="mt-2 text-right text-2xl font-bold text-[var(--text-primary)]"
              >
                {money(worker.balance)}
              </p>
            </div>
            <WalletCards size={21} className="text-[var(--primary)]" />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)]">
                النوع
              </p>
              <p className="mt-2 font-bold text-[var(--text-primary)]">
                {getWorkerTypeLabel(worker.type)}
              </p>
            </div>
            {worker.type === "employee" ? (
              <BriefcaseBusiness size={21} className="text-[var(--primary)]" />
            ) : (
              <UserRound size={21} className="text-[var(--primary)]" />
            )}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-bold text-[var(--text-muted)]">
            الحالة
          </p>
          <div className="mt-3">
            <StatusBadge
              variant={worker.state === "active" ? "success" : "danger"}
            >
              {worker.state === "active" ? "نشط" : "غير نشط"}
            </StatusBadge>
          </div>
        </Card>
      </div>

      <Card
        header="بيانات التواصل"
        description="رقم الهاتف والعنوان والملاحظات."
        className="mt-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
              <Phone size={15} />
              رقم الهاتف
            </div>
            <p dir="ltr" className="mt-3 text-right font-bold">
              {worker.phone || "—"}
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
            <p className="text-xs font-bold text-[var(--text-muted)]">العنوان</p>
            <p className="mt-3 font-bold">{worker.address || "—"}</p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 md:col-span-2">
            <p className="text-xs font-bold text-[var(--text-muted)]">ملاحظات</p>
            <p className="mt-3 whitespace-pre-wrap leading-7">
              {worker.notes || "لا توجد ملاحظات."}
            </p>
          </div>
        </div>
      </Card>

      <Card
        header="سجل الدفعات"
        description="الدفعات المسجلة فعليًا من باك العمال والمرتبطة بالصندوق."
        className="mt-5"
        padding={false}
      >
        {payments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                  <th className="px-4 py-3 text-right">المبلغ</th>
                  <th className="px-4 py-3 text-right">الصندوق</th>
                  <th className="px-4 py-3 text-right">الرصيد قبل</th>
                  <th className="px-4 py-3 text-right">الرصيد بعد</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">ملاحظات</th>
                  <th className="px-4 py-3 text-right">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      <span dir="ltr">
                        {money(payment.amount, payment.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {payment.cashboxName || `#${payment.cashboxId}`}
                    </td>
                    <td className="px-4 py-3">
                      <span dir="ltr">
                        {payment.balanceBefore === null
                          ? "—"
                          : money(payment.balanceBefore)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span dir="ltr">
                        {payment.balanceAfter === null
                          ? "—"
                          : money(payment.balanceAfter)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        variant={
                          payment.status === "active" ? "success" : "danger"
                        }
                      >
                        {payment.status === "active" ? "فعالة" : "معكوسة"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[260px] whitespace-normal break-words">
                        {payment.notes || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {payment.status === "active" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          startIcon={<RotateCcw size={14} />}
                          onClick={() => setPendingReverse(payment)}
                        >
                          عكس
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="لا توجد دفعات"
            description="لم تُسجل دفعات لهذا العامل أو الموظف بعد."
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingReverse)}
        title="عكس الدفعة"
        message={
          pendingReverse
            ? `سيتم عكس الدفعة رقم ${pendingReverse.id} وإعادة المبلغ للصندوق وإرجاع أثرها على رصيد العامل. هل تريد المتابعة؟`
            : ""
        }
        confirmText="متابعة العكس"
        loading={isReversing}
        onCancel={() => {
          if (!isReversing) setPendingReverse(undefined);
        }}
        onConfirm={() => void reversePayment()}
      />
    </>
  );
}
