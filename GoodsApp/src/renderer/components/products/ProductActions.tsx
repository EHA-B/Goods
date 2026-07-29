import { PencilLine, Trash2 } from "lucide-react";

import { Button } from "../ui";
import type { Product } from "./ProductsTable";

type ProductActionsProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function ProductActions({
  product,
  onEdit,
  onDelete,
}: ProductActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        startIcon={<PencilLine size={15} />}
        onClick={() => onEdit(product)}
      >
        تعديل
      </Button>

      <Button
        size="sm"
        variant="danger"
        startIcon={<Trash2 size={15} />}
        onClick={() => onDelete(product)}
      >
        حذف
      </Button>
    </div>
  );
}
