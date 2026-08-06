import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, History, Pencil, Plus, Printer, RefreshCw, RotateCcw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, EmptyState, PageHeader, StatusBadge } from "../../components/ui";
import {
  DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell, DataTableRow,
} from "../../components/common";
import { PATHS } from "../../routes/path";
import { cashboxesService, translateCashboxError } from "./cashboxesService";
import { formatMoney } from "./currency";

const money = (v: number | null, c = "SYP") => formatMoney(v, c);

const MOVEMENT_LABELS: Record<string, string> = {
  opening_balance: "رصيد افتتاحي",
  sale:            "دفعة مبيعات",
  purchase:        "دفعة مشتريات",
  expense:         "مصروف",
  income:          "إيراد",
  transfer:        "تحويل",
  adjustment:      "تسوية",
  reversal:        "عكس حركة",
};

/** Types that can be reversed by the single-movement reversal API */
const REVERSIBLE_TYPES = new Set(["income", "expense", "adjustment"]);

type ReversalState = {
  movementId: number | null;
  transferGroupId: string | null;
  reason: string;
  submitting: boolean;
  error: string | null;
};

export default function CashboxDetailsPage() {
  const nav = useNavigate();
  const { id } = useParams();

  const [details, setDetails] = useState<CashboxDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reversal, setReversal] = useState<ReversalState>({
    movementId: null,
    transferGroupId: null,
    reason: "",
    submitting: false,
    error: null,
  });

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await cashboxesService.getDetails(Number(id));
      setDetails(data);
    } catch (e) {
      setError(getArabicErrorMessage(e, "تعذر تحميل بيانات الصندوق"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleReverse = async () => {
    const { movementId, transferGroupId, reason } = reversal;
    if (!reason.trim()) {
      setReversal((r) => ({ ...r, error: "يرجى إدخال سبب الإلغاء" }));
      return;
    }
    setReversal((r) => ({ ...r, submitting: true, error: null }));
    try {
      if (transferGroupId) {
        await cashboxesService.reverseTransfer(transferGroupId, reason.trim());
      } else if (movementId) {
        await cashboxesService.reverseMovement(movementId, reason.trim());
      }
      setReversal({ movementId: null, transferGroupId: null, reason: "", submitting: false, error: null });
      await loadDetails();
    } catch (e: unknown) {
      setReversal((r) => ({ ...r, submitting: false, error: translateCashboxError(e) }));
    }
  };

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
  const summary = details.summary;
  const isReversalDialogOpen = reversal.movementId !== null || reversal.transferGroupId !== null;

  return (
    <>
      <BackButton to={PATHS.CASHBOXES} />
      <PageHeader
        title={details.name}
        description="تفاصيل الصندوق وسجل الحركات المالية."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" startIcon={<Printer size={16} />} onClick={() => nav(`/print/cashboxes/${details.id}/statement`)}>كشف حركة</Button>
            <Button
              variant="secondary"
              startIcon={<History size={16} />}
              onClick={() => nav(`/cashboxes/${details.id}/movements`)}
            >
              كل الحركات
            </Button>
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

      {/* ── Summary stats ──────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <p className="text-xs text-[var(--text-muted)]">الرصيد الحالي</p>
          <p className="mt-2 text-2xl font-bold">{money(Number(details.balance), currency)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">رصيد الافتتاح</p>
          <p className="mt-2 text-2xl font-bold">{money(summary?.opening_balance ?? Number(details.initial_balance), currency)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">دخول تشغيلي</p>
          <p className="mt-2 text-2xl font-bold text-[var(--success)]">{money(summary?.operational_in ?? details.total_in, currency)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">خروج تشغيلي</p>
          <p className="mt-2 text-2xl font-bold text-[var(--danger)]">{money(summary?.operational_out ?? details.total_out, currency)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">الحركات / الإلغاءات</p>
          <p className="mt-2 text-2xl font-bold">{summary?.movements_count ?? details.movement_count}</p>
          {(summary?.reversals_count ?? 0) > 0 && (
            <p className="mt-1 text-xs text-[var(--warning)]">{summary?.reversals_count} إلغاء</p>
          )}
        </Card>
      </div>

      {/* ── Cashbox info ───────────────────────────────────────────────── */}
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
              <StatusBadge variant={details.isActive ? "success" : "warning"}>
                {details.isActive ? "نشط" : "غير نشط"}
              </StatusBadge>
            </p>
          </div>
          <div className="md:col-span-2">
            <span className="text-[var(--text-muted)]">الملاحظات</span>
            <p>{details.notes || "—"}</p>
          </div>
        </div>
      </Card>

      {/* ── Recent movements ──────────────────────────────────────────── */}
      <Card padding={false} className="mt-5" header="آخر الحركات">
        {details.recent_movements.length ? (
          <>
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
                  <DataTableHeaderCell>إجراء</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {details.recent_movements.map((m) => {
                  const isReversible = REVERSIBLE_TYPES.has(m.reference_type);
                  const isTransfer   = m.reference_type === "transfer";
                  const isOpening    = m.reference_type === "opening_balance";
                  const isReversal   = m.reference_type === "reversal";

                  return (
                    <DataTableRow key={m.id}>
                      <DataTableCell>{m.transaction_date}</DataTableCell>
                      <DataTableCell>
                        <span
                          className={
                            isOpening  ? "text-[var(--primary)] font-semibold" :
                            isTransfer ? "text-[var(--warning)]" :
                            isReversal ? "text-[var(--text-muted)] italic" :
                            ""
                          }
                        >
                          {MOVEMENT_LABELS[m.reference_type] ?? m.reference_type}
                        </span>
                      </DataTableCell>
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
                      <DataTableCell className="max-w-xs truncate">{m.notes || m.reversal_reason || "—"}</DataTableCell>
                      <DataTableCell>
                        {isReversible && (
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={<RotateCcw size={13} />}
                            onClick={() => setReversal({ movementId: m.id, transferGroupId: null, reason: "", submitting: false, error: null })}
                          >
                            إلغاء
                          </Button>
                        )}
                        {isTransfer && m.transfer_group_id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={<RotateCcw size={13} />}
                            onClick={() => setReversal({ movementId: null, transferGroupId: m.transfer_group_id!, reason: "", submitting: false, error: null })}
                          >
                            عكس التحويل
                          </Button>
                        )}
                        {(isOpening || isReversal) && (
                          <span className="text-xs text-[var(--text-muted)]">مقيّد</span>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>

            <div className="border-t border-[var(--border)] px-4 py-3">
              <Button
                variant="secondary"
                startIcon={<History size={15} />}
                onClick={() => nav(`/cashboxes/${details.id}/movements`)}
                size="sm"
              >
                عرض كل الحركات
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            title="لا توجد حركات"
            description="لم تُسجّل حركات على هذا الصندوق بعد."
          />
        )}
      </Card>

      {/* ── Reversal dialog ───────────────────────────────────────────── */}
      {isReversalDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-strong)] p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold">
              {reversal.transferGroupId ? "عكس التحويل" : "إلغاء الحركة"}
            </h2>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              {reversal.transferGroupId
                ? "سيتم عكس كلا طرفي التحويل بشكل مجمّع وذري."
                : "سيتم إنشاء حركة عكسية لإلغاء هذه الحركة."}
            </p>

            <label className="block text-sm font-medium mb-1">سبب الإلغاء *</label>
            <textarea
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              rows={3}
              value={reversal.reason}
              onChange={(e) => setReversal((r) => ({ ...r, reason: e.target.value }))}
              placeholder="أدخل سبب الإلغاء..."
            />

            {reversal.error && (
              <p className="mt-2 rounded-md bg-[var(--danger-muted)] px-3 py-2 text-sm text-[var(--danger)]">
                {reversal.error}
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={reversal.submitting}
                onClick={() => setReversal({ movementId: null, transferGroupId: null, reason: "", submitting: false, error: null })}
              >
                إلغاء
              </Button>
              <Button
                disabled={!reversal.reason.trim() || reversal.submitting}
                onClick={handleReverse}
              >
                {reversal.submitting ? "جارٍ التنفيذ…" : "تأكيد الإلغاء"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
