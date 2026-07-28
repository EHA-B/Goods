import {
  MoreHorizontal,
  PencilLine,
  Trash2,
} from "lucide-react";

import {
  IconButton,
} from "../ui";

import type { Product } from "./ProductsTable";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";

type ProductActionsProps = {
  product: Product;
};

export default function ProductActions({
  product,
}: ProductActionsProps) {
  return (
    <DropdownMenu
      trigger={
        <IconButton
           aria-label="إجراءات المنتج"
      className="h-8 w-8"
        >
          <MoreHorizontal size={18} />
        </IconButton>
      }
    >
      <DropdownMenuItem
        icon={<PencilLine size={15} />}
        onClick={() => {
          console.log("Edit", product.id);
        }}
      >
        تعديل المنتج
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        danger
        icon={<Trash2 size={15} />}
        onClick={() => {
          console.log("Delete", product.id);
        }}
      >
        حذف المنتج
      </DropdownMenuItem>
    </DropdownMenu>
  );
}