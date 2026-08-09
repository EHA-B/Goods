import {
  notifyError,
  notifySuccess,
} from "../../lib/notifications";

import {
  AlertCircle,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import TableFooter from "../../components/common/TableFooter";
import CustomersTable from "../../components/customers/CustomersTable";
import CustomersToolbar from "../../components/customers/CustomersToolbar";

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
  customersService,
  getCustomerErrorMessage,
  type Customer,
} from "./customersService";

export default function CustomersPage() {
  const navigate = useNavigate();

  const [
    customers,
    setCustomers,
  ] = useState<Customer[]>([]);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    customerToDelete,
    setCustomerToDelete,
  ] = useState<Customer>();

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

  const loadCustomers =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        setCustomers(
          await customersService.list(),
        );
      } catch (error) {
        setLoadError(
          getCustomerErrorMessage(
            error,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filtered =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return customers.filter(
        (customer) => {
          const matchesSearch =
            !query ||
            [
              customer.name,
              customer.phone,
              customer.email,
              customer.address,
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
              customer.isActive) ||
            (statusFilter ===
              "inactive" &&
              !customer.isActive) ||
            (statusFilter ===
              "debtor" &&
              customer.balance >
                0) ||
            (statusFilter ===
              "creditor" &&
              customer.balance <
                0);

          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      customers,
      searchQuery,
      statusFilter,
    ]);

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
  }

  async function handleConfirmDelete() {
    if (!customerToDelete) {
      return;
    }

    try {
      setIsDeleting(true);

      await customersService.remove(
        customerToDelete.id,
      );

      setCustomers(
        (current) =>
          current.filter(
            (customer) =>
              customer.id !==
              customerToDelete.id,
          ),
      );

      notifySuccess(
        "تم حذف العميل بنجاح",
      );

      setCustomerToDelete(
        undefined,
      );
    } catch (error) {
      /*
       * مهم:
       * نمرر الـ Error نفسه، وليس string،
       * حتى لا يضيع error.code.
       */
      notifyError(error, {
        title:
          "تعذر حذف العميل",
        fallback:
          "لا يمكن حذف العميل. تحقق من وجود فواتير أو دفعات مرتبطة به.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="العملاء"
        description="إدارة بيانات العملاء وأرصدة حساباتهم داخل النظام."
        actions={
          <Button
            startIcon={
              <Plus size={17} />
            }
            onClick={() =>
              navigate(
                PATHS.CUSTOMER_NEW,
              )
            }
          >
            إضافة عميل
          </Button>
        }
      />

      <Card padding={false}>
        <CustomersToolbar
          searchQuery={
            searchQuery
          }
          statusFilter={
            statusFilter
          }
          filtersAreActive={
            Boolean(
              searchQuery.trim(),
            ) ||
            statusFilter !==
              "all"
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
              جاري تحميل العملاء...
            </p>
          </div>
        ) : loadError ? (
          <EmptyState
            icon={
              <AlertCircle
                size={26}
              />
            }
            title="تعذر تحميل العملاء"
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
                  void loadCustomers()
                }
              >
                إعادة المحاولة
              </Button>
            }
          />
        ) : filtered.length >
          0 ? (
          <>
            <CustomersTable
              customers={filtered}
              onView={(
                customer,
              ) =>
                navigate(
                  `/customers/${customer.id}`,
                )
              }
              onEdit={(
                customer,
              ) =>
                navigate(
                  `/customers/${customer.id}/edit`,
                )
              }
              onDelete={
                setCustomerToDelete
              }
            />

            <TableFooter
              visibleCount={
                filtered.length
              }
              totalCount={
                customers.length
              }
              entityName="عميل"
            />
          </>
        ) : customers.length ===
          0 ? (
          <EmptyState
            icon={
              <Users size={26} />
            }
            title="لا يوجد عملاء"
            description="ابدأ بإضافة أول عميل لاستخدامه في فواتير البيع."
            action={
              <Button
                startIcon={
                  <Plus
                    size={16}
                  />
                }
                onClick={() =>
                  navigate(
                    PATHS.CUSTOMER_NEW,
                  )
                }
              >
                إضافة أول عميل
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={
              <Users size={26} />
            }
            title="لا توجد نتائج مطابقة"
            description="لم نعثر على عميل يطابق البحث أو حالة الحساب المحددة."
            action={
              <Button
                variant="secondary"
                onClick={
                  clearFilters
                }
              >
                عرض جميع العملاء
              </Button>
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(
          customerToDelete,
        )}
        title="حذف العميل"
        message={
          customerToDelete
            ? `هل أنت متأكد من حذف العميل «${customerToDelete.name}»؟ لا يمكن حذف العميل إذا كان مرتبطًا بفواتير أو مدفوعات.`
            : ""
        }
        loading={isDeleting}
        confirmText="حذف العميل"
        onCancel={() => {
          if (!isDeleting) {
            setCustomerToDelete(
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