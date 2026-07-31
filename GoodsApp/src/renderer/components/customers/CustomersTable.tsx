import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../common";
import { StatusBadge } from "../ui";
import CustomerActions from "./CustomerActions";
import type { Customer } from "./types";

type Props = {
  customers: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
};

function formatBalance(balance: number) {
  return Math.abs(balance).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function CustomersTable({ customers, onView, onEdit, onDelete }: Props) {
  return (
    <DataTable className="min-w-[980px]">
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>العميل</DataTableHeaderCell>
          <DataTableHeaderCell>الهاتف</DataTableHeaderCell>
          <DataTableHeaderCell>العنوان</DataTableHeaderCell>
          <DataTableHeaderCell>الرصيد</DataTableHeaderCell>
          <DataTableHeaderCell>الحالة</DataTableHeaderCell>
          <DataTableHeaderCell>الإجراءات</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHead>

      <DataTableBody>
        {customers.map((customer) => (
          <DataTableRow key={customer.id}>
            <DataTableCell>
              <div>
                <p className="font-bold text-[var(--text-primary)]">
                  {customer.name}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  رقم العميل: {customer.id}
                </p>
              </div>
            </DataTableCell>

            <DataTableCell>
              <span dir="ltr" className="inline-block">
                {customer.phone || "—"}
              </span>
            </DataTableCell>

            <DataTableCell>
              <span className="block max-w-56 truncate" title={customer.address}>
                {customer.address || "—"}
              </span>
            </DataTableCell>

            <DataTableCell>
              {customer.balance === 0 ? (
                <span className="font-bold text-[var(--text-muted)]">متوازن</span>
              ) : customer.balance > 0 ? (
                <div>
                  <p className="font-bold text-[var(--danger)]">
                    {formatBalance(customer.balance)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">عليه</p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-[var(--success)]">
                    {formatBalance(customer.balance)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">له</p>
                </div>
              )}
            </DataTableCell>

            <DataTableCell>
              <StatusBadge variant={customer.isActive ? "success" : "danger"}>
                {customer.isActive ? "نشط" : "غير نشط"}
              </StatusBadge>
            </DataTableCell>

            <DataTableCell>
              <CustomerActions
                customer={customer}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
