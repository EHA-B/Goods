import {
  notifyError,
  notifySuccess,
} from "../../lib/notifications";

import {
  AlertCircle,
  Plus,
  RefreshCw,
  Truck,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import TableFooter from "../../components/common/TableFooter";
import SuppliersTable from "../../components/suppliers/SuppliersTable";
import SuppliersToolbar from "../../components/suppliers/SuppliersToolbar";

import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PageHeader,
} from "../../components/ui";

import { PATHS } from "../../routes/path";

import {
  getSupplierErrorMessage,
  suppliersService,
  type Supplier,
} from "./suppliersService";

export default function SuppliersPage() {
  const navigate = useNavigate();

  const [
    suppliers,
    setSuppliers,
  ] = useState<Supplier[]>([]);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    supplierToDelete,
    setSupplierToDelete,
  ] = useState<Supplier>();

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const loadSuppliers =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        setSuppliers(
          await suppliersService.list(),
        );
      } catch (error) {
        setLoadError(
          getSupplierErrorMessage(
            error,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const filtered =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return suppliers.filter(
        (supplier) => {
          const matchesSearch =
            !query ||
            [
              supplier.name,
              supplier.phone,
              supplier.email,
              supplier.address,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(query),
            );

          const matchesStatus =
            statusFilter ===
              "all" ||
            (statusFilter ===
              "active" &&
              supplier.isActive) ||
            (statusFilter ===
              "inactive" &&
              !supplier.isActive) ||
            (statusFilter ===
              "payable" &&
              supplier.balance >
                0) ||
            (statusFilter ===
              "advance" &&
              supplier.balance <
                0);

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      suppliers,
      searchQuery,
      statusFilter,
    ]);

  const filtersAreActive =
    Boolean(
      searchQuery.trim(),
    ) ||
    statusFilter !== "all";

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
  }

  async function handleConfirmDelete() {
    if (!supplierToDelete) {
      return;
    }

    try {
      setIsDeleting(true);

      await suppliersService.remove(
        supplierToDelete.id,
      );

      setSuppliers(
        (current) =>
          current.filter(
            (supplier) =>
              supplier.id !==
              supplierToDelete.id,
          ),
      );

      notifySuccess(
        "تم حذف المورد بنجاح",
      );

      setSupplierToDelete(
        undefined,
      );
    } catch (error) {
      /*
       * لا نحول الخطأ إلى string هنا.
       */
      notifyError(error, {
        title:
          "تعذر حذف المورد",
        fallback:
          "لا يمكن حذف المورد. تحقق من وجود فواتير شراء أو دفعات مخزون مرتبطة به.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="الموردون"
        description="إدارة بيانات الموردين وأرصدتهم وحالتهم داخل النظام."
        actions={
          <Button
            startIcon={
              <Plus size={17} />
            }
            onClick={() =>
              navigate(
                PATHS.SUPPLIER_NEW,
              )
            }
          >
            إضافة مورد
          </Button>
        }
      />

      <Card padding={false}>
        <SuppliersToolbar
          searchQuery={
            searchQuery
          }
          statusFilter={
            statusFilter
          }
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

        {isLoading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
            <LoadingSpinner
              size="lg"
            />

            <p className="text-sm font-medium">
              جاري تحميل الموردين...
            </p>
          </div>
        ) : loadError ? (
          <EmptyState
            icon={
              <AlertCircle
                size={26}
              />
            }
            title="تعذر تحميل الموردين"
            description={
              loadError
            }
            action={
              <Button
                variant="secondary"
                startIcon={
                  <RefreshCw
                    size={16}
                  />
                }
                onClick={() =>
                  void loadSuppliers()
                }
              >
                إعادة المحاولة
              </Button>
            }
          />
        ) : filtered.length >
          0 ? (
          <>
            <SuppliersTable
              suppliers={filtered}
              onView={(
                supplier,
              ) =>
                navigate(
                  `/suppliers/${supplier.id}`,
                )
              }
              onEdit={(
                supplier,
              ) =>
                navigate(
                  `/suppliers/${supplier.id}/edit`,
                )
              }
              onDelete={
                setSupplierToDelete
              }
            />

            <TableFooter
              visibleCount={
                filtered.length
              }
              totalCount={
                suppliers.length
              }
              entityName="مورد"
            />
          </>
        ) : suppliers.length ===
          0 ? (
          <EmptyState
            icon={
              <Truck size={26} />
            }
            title="لا يوجد موردون"
            description="ابدأ بإضافة أول مورد لاستخدامه في المشتريات ودفعات المخزون."
            action={
              <Button
                startIcon={
                  <Plus
                    size={16}
                  />
                }
                onClick={() =>
                  navigate(
                    PATHS.SUPPLIER_NEW,
                  )
                }
              >
                إضافة أول مورد
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={
              <Truck size={26} />
            }
            title="لا توجد نتائج مطابقة"
            description="لم نعثر على مورد يطابق البحث أو حالة الحساب المحددة."
            action={
              <Button
                variant="secondary"
                onClick={
                  clearFilters
                }
              >
                عرض جميع الموردين
              </Button>
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(
          supplierToDelete,
        )}
        title="حذف المورد"
        message={
          supplierToDelete
            ? `هل أنت متأكد من حذف المورد «${supplierToDelete.name}»؟ لا يمكن حذف المورد إذا كان مرتبطًا بفواتير أو دفعات مخزون.`
            : ""
        }
        loading={isDeleting}
        confirmText="حذف المورد"
        onCancel={() => {
          if (!isDeleting) {
            setSupplierToDelete(
              undefined,
            );
          }
        }}
        onConfirm={() =>
          void handleConfirmDelete()
        }
      />
    </>
  );
}