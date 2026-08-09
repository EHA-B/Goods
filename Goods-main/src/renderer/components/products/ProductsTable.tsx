import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../common";

import ProductRow from "./ProductRow";
import type { Product } from "../../pages/products/productsService";

export type { Product } from "../../pages/products/productsService";

export type ProductStatus = "active" | "inactive";

type ProductsTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function ProductsTable({
  products,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>المنتج</DataTableHeaderCell>
          <DataTableHeaderCell>الكود</DataTableHeaderCell>
          <DataTableHeaderCell>التصنيف</DataTableHeaderCell>
          <DataTableHeaderCell>الوحدة</DataTableHeaderCell>
          <DataTableHeaderCell>الحالة</DataTableHeaderCell>
          <DataTableHeaderCell>الإجراءات</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHead>

      <DataTableBody>
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </DataTableBody>
    </DataTable>
  );
}
