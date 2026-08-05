import { notifyError, notifySuccess } from "../../lib/notifications";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, PackageOpen, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import TableFooter from "../../components/common/TableFooter";
import ProductsTable from "../../components/products/ProductsTable";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PageHeader,
} from "../../components/ui";
import { PATHS } from "../../routes/path";

import ProductsToolbar from "../../components/products/ProductsToolbar";
import {
  getProductErrorMessage,
  productsService,
  type Product,
} from "./productsService";

export default function ProductsPage() {
  console.info("STOCKLITE_PRODUCTS_IPC_V1: Products page is using the database API");
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<Product>();
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      setProducts(await productsService.list());
    } catch (error) {
      setLoadError(getProductErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        (product.code ?? "").toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.unit.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.isActive) ||
        (statusFilter === "inactive" && !product.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  const filtersAreActive =
    searchQuery.trim().length > 0 || statusFilter !== "all";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
  }

  function openEditPage(product: Product) {
    navigate(`/products/${product.id}/edit`);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;

    try {
      setIsDeleting(true);
      await productsService.remove(pendingDelete.id);
      setProducts((current) =>
        current.filter((product) => product.id !== pendingDelete.id),
      );
      notifySuccess("تم حذف المنتج بنجاح");
      setPendingDelete(undefined);
    } catch (error) {
      notifyError(getProductErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="المنتجات"
        description="إدارة بيانات المنتجات الأساسية المستخدمة في المخزون والفواتير."
        actions={
          <Button
            startIcon={<Plus size={17} />}
            onClick={() => navigate(PATHS.PRODUCT_NEW)}
          >
            إضافة منتج
          </Button>
        }
      />

      <Card padding={false}>
        <ProductsToolbar
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          filtersAreActive={filtersAreActive}
          onSearchChange={setSearchQuery}
          onStatusChange={setStatusFilter}
          onClearFilters={clearFilters}
        />

        {isLoading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-medium">جاري تحميل المنتجات...</p>
          </div>
        ) : loadError ? (
          <EmptyState
            icon={<AlertCircle size={26} />}
            title="تعذر تحميل المنتجات"
            description={loadError}
            action={
              <Button
                variant="secondary"
                startIcon={<RefreshCw size={16} />}
                onClick={() => void loadProducts()}
              >
                إعادة المحاولة
              </Button>
            }
          />
        ) : filteredProducts.length > 0 ? (
          <>
            <ProductsTable
              products={filteredProducts}
              onEdit={openEditPage}
              onDelete={setPendingDelete}
            />

            <TableFooter
              visibleCount={filteredProducts.length}
              totalCount={products.length}
              entityName="منتج"
            />
          </>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<PackageOpen size={26} />}
            title="لا توجد منتجات"
            description="ابدأ بإضافة أول منتج ليظهر في المخزون والفواتير."
            action={
              <Button
                startIcon={<Plus size={16} />}
                onClick={() => navigate(PATHS.PRODUCT_NEW)}
              >
                إضافة أول منتج
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="لا توجد نتائج مطابقة"
            description="لم نعثر على منتج يطابق عبارة البحث أو الحالة المحددة."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                عرض جميع المنتجات
              </Button>
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف المنتج"
        message={
          pendingDelete
            ? `هل أنت متأكد من حذف المنتج «${pendingDelete.name}»؟ لا يمكن حذف المنتج إذا كان مرتبطًا بدفعات أو حركات مخزون.`
            : ""
        }
        loading={isDeleting}
        confirmText="حذف المنتج"
        onCancel={() => {
          if (!isDeleting) setPendingDelete(undefined);
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
