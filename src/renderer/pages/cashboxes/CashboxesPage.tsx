import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Eye,
  Pencil,
  Plus,
  Trash2,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../../components/common";
import TableFooter from "../../components/common/TableFooter";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatusBadge,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { cashboxesService, translateCashboxError } from "./cashboxesService";
import { currencyName, currencySymbol, formatMoney, formatNumber } from "./currency";

export default function CashboxesPage() {
  const navigate = useNavigate();

  const [cashboxes, setCashboxes] = useState<CashboxApiRecord[]>([]);
  const [summary, setSummary] = useState<CashboxesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<CashboxApiRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([
        cashboxesService.list(),
        cashboxesService.summary(),
      ]);
      setCashboxes(list);
      setSummary(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل بيانات الصناديق");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCashboxes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cashboxes.filter((c) => {
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.parent_name?.toLowerCase().includes(query) ?? false);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? c.isActive : !c.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [cashboxes, searchQuery, statusFilter]);

  const filtersAreActive = Boolean(searchQuery.trim()) || statusFilter !== "all";

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await cashboxesService.remove(pendingDelete.id);
      setPendingDelete(null);
      await loadData();
    } catch (e: unknown) {
      setDeleteError(translateCashboxError(e));
    } finally {
      setDeleting(false);
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

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">{error}</p>
        <Button variant="secondary" startIcon={<RefreshCw size={16} />} onClick={loadData}>
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="الصناديق"
        description="إدارة الأرصدة والحركات المالية والتحويلات بين الصناديق."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              startIcon={<ArrowLeftRight size={17} />}
              onClick={() => navigate(PATHS.CASHBOX_TRANSFER_NEW)}
            >
              تحويل
            </Button>
            <Button
              startIcon={<Plus size={17} />}
              onClick={() => navigate(PATHS.CASHBOX_NEW)}
            >
              إضافة صندوق
            </Button>
          </div>
        }
      />

      {/* ── Multi-currency summary ───────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr]">
        {/* Active / Inactive count */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <p className="text-xs text-[var(--text-muted)]">الصناديق النشطة</p>
            <p className="mt-2 text-2xl font-bold">{summary?.activeCashboxesCount ?? 0}</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--text-muted)]">الصناديق غير النشطة</p>
            <p className="mt-2 text-2xl font-bold">{summary?.inactiveCashboxesCount ?? 0}</p>
          </Card>
        </div>

        {/* Per-currency balance cards */}
        {(summary?.balancesByCurrency ?? []).length === 0 ? (
          <Card className="sm:col-span-2">
            <p className="text-xs text-[var(--text-muted)]">لا توجد أرصدة مسجّلة بعد.</p>
          </Card>
        ) : (
          (summary?.balancesByCurrency ?? []).map((entry) => (
            <Card key={entry.currency}>
              <p className="text-xs font-semibold text-[var(--text-muted)]">{currencyName(entry.currency)} · {currencySymbol(entry.currency)}</p>
              <p className="mt-2 text-2xl font-bold">
                {formatMoney(entry.balance, entry.currency)}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span className="text-[var(--success)]">↓ دخول: {formatNumber(entry.totalIn)} {currencySymbol(entry.currency)}</span>
                <span className="text-[var(--danger)]">↑ خروج: {formatNumber(entry.totalOut)} {currencySymbol(entry.currency)}</span>
              </div>
              {entry.openingBalance > 0 && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  رصيد افتتاحي: {formatNumber(entry.openingBalance)} {currencySymbol(entry.currency)}
                </p>
              )}
            </Card>
          ))
        )}
      </div>

      <Card
        padding={false}
        className="mt-5"
        header="قائمة الصناديق"
        description="عرض الصناديق وأرصدتها الحالية وحالتها."
      >
        <div className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[1fr_220px_auto]">
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث باسم الصندوق أو الصندوق الأب"
          />
          <Select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[
              { value: "all", label: "كل الحالات" },
              { value: "active", label: "نشط" },
              { value: "inactive", label: "غير نشط" },
            ]}
          />
          <Button
            variant="secondary"
            disabled={!filtersAreActive}
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}
          >
            مسح الفلاتر
          </Button>
        </div>

        {filteredCashboxes.length ? (
          <>
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>الصندوق</DataTableHeaderCell>
                  <DataTableHeaderCell>الصندوق الأب</DataTableHeaderCell>
                  <DataTableHeaderCell>الرصيد الافتتاحي</DataTableHeaderCell>
                  <DataTableHeaderCell>الرصيد الحالي</DataTableHeaderCell>
                  <DataTableHeaderCell>العملة</DataTableHeaderCell>
                  <DataTableHeaderCell>الحالة</DataTableHeaderCell>
                  <DataTableHeaderCell>الإجراءات</DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>

              <DataTableBody>
                {filteredCashboxes.map((cashbox) => (
                  <DataTableRow key={cashbox.id}>
                    <DataTableCell className="font-bold text-[var(--text-primary)]">
                      {cashbox.name}
                    </DataTableCell>
                    <DataTableCell>{cashbox.parent_name || "—"}</DataTableCell>
                    <DataTableCell>
                      {formatMoney(cashbox.initial_balance, cashbox.currency)}
                    </DataTableCell>
                    <DataTableCell className="font-bold text-[var(--text-primary)]">
                      {formatMoney(cashbox.balance, cashbox.currency)}
                    </DataTableCell>
                    <DataTableCell>{currencyName(cashbox.currency)} ({currencySymbol(cashbox.currency)})</DataTableCell>
                    <DataTableCell>
                      <StatusBadge variant={cashbox.isActive ? "success" : "warning"}>
                        {cashbox.isActive ? "نشط" : "غير نشط"}
                      </StatusBadge>
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          startIcon={<Eye size={15} />}
                          onClick={() => navigate(`/cashboxes/${cashbox.id}`)}
                        >
                          استعراض
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          startIcon={<Pencil size={15} />}
                          onClick={() => navigate(`/cashboxes/${cashbox.id}/edit`)}
                        >
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          startIcon={<Trash2 size={15} />}
                          onClick={() => {
                            setDeleteError(null);
                            setPendingDelete(cashbox);
                          }}
                        >
                          حذف
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>

            <TableFooter
              visibleCount={filteredCashboxes.length}
              totalCount={cashboxes.length}
              entityName="صندوق"
            />
          </>
        ) : (
          <EmptyState
            icon={<WalletCards size={32} />}
            title={filtersAreActive ? "لا توجد صناديق مطابقة" : "لا توجد صناديق"}
            description={
              filtersAreActive
                ? "جرّب تغيير عبارة البحث أو حالة الصندوق."
                : "أضف صندوقًا جديدًا للبدء."
            }
          />
        )}

        <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-muted)]">
          ملاحظة: لا يمكن حذف صندوق يحتوي حركات مالية أو صناديق فرعية؛ يمكن تعطيله بدلًا من ذلك.
          الرصيد الحالي لا يُعدّل يدويًا. الأرصدة مجمّعة حسب العملة.
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف الصندوق"
        message={
          deleteError
            ? deleteError
            : `هل تريد حذف "${pendingDelete?.name ?? ""}"؟ لا يمكن التراجع عن هذا الإجراء.`
        }
        onCancel={() => { setPendingDelete(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        confirmText={deleting ? "جارٍ الحذف…" : "حذف"}
      />
    </>
  );
}
