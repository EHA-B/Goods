import { Eye, PencilLine, Trash2 } from "lucide-react";
import { Button } from "../ui";
import type { Supplier } from "./types";

type Props = {
  supplier: Supplier;
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
};

export default function SupplierActions({ supplier, onView, onEdit, onDelete }: Props) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" variant="secondary" startIcon={<Eye size={15} />} onClick={() => onView(supplier)}>استعراض</Button>
      <Button size="sm" variant="secondary" startIcon={<PencilLine size={15} />} onClick={() => onEdit(supplier)}>تعديل</Button>
      <Button size="sm" variant="danger" startIcon={<Trash2 size={15} />} onClick={() => onDelete(supplier)}>حذف</Button>
    </div>
  );
}
