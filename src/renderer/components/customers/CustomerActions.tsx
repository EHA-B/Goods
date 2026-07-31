import { Eye, PencilLine, Trash2 } from "lucide-react";
import { Button } from "../ui";
import type { Customer } from "./types";

type Props = {
  customer: Customer;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
};

export default function CustomerActions({ customer, onView, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" variant="secondary" startIcon={<Eye size={15} />} onClick={() => onView(customer)}>
        استعراض
      </Button>
      <Button size="sm" variant="secondary" startIcon={<PencilLine size={15} />} onClick={() => onEdit(customer)}>
        تعديل
      </Button>
      <Button size="sm" variant="danger" startIcon={<Trash2 size={15} />} onClick={() => onDelete(customer)}>
        حذف
      </Button>
    </div>
  );
}
