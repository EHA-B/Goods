import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../common";

import ProductRow from "./ProductRow";
export type ProductStatus = "available" | "low" | "out";

export type Product = {
  id: number;
  name: string;
  code: string;
  category: string;
  quantity: number;
  unit: string;
  salePrice: number;
  status: ProductStatus;
};

type ProductsTableProps = {
  products: Product[];
};
export default function ProductsTable({
  products,
}: ProductsTableProps) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>المنتج</DataTableHeaderCell>

          <DataTableHeaderCell>الكود</DataTableHeaderCell>

          <DataTableHeaderCell>التصنيف</DataTableHeaderCell>

          <DataTableHeaderCell>الكمية</DataTableHeaderCell>

          <DataTableHeaderCell>سعر البيع</DataTableHeaderCell>

          <DataTableHeaderCell>الحالة</DataTableHeaderCell>

          <DataTableHeaderCell />
        </DataTableRow>
      </DataTableHead>

      <DataTableBody>
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
          />
        ))}
      </DataTableBody>
    </DataTable>
  );
}