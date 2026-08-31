import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, RefreshCw, RotateCcw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DataTable, DataTableBody, DataTableCell, DataTableHead,
  DataTableHeaderCell, DataTableRow,
} from "../../components/common";
import TableFooter from "../../components/common/TableFooter";
import { RECORDS_PAGE_SIZE } from "../../lib/pagination";
import {
  BackButton, Button, Card, EmptyState, Input, PageHeader, Select,
} from "../../components/ui";
import { cashboxesService, translateCashboxError } from "./cashboxesService";
import { formatMoney } from "./currency";
import { transactionsService } from "../transactions/transactionsService";

const money = (v: number | null, c = "SYP") => formatMoney(v, c);

const MOVEMENT_LABELS: Record<string, string> = {
  opening_balance: "رصيد افتتاحي",
  sale:            "دفعة مبيعات",
  purchase:        "دفعة مشتريات",
  purchase_refund: "استرداد / تصحيح مشتريات",
  expense:         "مصروف",
  income:          "إيراد",
  transfer:        "تحويل",
  adjustment:      "تسوية",
  reversal:        "عكس حركة",
};

const REFERENCE_TYPE_OPTIONS = [
  { value: "", label: "كل الأنواع" },
  { value: "opening_balance", label: "رصيد افتتاحي" },
  { value: "income",          label: "إيراد" },
  { value: "expense",         label: "مصروف" },
  { value: "adjustment",      label: "تسوية" },
  { value: "transfer",        label: "تحويل" },
  { value: "reversal",        label: "عكس حركة" },
  { value: "sale",            label: "مبيعات" },
  { value: "purchase",        label: "مشتريات" },
];

const DIRECTION_OPTIONS = [
  { value: "", label: "كل الاتجاهات" },
  { value: "in",  label: "دخول" },
  { value: "out", label: "خروج" },
];

const REVERSIBLE_TYPES = new Set(["income", "expense", "adjustment"]);

type ReversalState = {
  movement: CashboxMovementRecord | null;
  transferGroupId: string | null;
  reason: string;
  submitting: boolean;
  error: string | null;
};

export default function CashboxMovementsPage() {
  const nav = useNavigate();
  const { id } = useParams();

  const [cashbox, setCashbox] = useState<CashboxApiRecord | null>(null);
  const [items, setItems] = useState<CashboxMovementRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: RECORDS_PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [direction, setDirection] = useState("");
  const [refType, setRefType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [reversal, setReversal] = useState<ReversalState>({
    movement: null, transferGroupId: null, reason: "", submitting: false, error: null,
  });

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [cbData, movData] = await Promise.all([
        cashboxesService.get(Number(id)),
        cashboxesService.movements(Number(id), {
          page,
          limit: RECORDS_PAGE_SIZE,
          direction: (direction as "in" | "out") || undefined,
          reference_type: refType || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      ]);
      setCashbox(cbData);
      setItems(movData.items);
      setPagination(movData.pagination);
    } catch (e) {
      setError(translateCashboxError(e));
    } finally {
      setLoading(false);
    }
  }, [id, page, direction, refType, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReverse = async () => {
    const { movement, transferGroupId, reason } = reversal;

    if (!reason.trim()) {
      setReversal((current) => ({
        ...current,
        error: "يرجى إدخال سبب الإلغاء",
      }));
      return;
    }

    setReversal((current) => ({
      ...current,
      submitting: true,
      error: null,
    }));

    try {
      if (transferGroupId) {
        // التحويلات لها منطقها الذري الخاص.
        await cashboxesService.reverseTransfer(
          transferGroupId,
          reason.trim(),
        );
      } else if (movement) {
        if (
          movement.reference_type === "income" ||
          movement.reference_type === "expense"
        ) {
          /*
           * مهم:
           * حركة الصندوق الخاصة بالإيراد/المصروف مرتبطة
           * بالمعاملة المالية الأصلية عبر reference_id.
           *
           * لا نستخدم reverseMovement هنا لأن ذلك يعكس
           * الصندوق فقط ويترك transactions.status = active.
           *
           * نستخدم نفس منطق صفحة المعاملات المالية لكي:
           * - تُلغى المعاملة.
           * - تتغير حالتها إلى cancelled.
           * - يُحفظ سبب الإلغاء.
           * - يُعكس أثرها المالي مرة واحدة.
           */
          if (!movement.reference_id) {
            throw {
              code: "TRANSACTION_NOT_FOUND",
              message: "Linked financial transaction was not found",
            };
          }

          await transactionsService.cancel(
            Number(movement.reference_id),
            reason.trim(),
          );
        } else if (movement.reference_type === "adjustment") {
          // التسويات اليدوية ليست Financial Transaction.
          await cashboxesService.reverseMovement(
            movement.id,
            reason.trim(),
          );
        } else {
          throw {
            code: "NOT_REVERSIBLE",
            message: "This movement cannot be reversed from the cashbox page",
          };
        }
      }

      setReversal({
        movement: null,
        transferGroupId: null,
        reason: "",
        submitting: false,
        error: null,
      });

      await loadData();
    } catch (error) {
      setReversal((current) => ({
        ...current,
        submitting: false,
        error: translateCashboxError(error),
      }));
    }
  };

  const currency = cashbox?.currency ?? "SYP";
  const isReversalOpen = reversal.movement !== null || reversal.transferGroupId !== null;

  const detailPath = `/cashboxes/${id}`;

  return (
    <>
      <BackButton to={detailPath} />
      <PageHeader
        title={cashbox ? `سجل حركات: ${cashbox.name}` : "سجل الحركات"}
        description="عرض كامل لحركات الصندوق مع إمكانية الفلترة والتصفح."
        actions={
          <Button variant="secondary" startIcon={<RefreshCw size={16} />} onClick={loadData}>
            تحديث
          </Button>
        }
      />

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <Select
            value={direction}
            onChange={(e) => { setDirection(e.target.value); setPage(1); }}
            options={DIRECTION_OPTIONS}
          />
          <Select
            value={refType}
            onChange={(e) => { setRefType(e.target.value); setPage(1); }}
            options={REFERENCE_TYPE_OPTIONS}
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            placeholder="من تاريخ"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            placeholder="إلى تاريخ"
          />
          <Button
            variant="secondary"
            disabled={!direction && !refType && !dateFrom && !dateTo}
            onClick={() => { setDirection(""); setRefType(""); setDateFrom(""); setDateTo(""); setPage(1); }}
          >
            مسح
          </Button>
        </div>
      </Card>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <Card padding={false}>
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3 text-[var(--text-muted)]">
            <RefreshCw size={20} className="animate-spin" />
            <span>جارٍ التحميل…</span>
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center gap-4">
            <p className="text-[var(--danger)]">{error}</p>
            <Button variant="secondary" onClick={loadData}>إعادة المحاولة</Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="لا توجد حركات" description="لا توجد حركات تطابق الفلاتر المحددة." />
        ) : (
          <>
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>#</DataTableHeaderCell>
                  <DataTableHeaderCell>التاريخ</DataTableHeaderCell>
                  <DataTableHeaderCell>النوع</DataTableHeaderCell>
                  <DataTableHeaderCell>دخول</DataTableHeaderCell>
                  <DataTableHeaderCell>خروج</DataTableHeaderCell>
                  <DataTableHeaderCell>الرصيد قبل</DataTableHeaderCell>
                  <DataTableHeaderCell>الرصيد بعد</DataTableHeaderCell>
                  <DataTableHeaderCell>الملاحظات</DataTableHeaderCell>
                  <DataTableHeaderCell>إجراء</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {items.map((m) => {
                  const isReversible = REVERSIBLE_TYPES.has(m.reference_type);
                  const isTransfer   = m.reference_type === "transfer";
                  const isOpening    = m.reference_type === "opening_balance";
                  const isReversal   = m.reference_type === "reversal";

                  return (
                    <DataTableRow key={m.id}>
                      <DataTableCell className="text-[var(--text-muted)] text-xs">{m.id}</DataTableCell>
                      <DataTableCell>{m.transaction_date}</DataTableCell>
                      <DataTableCell>
                        {(m.reference_type === "sale" || m.reference_type === "purchase") && m.reference_id ? (
                          <button
                            type="button"
                            className="text-sm font-semibold text-[var(--primary)] underline-offset-4 transition-colors hover:underline"
                            title={m.reference_type === "sale" ? "فتح تفاصيل فاتورة البيع" : "فتح تفاصيل فاتورة الشراء"}
                            onClick={() => nav(m.reference_type === "sale" ? `/sales/${m.reference_id}` : `/purchases/${m.reference_id}`)}
                          >
                            {MOVEMENT_LABELS[m.reference_type] ?? m.reference_type}
                            {m.reference_display_id ? ` #${m.reference_display_id}` : ""}
                          </button>
                        ) : (
                          <span className={
                            isOpening  ? "text-[var(--primary)] font-semibold text-sm" :
                            isTransfer ? "text-[var(--warning)] text-sm" :
                            isReversal ? "text-[var(--text-muted)] italic text-sm" :
                            "text-sm"
                          }>
                            {MOVEMENT_LABELS[m.reference_type] ?? m.reference_type}
                          </span>
                        )}
                        {m.transfer_group_id && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">مجموعة: {m.transfer_group_id.slice(-8)}</p>
                        )}
                      </DataTableCell>
                      <DataTableCell>
                        {m.direction === "in" ? (
                          <span className="inline-flex items-center gap-1 text-[var(--success)] font-semibold">
                            <ArrowDownLeft size={14} />
                            {money(m.amount, currency)}
                          </span>
                        ) : "—"}
                      </DataTableCell>
                      <DataTableCell>
                        {m.direction === "out" ? (
                          <span className="inline-flex items-center gap-1 text-[var(--danger)] font-semibold">
                            <ArrowUpRight size={14} />
                            {money(m.amount, currency)}
                          </span>
                        ) : "—"}
                      </DataTableCell>
                      <DataTableCell className="text-[var(--text-muted)]">{money(m.balance_before, currency)}</DataTableCell>
                      <DataTableCell className="font-bold">{money(m.balance_after, currency)}</DataTableCell>
                      <DataTableCell className="max-w-xs truncate text-sm text-[var(--text-muted)]">
                        {m.notes || m.reversal_reason || "—"}
                      </DataTableCell>
                      <DataTableCell>
                        {isReversible && (
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={<RotateCcw size={13} />}
                            onClick={() => setReversal({ movement: m, transferGroupId: null, reason: "", submitting: false, error: null })}
                          >
                            إلغاء
                          </Button>
                        )}
                        {isTransfer && m.transfer_group_id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={<RotateCcw size={13} />}
                            onClick={() => setReversal({ movement: null, transferGroupId: m.transfer_group_id!, reason: "", submitting: false, error: null })}
                          >
                            عكس التحويل
                          </Button>
                        )}
                        {(isOpening || isReversal) && (
                          <span className="text-xs text-[var(--text-muted)]">مقيّد</span>
                        )}
                        {/* Purchase / Sale entries must be reversed from the invoice page to keep paid_amount + supplier balance in sync */}
                        {(m.reference_type === "purchase" || m.reference_type === "sale") && m.reference_id && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--surface-hover)]"
                            title={m.reference_type === "purchase" ? "اعكس الدفعة من صفحة فاتورة الشراء" : "اعكس الدفعة من صفحة فاتورة البيع"}
                            onClick={() => nav(m.reference_type === "purchase" ? `/purchases/${m.reference_id}` : `/sales/${m.reference_id}`)}
                          >
                            ← افتح الفاتورة
                          </button>
                        )}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>

            <TableFooter
              visibleCount={items.length}
              totalCount={pagination.total}
              entityName="حركة"
              page={pagination.page}
              totalPages={Math.max(1, pagination.totalPages)}
              pageSize={pagination.limit}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>

      {/* ── Reversal dialog ───────────────────────────────────────────── */}
      {isReversalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-bold">
              {reversal.transferGroupId
                ? "عكس التحويل"
                : reversal.movement?.reference_type === "income" ||
                    reversal.movement?.reference_type === "expense"
                  ? "إلغاء المعاملة المالية"
                  : "إلغاء الحركة"}
            </h2>
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              {reversal.transferGroupId
                ? "سيتم عكس كلا طرفي التحويل بشكل مجمّع وذري."
                : reversal.movement?.reference_type === "income" ||
                    reversal.movement?.reference_type === "expense"
                  ? "سيتم إلغاء المعاملة المالية الأصلية بنفس منطق صفحة المعاملات المالية، وتحديث حالتها وسبب الإلغاء وعكس أثرها على الصندوق."
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
                onClick={() => setReversal({ movement: null, transferGroupId: null, reason: "", submitting: false, error: null })}
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