import { Plus, PackageSearch } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import ProductsTable, { type Product } from "../../components/products/ProductsTable";
import ProductsToolbar from "../../components/products/ProductsToolbar";
import { Button, Card, ConfirmDialog, EmptyState, PageHeader } from "../../components/ui";
import { useProducts } from "./ProductsContext";

export default function ProductsPage() {
  const navigate = useNavigate();
  const { products, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productToDelete, setProductToDelete] = useState<Product>();
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => (!query || product.name.toLowerCase().includes(query) || product.code.toLowerCase().includes(query) || product.category.toLowerCase().includes(query)) && (statusFilter === "all" || product.status === statusFilter));
  }, [products, searchQuery, statusFilter]);
  const filtersAreActive = Boolean(searchQuery.trim()) || statusFilter !== "all";
  const clearFilters = () => { setSearchQuery(""); setStatusFilter("all"); };

  return <>
    <PageHeader title="المنتجات" description="إدارة بيانات المنتجات والأسعار والكميات المتوفرة." actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate("/products/new")}>إضافة منتج</Button>} />
    <Card padding={false} header="قائمة المنتجات" description="عرض المنتجات وإدارة بياناتها من صفحات مستقلة.">
      <ProductsToolbar searchQuery={searchQuery} statusFilter={statusFilter} filtersAreActive={filtersAreActive} onSearchChange={setSearchQuery} onStatusChange={setStatusFilter} onClearFilters={clearFilters} />
      {filteredProducts.length ? <><ProductsTable products={filteredProducts} onEdit={(product) => navigate(`/products/${product.id}/edit`)} onDelete={setProductToDelete} /><TableFooter visibleCount={filteredProducts.length} totalCount={products.length} entityName="منتج" /></> : <EmptyState icon={<PackageSearch size={32} />} title={filtersAreActive ? "لا توجد منتجات مطابقة" : "لا توجد منتجات"} description={filtersAreActive ? "جرّب تغيير عبارة البحث أو حالة المنتج." : "أضف أول منتج ليظهر هنا."} action={filtersAreActive ? <Button variant="secondary" onClick={clearFilters}>عرض جميع المنتجات</Button> : undefined} />}
    </Card>
    <ConfirmDialog open={Boolean(productToDelete)} title="حذف المنتج" message={`هل أنت متأكد من حذف المنتج «${productToDelete?.name ?? ""}»؟`} onCancel={() => setProductToDelete(undefined)} onConfirm={() => { if (productToDelete) deleteProduct(productToDelete.id); setProductToDelete(undefined); }} />
  </>;
}
