import {
  AlertCircle,
  BriefcaseBusiness,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import TableFooter from "../../components/common/TableFooter";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  LoadingSpinner,
  PageHeader,
  Select,
  StatusBadge,
  Input,
} from "../../components/ui";
import {
  notifyError,
  notifySuccess,
} from "../../lib/notifications";
import { PATHS } from "../../routes/path";
import {
  getWorkerErrorMessage,
  getWorkerTypeLabel,
  workersService,
  type Worker,
} from "./workersService";

const money = (value: number) =>
  Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

export default function WorkersPage() {
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Worker>();
  const [isDeleting, setIsDeleting] = useState(false);

  const loadWorkers = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      setWorkers(await workersService.list());
    } catch (error) {
      setLoadError(getWorkerErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");

    return workers.filter((worker) => {
      const matchesSearch =
        !query ||
        [worker.name, worker.phone, worker.address].some((value) =>
          value.toLocaleLowerCase("ar").includes(query),
        );

      const matchesType =
        typeFilter === "all" || worker.type === typeFilter;

      const matchesState =
        stateFilter === "all" || worker.state === stateFilter;

      return matchesSearch && matchesType && matchesState;
    });
  }, [workers, search, typeFilter, stateFilter]);

  const filtersActive =
    Boolean(search.trim()) ||
    typeFilter !== "all" ||
    stateFilter !== "all";

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setStateFilter("all");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    try {
      setIsDeleting(true);
      await workersService.remove(pendingDelete.id);
      setPendingDelete(undefined);
      notifySuccess("تم حذف السجل بنجاح.");
      await loadWorkers();
    } catch (error) {
      notifyError(error, {
        title: "تعذر حذف السجل",
        fallback:
          "لا يمكن حذف العامل أو الموظف إذا كان مرتبطًا بدفعات محفوظة.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="العمال والموظفون"
        description="إدارة بيانات العمال والموظفين وأرصدتهم وحالتهم ودفعاتهم."
        actions={
          <Button
            startIcon={<Plus size={17} />}
            onClick={() => navigate(PATHS.WORKER_NEW)}
          >
            إضافة عامل أو موظف
          </Button>
        }
      />

      <Card padding={false}>
        <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[minmax(260px,1fr)_190px_190px_auto]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو الهاتف أو العنوان..."
            startContent={<Search size={17} />}
          />

          <Select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            options={[
              { value: "all", label: "كل الأنواع" },
              { value: "worker", label: "عامل" },
              { value: "employee", label: "موظف" },
            ]}
          />

          <Select
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            options={[
              { value: "all", label: "كل الحالات" },
              { value: "active", label: "نشط" },
              { value: "inactive", label: "غير نشط" },
            ]}
          />

          {filtersActive && (
            <Button
              variant="secondary"
              startIcon={<X size={16} />}
              onClick={clearFilters}
            >
              مسح الفلاتر
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-medium">
              جاري تحميل العمال والموظفين...
            </p>
          </div>
        ) : loadError ? (
          <EmptyState
            icon={<AlertCircle size={26} />}
            title="تعذر تحميل العمال والموظفين"
            description={loadError}
            action={
              <Button
                variant="secondary"
                startIcon={<RefreshCw size={16} />}
                onClick={() => void loadWorkers()}
              >
                إعادة المحاولة
              </Button>
            }
          />
        ) : filtered.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3 text-right">الاسم</th>
                    <th className="px-4 py-3 text-right">النوع</th>
                    <th className="px-4 py-3 text-right">الهاتف</th>
                    <th className="px-4 py-3 text-right">الرصيد</th>
                    <th className="px-4 py-3 text-right">العنوان</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((worker) => (
                    <tr
                      key={worker.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="flex items-center gap-3 text-right"
                          onClick={() =>
                            navigate(`/workers/${worker.id}`)
                          }
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
                            {worker.type === "employee" ? (
                              <BriefcaseBusiness size={17} />
                            ) : (
                              <UserRound size={17} />
                            )}
                          </span>

                          <div>
                            <p className="font-bold text-[var(--text-primary)]">
                              {worker.name}
                            </p>
                            {worker.notes && (
                              <p className="mt-0.5 max-w-[260px] truncate text-xs text-[var(--text-muted)]">
                                {worker.notes}
                              </p>
                            )}
                          </div>
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        {getWorkerTypeLabel(worker.type)}
                      </td>

                      <td className="px-4 py-3">
                        <span dir="ltr">{worker.phone || "—"}</span>
                      </td>

                      <td className="px-4 py-3 font-bold">
                        <span dir="ltr">{money(worker.balance)} ل.س</span>
                      </td>

                      <td className="px-4 py-3">
                        {worker.address || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge
                          variant={
                            worker.state === "active"
                              ? "success"
                              : "danger"
                          }
                        >
                          {worker.state === "active" ? "نشط" : "غير نشط"}
                        </StatusBadge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              navigate(`/workers/${worker.id}`)
                            }
                          >
                            التفاصيل
                          </Button>

                          <Button
                            size="sm"
                            variant="danger"
                            startIcon={<Trash2 size={14} />}
                            onClick={() => setPendingDelete(worker)}
                          >
                            حذف
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TableFooter
              visibleCount={filtered.length}
              totalCount={workers.length}
              entityName="سجل"
            />
          </>
        ) : workers.length === 0 ? (
          <EmptyState
            icon={<UsersRound size={28} />}
            title="لا يوجد عمال أو موظفون"
            description="ابدأ بإضافة أول عامل أو موظف لتسجيل الرواتب والأجور والدفعات باسمه."
            action={
              <Button
                startIcon={<Plus size={16} />}
                onClick={() => navigate(PATHS.WORKER_NEW)}
              >
                إضافة أول سجل
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="لا توجد نتائج مطابقة"
            description="لم نعثر على سجل يطابق البحث أو الفلاتر الحالية."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                عرض جميع السجلات
              </Button>
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="حذف العامل أو الموظف"
        message={
          pendingDelete
            ? `هل أنت متأكد من حذف «${pendingDelete.name}»؟ لا يمكن حذفه إذا كان مرتبطًا بدفعات محفوظة.`
            : ""
        }
        confirmText="حذف"
        loading={isDeleting}
        onCancel={() => {
          if (!isDeleting) setPendingDelete(undefined);
        }}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
