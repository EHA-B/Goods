import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DataTable, DataTableBody, DataTableCell, DataTableHead,
  DataTableHeaderCell, DataTableRow,
} from "../../components/common";
import { Button, Card, EmptyState, PageHeader } from "../../components/ui";

const formatMoney = (v: number | null, c = "SYP") => {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " " + c;
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  sale: "دفعة مبيعات",
  purchase: "دفعة مشتريات",
  general_receipt: "سند قبض عام",
  general_payment: "سند دفع عام",
};

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.stockliteApi.payments.list();
      setItems(data || []);
    } catch (e: any) {
      setError(e.message || "حدث خطأ أثناء تحميل الدفعات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <PageHeader
        title="المدفوعات والمقبوضات"
        description="إدارة كافة سندات القبض والدفع العامة ودفعات الفواتير."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" startIcon={<RefreshCw size={16} />} onClick={loadData}>
              تحديث
            </Button>
            <Button startIcon={<Plus size={16} />} onClick={() => navigate("/payments/new")}>
              سند جديد
            </Button>
          </div>
        }
      />

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
          <EmptyState title="لا توجد دفعات" description="لم يتم تسجيل أي دفعات بعد." />
        ) : (
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>#</DataTableHeaderCell>
                <DataTableHeaderCell>التاريخ</DataTableHeaderCell>
                <DataTableHeaderCell>النوع</DataTableHeaderCell>
                <DataTableHeaderCell>الحساب</DataTableHeaderCell>
                <DataTableHeaderCell>المبلغ</DataTableHeaderCell>
                <DataTableHeaderCell>الرصيد بعد</DataTableHeaderCell>
                <DataTableHeaderCell>ملاحظات</DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {items.map((m) => {
                const isReceipt = m.payment_type === "sale" || m.payment_type === "general_receipt";
                return (
                  <DataTableRow key={m.id}>
                    <DataTableCell className="text-[var(--text-muted)] text-xs">{m.id}</DataTableCell>
                    <DataTableCell>{m.payment_date}</DataTableCell>
                    <DataTableCell>
                      <span className="text-sm font-medium">
                        {PAYMENT_TYPE_LABELS[m.payment_type] ?? m.payment_type}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      {m.customer_name || m.supplier_name || ((m.party_type === "customer" ? "عميل" : "مورد") + (m.party_id ? ` #${m.party_id}` : ""))}
                    </DataTableCell>
                    <DataTableCell>
                      {isReceipt ? (
                        <span className="inline-flex items-center gap-1 text-[var(--success)] font-semibold">
                          <ArrowDownLeft size={14} />
                          {formatMoney(m.amount, m.currency)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[var(--danger)] font-semibold">
                          <ArrowUpRight size={14} />
                          {formatMoney(m.amount, m.currency)}
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="font-bold">{formatMoney(m.balance_after, m.currency)}</DataTableCell>
                    <DataTableCell className="max-w-xs truncate text-sm text-[var(--text-muted)]">
                      {m.notes || "—"}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </Card>
    </>
  );
}
