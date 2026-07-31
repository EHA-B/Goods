import { DataTableCell, DataTableRow } from "../common";
import ProductActions from "./ProductActions";
import type { Product } from "./ProductsTable";
import ProductStatus from "./ProductStatus";

type ProductRowProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function ProductRow({
  product,
  onEdit,
  onDelete,
}: ProductRowProps) {
  return (
    <DataTableRow>
      <DataTableCell>
        <div>
          <p className="font-bold text-[var(--text-primary)]">
            {product.name}
          </p>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            معرّف المنتج: {product.id}
          </p>
        </div>
      </DataTableCell>

      <DataTableCell>
        <span dir="ltr" className="inline-block font-medium">
          {product.code || "—"}
        </span>
      </DataTableCell>

      <DataTableCell>{product.category || "—"}</DataTableCell>

      <DataTableCell>
        <span className="font-medium text-[var(--text-primary)]">
          {product.unit}
        </span>
      </DataTableCell>

      <DataTableCell>
        <ProductStatus status={product.isActive ? "active" : "inactive"} />
      </DataTableCell>

      <DataTableCell>
        <ProductActions
          product={product}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </DataTableCell>
    </DataTableRow>
  );
}
