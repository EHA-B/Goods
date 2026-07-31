import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Eye,
  Pencil,
  Plus,
  Trash2,
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
import { cashboxesService, type Cashbox } from "./cashboxesService";

const money = (value: number, currency = "SAR") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);

export default function CashboxesPage() {
  const navigate = useNavigate();
  const [cashboxes, setCashboxes] = useState(cashboxesService.list());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<Cashbox | null>(null);

  const filteredCashboxes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return cashboxes.filter((cashbox) => {
      const matchesSearch =
        !query ||
        cashbox.name.toLowerCase().includes(query) ||
        cashbox.parentName?.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        cashbox.isActive === (statusFilter === "active");

      return matchesSearch && matchesStatus;
    });
  }, [cashboxes, searchQuery, statusFilter]);

  const totalBalance = cashboxes.reduce(
    (sum, cashbox) => sum + cashbox.balance,
    0,
  );
  const movements = cashboxes.flatMap((cashbox) =>
    cashboxesService.movements(cashbox.id),
  );
  const totalIn = movements
    .filter((movement) => movement.direction === "in")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalOut = movements
    .filter((movement) => movement.direction === "out")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const filtersAreActive =
    Boolean(searchQuery.trim()) || statusFilter !== "all";

  const handleDelete = () => {
    if (!pendingDelete) return;

    cashboxesService.remove(pendingDelete.id);
    setCashboxes(cashboxesService.list());
    setPendingDelete(null);
  };

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs text-[var(--text-muted)]">إجمالي الأرصدة</p>
          <p className="mt-2 text-2xl font-bold">{money(totalBalance)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">الصناديق النشطة</p>
          <p className="mt-2 text-2xl font-bold">
            {cashboxes.filter((cashbox) => cashbox.isActive).length}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">إجمالي الدخول</p>
          <p className="mt-2 text-2xl font-bold">{money(totalIn)}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--text-muted)]">إجمالي الخروج</p>
          <p className="mt-2 text-2xl font-bold">{money(totalOut)}</p>
        </Card>
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
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
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
                {filteredCashboxes.map((cashbox) => {
                  const canDelete = cashboxesService.canDelete(cashbox.id);

                  return (
                    <DataTableRow key={cashbox.id}>
                      <DataTableCell className="font-bold text-[var(--text-primary)]">
                        {cashbox.name}
                      </DataTableCell>
                      <DataTableCell>
                        {cashbox.parentName || "—"}
                      </DataTableCell>
                      <DataTableCell>
                        {money(cashbox.initialBalance, cashbox.currency)}
                      </DataTableCell>
                      <DataTableCell className="font-bold text-[var(--text-primary)]">
                        {money(cashbox.balance, cashbox.currency)}
                      </DataTableCell>
                      <DataTableCell>{cashbox.currency}</DataTableCell>
                      <DataTableCell>
                        <StatusBadge
                          status={cashbox.isActive ? "active" : "inactive"}
                        />
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={<Eye size={15} />}
                            onClick={() =>
                              navigate(`/cashboxes/${cashbox.id}`)
                            }
                          >
                            استعراض
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            startIcon={<Pencil size={15} />}
                            onClick={() =>
                              navigate(`/cashboxes/${cashbox.id}/edit`)
                            }
                          >
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            startIcon={<Trash2 size={15} />}
                            disabled={!canDelete}
                            title={
                              canDelete
                                ? undefined
                                : "لا يمكن حذف صندوق مرتبط بحركات أو صناديق فرعية"
                            }
                            onClick={() => setPendingDelete(cashbox)}
                          >
                            حذف
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
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
          ملاحظة: لا يمكن حذف صندوق يحتوي حركات مالية أو صناديق فرعية؛
          يمكن تعطيله بدلًا من ذلك. الرصيد الحالي لا يُعدّل يدويًا.
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف الصندوق"
        message={`هل تريد حذف ${pendingDelete?.name || ""}؟`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
