import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, EmptyState, PageHeader, StatusBadge } from "../../components/ui";
import {
  DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell, DataTableRow,
} from "../../components/common";
import { PATHS } from "../../routes/path";
import { cashboxesService } from "./cashboxesService";

const money = (v: number, c = "SAR") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(v);

const MOVEMENT_LABELS: Record<string, string> = {
  opening_balance: "رصيد افتتاحي",
  sale: "دفعة مبيعات",
  purchase: "دفعة مشتريات",
  expense: "مصروف",
  income: "إيراد",
  transfer: "تحويل",
  adjustment: "تسوية",
  reversal: "عكس حركة",
};

export default function CashboxDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();

  const [details, setDetails] = useState<CashboxDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await cashboxesService.getDetails(Number(id));
      setDetails(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل بيانات الصندوق");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-[var(--text-muted)]">
        <RefreshCw size={20} className="animate-spin" />
        <span>جارٍ التحميل…</span>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">{error ?? "الصندوق غير موجود"}</p>
        <Button variant="secondary" startIcon={<RefreshCw size={16} />} onClick={loadDetails}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const currency = details.currency;

  return (
    <>
      <BackButton to={PATHS.CASHBOXES} />
      <PageHeader
        title={details.name}
        description="تفاصيل الصندوق وسجل الحركات المالية."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              startIcon={<Pencil size={16} />}
              onClick={() => nav(`/cashboxes/${details.id}/edit`)}
            >
              تعديل
            </Button>
            <Button
              startIcon={<Plus size={16} />}
              onClick={() => nav(`/cashboxes/${details.id}/transactions/new`)}
            >
              حركة جديدة
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs text-[var(--text-muted)]">الرصيد الحالي</p>
          <p className="mt-2 text-2xl font-bold">{money(Number(details.balance), currency)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">إجمالي الدخول</p>
          <p className="mt-2 text-2xl font-bold">{money(details.total_in, currency)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">إجمالي الخروج</p>
          <p className="mt-2 text-2xl font-bold">{money(details.total_out, currency)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">عدد الحركات</p>
          <p className="mt-2 text-2xl font-bold">{details.movement_count}</p>
        </Card>
      </div>

      <Card className="mt-5" header="معلومات الصندوق">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <span className="text-[var(--text-muted)]">الصندوق الأب</span>
            <p className="font-bold">{details.parent_name || "—"}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">الرصيد الافتتاحي</span>
            <p className="font-bold">{money(Number(details.initial_balance), currency)}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">العملة</span>
            <p className="font-bold">{currency}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">الحالة</span>
            <p>
              <StatusBadge status={details.isActive ? "active" : "inactive"} />
            </p>
          </div>
          <div className="md:col-span-2">
            <span className="text-[var(--text-muted)]">الملاحظات</span>
            <p>{details.notes || "—"}</p>
          </div>
        </div>
      </Card>

      <Card padding={false} className="mt-5" header="آخر الحركات">
        {details.recent_movements.length ? (
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>التاريخ</DataTableHeaderCell>
                <DataTableHeaderCell>النوع</DataTableHeaderCell>
                <DataTableHeaderCell>دخول</DataTableHeaderCell>
                <DataTableHeaderCell>خروج</DataTableHeaderCell>
                <DataTableHeaderCell>الرصيد قبل</DataTableHeaderCell>
                <DataTableHeaderCell>الرصيد بعد</DataTableHeaderCell>
                <DataTableHeaderCell>البيان</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {details.recent_movements.map((m) => (
                <DataTableRow key={m.id}>
                  <DataTableCell>{m.transaction_date}</DataTableCell>
                  <DataTableCell>{MOVEMENT_LABELS[m.reference_type] ?? m.reference_type}</DataTableCell>
                  <DataTableCell>
                    {m.direction === "in" ? (
                      <span className="inline-flex items-center gap-1 text-[var(--success)]">
                        <ArrowDownLeft size={14} />
                        {money(m.amount, currency)}
                      </span>
                    ) : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {m.direction === "out" ? (
                      <span className="inline-flex items-center gap-1 text-[var(--danger)]">
                        <ArrowUpRight size={14} />
                        {money(m.amount, currency)}
                      </span>
                    ) : "—"}
                  </DataTableCell>
                  <DataTableCell>{money(m.balance_before, currency)}</DataTableCell>
                  <DataTableCell className="font-bold">{money(m.balance_after, currency)}</DataTableCell>
                  <DataTableCell className="max-w-xs truncate">{m.notes || "—"}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : (
          <EmptyState
            title="لا توجد حركات"
            description="لم تُسجّل حركات على هذا الصندوق بعد."
          />
        )}
      </Card>
    </>
  );
}
