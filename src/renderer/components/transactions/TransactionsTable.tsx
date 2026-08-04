import { Eye } from "lucide-react";
import DataTable from "../common/DataTable";
import DataTableBody from "../common/DataTableBody";
import DataTableCell from "../common/DataTableCell";
import DataTableHead from "../common/DataTableHead";
import DataTableHeaderCell from "../common/DataTableHeaderCell";
import DataTableRow from "../common/DataTableRow";
import { Button } from "../ui";
import type { FinancialTransaction } from "./types";
import TransactionTypeBadge from "./TransactionTypeBadge";
import Badge from "../../components/ui/Badge";

const money = (v: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export default function TransactionsTable({ items, onView }: { items: FinancialTransaction[]; onView: (x: FinancialTransaction) => void }) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          {["التاريخ", "النوع", "الحالة", "الفئة", "الصندوق", "الوصف", "المرجع", "المبلغ", "الإجراءات"].map(h => (
            <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>
          ))}
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {items.map((x) => (
          <DataTableRow key={x.id}>
            <DataTableCell>{x.transaction_date || x.transaction_date}</DataTableCell>
            <DataTableCell>
              <TransactionTypeBadge type={x.type} />
            </DataTableCell>
            <DataTableCell>
              {x.status === "active" ? (
                <Badge variant="success">فعال</Badge>
              ) : (
                <Badge variant="danger">ملغي</Badge>
              )}
            </DataTableCell>
            <DataTableCell className="font-medium text-[var(--text-primary)]">{x.category_name}</DataTableCell>
            <DataTableCell>{x.cashbox_name}</DataTableCell>
            <DataTableCell>{x.description || "—"}</DataTableCell>
            <DataTableCell>
              <span dir="ltr" className="tabular-nums">{x.reference_number || "—"}</span>
            </DataTableCell>
            <DataTableCell>
              <span dir="ltr" className="font-bold tabular-nums">
                {money(x.amount)}
              </span>
            </DataTableCell>
            <DataTableCell>
              <Button size="sm" variant="secondary" startIcon={<Eye size={15} />} onClick={() => onView(x)}>استعراض</Button>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
