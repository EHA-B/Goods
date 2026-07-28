import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import ProductsTable, {
  Product,
} from "../../components/products/ProductsTable";
import ProductsToolbar from "../../components/products/ProductsToolbar";
import TableFooter from "../../components/common/TableFooter";

import {
  Button,
  Card,
  EmptyState,
  PageHeader,
} from "../../components/ui";
import ProductDialog from "./ProductDialog";

const initialProducts: Product[] = [
  {
    id: 1,
    name: "مياه معدنية",
    code: "PRD-001",
    category: "مشروبات",
    quantity: 48,
    unit: "قطعة",
    salePrice: 2500,
    status: "available",
  },
  {
    id: 2,
    name: "عصير برتقال",
    code: "PRD-002",
    category: "مشروبات",
    quantity: 8,
    unit: "علبة",
    salePrice: 4500,
    status: "low",
  },
  {
    id: 3,
    name: "سكر أبيض",
    code: "PRD-003",
    category: "مواد غذائية",
    quantity: 0,
    unit: "كيس",
    salePrice: 12000,
    status: "out",
  },
  {
    id: 4,
    name: "مناديل ورقية",
    code: "PRD-004",
    category: "مستلزمات منزلية",
    quantity: 22,
    unit: "علبة",
    salePrice: 7000,
    status: "available",
  },
  {
    id: 5,
    name: "زيت نباتي",
    code: "PRD-005",
    category: "مواد غذائية",
    quantity: 14,
    unit: "عبوة",
    salePrice: 28000,
    status: "available",
  },
];

export default function ProductsPage() {
  const [products, setProducts] =
    useState<Product[]>(initialProducts);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [
    isProductDialogOpen,
    setIsProductDialogOpen,
  ] = useState(false);

  const filteredProducts = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name
          .toLowerCase()
          .includes(query) ||
        product.code
          .toLowerCase()
          .includes(query) ||
        product.category
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        product.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    products,
    searchQuery,
    statusFilter,
  ]);

  const filtersAreActive =
    searchQuery.trim().length > 0 ||
    statusFilter !== "all";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
  }

  function handleSaveProduct(
    savedProduct: Product,
  ) {
    setProducts((currentProducts) => {
      const productExists =
        currentProducts.some(
          (product) =>
            product.id === savedProduct.id,
        );

      if (productExists) {
        return currentProducts.map(
          (product) =>
            product.id === savedProduct.id
              ? savedProduct
              : product,
        );
      }

      return [
        savedProduct,
        ...currentProducts,
      ];
    });
  }

  return (
    <>
      <PageHeader
        title="المنتجات"
        description="إدارة بيانات المنتجات والأسعار والكميات المتوفرة."
        actions={
          <Button
            startIcon={
              <Plus size={17} />
            }
            onClick={() =>
              setIsProductDialogOpen(true)
            }
          >
            إضافة منتج
          </Button>
        }
      />

      <Card padding={false}>
        <ProductsToolbar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          filtersAreActive={
            filtersAreActive
          }
          onSearchChange={
            setSearchQuery
          }
          onStatusChange={
            setStatusFilter
          }
          onClearFilters={
            clearFilters
          }
        />

        {filteredProducts.length > 0 ? (
          <>
            <ProductsTable
              products={
                filteredProducts
              }
            />

            <TableFooter
              visibleCount={
                filteredProducts.length
              }
              totalCount={
                products.length
              }
              entityName="منتج"
            />
          </>
        ) : (
          <EmptyState
            title="لا توجد نتائج مطابقة"
            description="لم نعثر على منتج يطابق عبارة البحث أو حالة المخزون المحددة."
            action={
              <Button
                variant="secondary"
                onClick={clearFilters}
              >
                عرض جميع المنتجات
              </Button>
            }
          />
        )}
      </Card>

      <ProductDialog
        open={isProductDialogOpen}
        onClose={() =>
          setIsProductDialogOpen(false)
        }
        onSave={handleSaveProduct}
      />
    </>
  );
}