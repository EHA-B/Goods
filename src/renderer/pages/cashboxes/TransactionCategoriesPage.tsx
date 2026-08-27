import { notifyError, notifySuccess } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/common/DataTable";
import DataTableBody from "../../components/common/DataTableBody";
import DataTableCell from "../../components/common/DataTableCell";
import DataTableHead from "../../components/common/DataTableHead";
import DataTableHeaderCell from "../../components/common/DataTableHeaderCell";
import DataTableRow from "../../components/common/DataTableRow";
import TableFooter from "../../components/common/TableFooter";
import { BackButton, Button, Card, ConfirmDialog, EmptyState, PageHeader, StatusBadge } from "../../components/ui";
import { PATHS } from "../../routes/path";
import type { TransactionCategory } from "../../components/transactions/types";
import { transactionsService } from "../transactions/transactionsService";
import { RECORDS_PAGE_SIZE, useClientPagination } from "../../lib/pagination";

export default function TransactionCategoriesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<TransactionCategory[]>([]);
  const [pending, setPending] = useState<TransactionCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const data = await transactionsService.loadCategories();
      setItems(data);
    } catch (loadError) {
      setError(getArabicErrorMessage(loadError, "تعذر تحميل الفئات المالية."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
  } = useClientPagination(
    items,
    {
      pageSize: RECORDS_PAGE_SIZE,
      resetKey: String(items.length),
    },
  );

  async function confirmDelete() {
    if (!pending) return;
    try {
      await transactionsService.removeCategory(pending.id);
      setPending(null);
      await loadData();
      notifySuccess("تم حذف الفئة بنجاح.");
    } catch (deleteError) {
      const message = getArabicErrorMessage(deleteError, "تعذر حذف الفئة.");
      const friendly = message.includes("used") || message.includes("CATEGORY_IN_USE") ? "لا يمكن حذف فئة مستخدمة في معاملات سابقة. عطّلها بدلًا من ذلك." : message;
      setError(friendly);
      notifyError(friendly);
      setPending(null);
    }
  }

  return (
    <>
      <PageHeader title="فئات الإيرادات والمصروفات" description="إدارة الفئات المستخدمة عند تسجيل المعاملات المالية اليدوية." actions={<div className="flex flex-wrap gap-2"><BackButton to={PATHS.TRANSACTIONS} label="العودة إلى المعاملات" /><Button startIcon={<Plus size={16} />} onClick={() => navigate(PATHS.TRANSACTION_CATEGORY_NEW)}>إضافة فئة</Button></div>} />
      <Card padding={false} header="الفئات المالية" description="يمكن تعطيل الفئة لمنع استخدامها في معاملات جديدة مع الاحتفاظ بالسجلات السابقة.">
        {loading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">جاري تحميل الفئات...</div>
        ) : error ? (
          <EmptyState icon={<Tags size={32} />} title="تعذر تحميل الفئات" description={error} action={<Button variant="secondary" onClick={() => void loadData()}>إعادة المحاولة</Button>} />
        ) : items.length ? (
          <>
            <DataTable>
              <DataTableHead><DataTableRow>{["اسم الفئة", "النوع", "الوصف", "الحالة", "عدد المعاملات", "الإجراءات"].map((header) => <DataTableHeaderCell key={header}>{header}</DataTableHeaderCell>)}</DataTableRow></DataTableHead>
              <DataTableBody>
                {paginatedItems.map((item) => (
                  <DataTableRow key={item.id}>
                    <DataTableCell className="font-bold text-[var(--text-primary)]">{item.name}</DataTableCell>
                    <DataTableCell>{item.type === "income" ? "إيراد" : "مصروف"}</DataTableCell>
                    <DataTableCell>{item.description || "—"}</DataTableCell>
                    <DataTableCell><StatusBadge variant={item.isActive ? "success" : "danger"}>{item.isActive ? "نشط" : "معطل"}</StatusBadge></DataTableCell>
                    <DataTableCell><span dir="ltr" className="tabular-nums">{new Intl.NumberFormat("en-US").format(item.transactionCount)}</span></DataTableCell>
                    <DataTableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" startIcon={<Pencil size={14} />} onClick={() => navigate(`/transaction-categories/${item.id}/edit`)}>تعديل</Button>
                        <Button size="sm" variant="danger" startIcon={<Trash2 size={14} />} disabled={item.transactionCount > 0} title={item.transactionCount > 0 ? "لا يمكن حذف فئة مستخدمة في معاملات سابقة" : undefined} onClick={() => setPending(item)}>حذف</Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
            <div className="border-t border-[var(--border)] px-4 py-3"><p className="text-xs text-[var(--text-muted)]">لا يمكن حذف فئة مستخدمة في معاملات مالية سابقة، ويمكن تعطيلها بدلًا من ذلك.</p></div>
            <TableFooter visibleCount={paginatedItems.length} totalCount={items.length} entityName="فئة" page={page} totalPages={totalPages} pageSize={RECORDS_PAGE_SIZE} onPageChange={setPage} />
          </>
        ) : (
          <EmptyState icon={<Tags size={32} />} title="لا توجد فئات مالية" description="أضف فئة إيراد أو مصروف لبدء تسجيل المعاملات." />
        )}
      </Card>
      <ConfirmDialog open={Boolean(pending)} title="حذف الفئة" message={`هل تريد حذف ${pending?.name || ""}؟`} onCancel={() => setPending(null)} onConfirm={() => void confirmDelete()} />
    </>
  );
}
