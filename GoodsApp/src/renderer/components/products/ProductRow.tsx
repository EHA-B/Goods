
import { DataTableCell, DataTableRow } from "../common";
import ProductActions from "./ProductActions";
import type { Product } from "./ProductsTable";
import ProductStatus from "./ProductStatus";
type ProductRowProps = {
  product: Product;
};

export default function ProductRow({
  product,
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
        <span
          dir="ltr"
          className="inline-block font-medium"
        >
          {product.code}
        </span>
      </DataTableCell>

      <DataTableCell>
        {product.category}
      </DataTableCell>

      <DataTableCell>
        <span className="font-bold text-[var(--text-primary)]">
          {product.quantity}
        </span>

        <span className="mr-1.5 text-xs text-[var(--text-muted)]">
          {product.unit}
        </span>
      </DataTableCell>

      <DataTableCell>
        <span className="font-bold text-[var(--text-primary)]">
          {product.salePrice.toLocaleString("ar-SY")}
        </span>

        <span className="mr-1.5 text-xs text-[var(--text-muted)]">
          ل.س
        </span>
      </DataTableCell>

      <DataTableCell>
        <ProductStatus status={product.status} />
        
      </DataTableCell>

      <DataTableCell>
        <ProductActions product={product} />
      </DataTableCell>
    </DataTableRow>
  );
}