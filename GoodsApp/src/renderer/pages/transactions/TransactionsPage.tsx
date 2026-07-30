import { useMemo, useState } from "react";
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
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import { cashboxesService } from "../cashboxes/cashboxesService";

export default function TransactionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(cashboxesService.transactions());
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [cashbox, setCashbox] = useState("all");
  const [pendingDelete, setPendingDelete] =
    useState<FinancialTransaction | null>(null);

  const cashboxes = cashboxesService.list();

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery =
          !query.trim() ||
          `${item.categoryName} ${item.description} ${item.referenceNumber} ${item.cashboxName}`
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesType = type === "all" || item.direction === type;
        const matchesCashbox =
          cashbox === "all" || item.cashboxId === Number(cashbox);

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

  return (
    <>
      <PageHeader
        title="المعاملات المالية"
        description="إدارة الإيرادات والمصروفات اليدوية المرتبطة بالصناديق."
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <BackButton to={PATHS.CASHBOXES} />
            <Button
              variant="secondary"
              startIcon={<Tags size={16} />}
              onClick={() => navigate(PATHS.TRANSACTION_CATEGORIES)}
            >
              إدارة الفئات
            </Button>
            <Button
              variant="secondary"
              startIcon={<Plus size={16} />}
              onClick={() => navigate(`${PATHS.TRANSACTION_NEW}?type=income`)}
            >
              إضافة إيراد
            </Button>
            <Button
              startIcon={<Plus size={16} />}
              onClick={() => navigate(`${PATHS.TRANSACTION_NEW}?type=expense`)}
            >
              إضافة مصروف
            </Button>
          </div>
        }
      />

      <TransactionsSummaryCards
        income={totalIncome}
        expense={totalExpense}
        count={items.length}
      />

      <Card
        padding={false}
        className="mt-5"
        header="سجل المعاملات"
        description="الإيرادات والمصروفات اليدوية فقط؛ دفعات البيع والشراء تظهر ضمن سجل الصندوق."
      >
        <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[minmax(240px,1fr)_180px_220px_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالفئة أو الوصف أو المرجع"
          />
          <Select
            value={type}
            onChange={(event) => setType(event.target.value)}
            options={[
              { value: "all", label: "كل الأنواع" },
              { value: "income", label: "إيرادات" },
              { value: "expense", label: "مصروفات" },
            ]}
          />
          <Select
            value={cashbox}
            onChange={(event) => setCashbox(event.target.value)}
            options={[
              { value: "all", label: "كل الصناديق" },
              ...cashboxes.map((item) => ({
                value: String(item.id),
                label: item.name,
              })),
            ]}
          />
          <Button
            variant="secondary"
            onClick={() => {
              setQuery("");
              setType("all");
              setCashbox("all");
            }}
          >
            مسح الفلاتر
          </Button>
        </div>

        {filteredItems.length ? (
          <>
            <TransactionsTable
              items={filteredItems}
              onView={(item) => navigate(`/transactions/${item.id}`)}
              onEdit={(item) => navigate(`/transactions/${item.id}/edit`)}
              onDelete={setPendingDelete}
            />
            <TableFooter
              visibleCount={filteredItems.length}
              totalCount={items.length}
              entityName="معاملة"
            />
          </>
        ) : (
          <EmptyState
            icon={<ReceiptText size={32} />}
            title="لا توجد معاملات مطابقة"
            description="غيّر البحث أو الفلاتر، أو سجّل معاملة جديدة."
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف المعاملة"
        message="سيؤدي حذف المعاملة إلى عكس أثرها على رصيد الصندوق. هل تريد المتابعة؟"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            cashboxesService.removeTransaction(pendingDelete.id);
          }
          setItems(cashboxesService.transactions());
          setPendingDelete(null);
        }}
      />
    </>
  );
}
