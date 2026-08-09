import {
  notifyError,
  notifySuccess,
  notifyValidation,
} from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BriefcaseBusiness,
  Plus,
  Tags,
} from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  BackButton,
  Button,
  Card,
  Dialog,
  FormField,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "../../components/ui";
import { PATHS } from "../../routes/path";
import type {
  TransactionCategory,
} from "../../components/transactions/types";
import { transactionsService } from "./transactionsService";
import {
  getWorkerTypeLabel,
  workersService,
  type Worker,
} from "../workers/workersService";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

type CashboxLite = {
  id: number;
  name: string;
  balance: number;
  isActive: number | boolean;
};

type QuickCategoryForm = {
  name: string;
  description: string;
};

const emptyQuickCategory = (): QuickCategoryForm => ({
  name: "",
  description: "",
});

const normalizeCategoryName = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ar");

const isPayrollCategoryName = (value: string) => {
  const normalized = normalizeCategoryName(value)
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");

  return (
    normalized.includes("رواتب") ||
    normalized.includes("راتب") ||
    normalized.includes("اجور") ||
    normalized.includes("اجر")
  );
};

export default function TransactionFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [direction, setDirection] = useState<
    "income" | "expense"
  >(
    params.get("type") === "income"
      ? "income"
      : "expense",
  );

  const [boxId, setBoxId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState(0);

  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [description, setDescription] =
    useState("");

  const [reference, setReference] =
    useState("");

  const [notes, setNotes] = useState("");

  const [categories, setCategories] =
    useState<TransactionCategory[]>([]);

  const [boxes, setBoxes] =
    useState<CashboxLite[]>([]);

  const [workers, setWorkers] =
    useState<Worker[]>([]);

  const [workerId, setWorkerId] =
    useState(params.get("workerId") ?? "");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [fieldErrors, setFieldErrors] =
    useState<Record<string, string>>({});

  /*
   * إنشاء فئة من نفس صفحة المعاملة.
   *
   * الفئة تُحفظ عبر نفس transactionsService.createCategory
   * المستخدم في شاشة إدارة الفئات، لذلك لا يوجد مصدر بيانات
   * منفصل أو فئات محلية خاصة بهذه الصفحة.
   */
  const [quickCategoryOpen, setQuickCategoryOpen] =
    useState(false);

  const [quickCategory, setQuickCategory] =
    useState<QuickCategoryForm>(
      emptyQuickCategory(),
    );

  const [
    quickCategorySaving,
    setQuickCategorySaving,
  ] = useState(false);

  const [
    quickCategoryError,
    setQuickCategoryError,
  ] = useState("");

  async function reloadCategories() {
    const loadedCategories =
      await transactionsService.loadCategories();

    setCategories(loadedCategories);

    return loadedCategories;
  }

  useEffect(() => {
    void (async () => {
      try {
        const [
          cashboxes,
          loadedCategories,
          loadedWorkers,
        ] = await Promise.all([
          transactionsService.loadCashboxes(),
          transactionsService.loadCategories(),
          workersService.list(),
        ]);

        const activeBoxes =
          cashboxes.filter(
            (item) =>
              item.isActive === true ||
              item.isActive === 1,
          );

        setBoxes(activeBoxes);
        setCategories(loadedCategories);
        setWorkers(
          loadedWorkers.filter(
            (worker) => worker.state === "active",
          ),
        );

        const requestedWorkerId = params.get("workerId");
        if (
          direction === "expense" &&
          requestedWorkerId
        ) {
          const payrollCategory = loadedCategories.find(
            (category) =>
              category.type === "expense" &&
              category.isActive &&
              isPayrollCategoryName(category.name),
          );

          if (payrollCategory) {
            setCategoryId(String(payrollCategory.id));
          }
        }

        if (activeBoxes[0]) {
          setBoxId(
            String(activeBoxes[0].id),
          );
        }
      } catch (loadError) {
        setError(
          getArabicErrorMessage(
            loadError,
            "تعذر تحميل بيانات المعاملة.",
          ),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [direction, params]);

  const availableCategories =
    useMemo(
      () =>
        categories.filter(
          (item) =>
            item.type === direction &&
            item.isActive,
        ),
      [categories, direction],
    );

  const selectedCategory = categories.find(
    (item) => item.id === Number(categoryId),
  );

  const isPayrollExpense =
    direction === "expense" &&
    Boolean(
      selectedCategory &&
        isPayrollCategoryName(selectedCategory.name),
    );

  const selectedWorker = workers.find(
    (worker) => worker.id === Number(workerId),
  );

  const selected = boxes.find(
    (item) =>
      item.id === Number(boxId),
  );

  const selectedCurrency = "ل.س";

  const displayAmount =
    useMemo(
      () => money(amount),
      [amount],
    );

  const expectedBalance =
    useMemo(() => {
      if (!selected) {
        return 0;
      }

      return direction === "income"
        ? selected.balance + amount
        : selected.balance - amount;
    }, [
      selected,
      direction,
      amount,
    ]);

  function openQuickCategory() {
    setQuickCategory(
      emptyQuickCategory(),
    );

    setQuickCategoryError("");
    setQuickCategoryOpen(true);
  }

  function closeQuickCategory() {
    if (quickCategorySaving) {
      return;
    }

    setQuickCategoryOpen(false);
    setQuickCategory(
      emptyQuickCategory(),
    );
    setQuickCategoryError("");
  }

  async function createQuickCategory() {
    const categoryName =
      quickCategory.name
        .trim()
        .replace(/\s+/g, " ");

    if (!categoryName) {
      setQuickCategoryError(
        "اسم الفئة مطلوب.",
      );

      notifyValidation(
        "أدخل اسم الفئة.",
      );

      return;
    }

    if (categoryName.length > 100) {
      setQuickCategoryError(
        "اسم الفئة طويل جدًا.",
      );

      return;
    }

    try {
      setQuickCategorySaving(true);
      setQuickCategoryError("");

      /*
       * نفس عملية الإنشاء التي تستخدمها شاشة إدارة الفئات.
       * النوع يثبت تلقائيًا حسب نوع المعاملة الحالية لمنع
       * إنشاء فئة مصروف أثناء تسجيل إيراد أو العكس.
       */
      await transactionsService.createCategory({
        name: categoryName,
        type: direction,
        description:
          quickCategory.description
            .trim() || null,
        isActive: true,
      });

      /*
       * لا نعتمد فقط على نتيجة create.
       * نعيد القراءة من الباك لضمان أن القائمة الموجودة
       * في الصفحة هي نفس القائمة التي ستظهر في إدارة الفئات.
       */
      const refreshed =
        await reloadCategories();

      const createdCategory =
        refreshed.find(
          (item) =>
            item.type === direction &&
            item.isActive &&
            normalizeCategoryName(
              item.name,
            ) ===
              normalizeCategoryName(
                categoryName,
              ),
        );

      if (createdCategory) {
        setCategoryId(
          String(createdCategory.id),
        );

        setFieldErrors(
          (current) => ({
            ...current,
            categoryId: "",
          }),
        );
      }

      notifySuccess(
        "تمت إضافة الفئة واختيارها للمعاملة الحالية.",
      );

      setQuickCategoryOpen(false);

      setQuickCategory(
        emptyQuickCategory(),
      );
    } catch (createError) {
      const message =
        getArabicErrorMessage(
          createError,
          "تعذر إضافة الفئة.",
        );

      setQuickCategoryError(
        message,
      );

      /*
       * نمرر الخطأ نفسه حتى يبقى error.code متاحًا
       * لنظام الأخطاء المركزي.
       */
      notifyError(createError, {
        fallback: message,
      });
    } finally {
      setQuickCategorySaving(
        false,
      );
    }
  }

  async function save() {
    const nextErrors:
      Record<string, string> = {};

    if (!boxId) {
      nextErrors.boxId =
        "اختر الصندوق.";
    }

    if (!categoryId) {
      nextErrors.categoryId =
        "اختر الفئة.";
    }

    if (isPayrollExpense && !workerId) {
      nextErrors.workerId =
        "اختر العامل أو الموظف المستفيد.";
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      nextErrors.amount =
        "أدخل مبلغًا أكبر من صفر.";
    }

    if (
      selected &&
      direction === "expense" &&
      amount > selected.balance
    ) {
      nextErrors.amount =
        "الرصيد في الصندوق غير كافٍ لهذا المصروف.";
    }

    if (!date) {
      nextErrors.date =
        "اختر تاريخ المعاملة.";
    }

    if (
      description.trim().length >
      200
    ) {
      nextErrors.description =
        "الوصف يجب ألا يتجاوز 200 حرف.";
    }

    setFieldErrors(nextErrors);

    if (
      Object.keys(nextErrors).length
    ) {
      setError(
        "راجع الحقول المطلوبة قبل الحفظ.",
      );

      notifyValidation(
        "راجع الحقول المطلوبة قبل الحفظ.",
      );

      return;
    }

    try {
      setSaving(true);
      setError("");

      if (isPayrollExpense) {
        if (!selectedWorker) {
          throw new Error(
            "تعذر العثور على العامل أو الموظف المحدد.",
          );
        }

        const payrollNotes = [
          `فئة المصروف: ${selectedCategory?.name ?? "رواتب وأجور"}`,
          description.trim()
            ? `الوصف: ${description.trim()}`
            : "",
          reference.trim()
            ? `المرجع: ${reference.trim()}`
            : "",
          notes.trim(),
        ]
          .filter(Boolean)
          .join("\n");

        await workersService.recordPayment({
          workerId: selectedWorker.id,
          cashboxId: Number(boxId),
          amount,
          paymentDate: date,
          notes: payrollNotes,
        });

        notifySuccess(
          `تم تسجيل دفعة الرواتب والأجور لـ ${selectedWorker.name} وتحديث الصندوق والرصيد بنجاح.`,
        );

        navigate(`/workers/${selectedWorker.id}`);
      } else {
        await transactionsService.createFinancial({
          cashboxId: Number(boxId),
          categoryId:
            Number(categoryId),
          amount,
          type: direction,
          transactionDate: date,
          description:
            description.trim(),
          referenceNumber:
            reference.trim(),
          notes: notes.trim(),
        });

        notifySuccess(
          "تم حفظ المعاملة وتحديث الصندوق بنجاح.",
        );

        navigate(
          PATHS.TRANSACTIONS,
        );
      }
    } catch (saveError) {
      const message =
        getArabicErrorMessage(
          saveError,
          "تعذر حفظ المعاملة.",
        );

      setError(message);

      notifyError(saveError, {
        fallback: message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={
          direction === "expense"
            ? "إضافة مصروف"
            : "إضافة إيراد"
        }
        description="تسجيل معاملة مالية جديدة وتحديث رصيد الصندوق تلقائياً."
        actions={
          <BackButton
            to={
              PATHS.TRANSACTIONS
            }
          />
        }
      />

      <div className="mb-5 rounded-[var(--radius-md)] border border-green-500 bg-green-50 px-4 py-3 text-sm text-green-800">
        هذه المعاملة ستؤثر على
        رصيد الصندوق المختار فور
        حفظها، ولا يمكن تعديلها
        لاحقاً (يمكن إلغاؤها فقط).
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card header="بيانات المعاملة">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">
              جاري تحميل
              البيانات...
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="نوع المعاملة">
                <Select
                  value={direction}
                  onChange={(
                    event,
                  ) => {
                    const nextDirection =
                      event.target
                        .value as typeof direction;

                    setDirection(
                      nextDirection,
                    );

                    /*
                     * الفئة مرتبطة بالنوع.
                     * عند تغيير إيراد ↔ مصروف يجب إلغاء
                     * الاختيار السابق حتى لا يتم إرسال
                     * category من النوع الآخر.
                     */
                    setCategoryId(
                      "",
                    );
                    setWorkerId("");

                    setFieldErrors(
                      (current) => ({
                        ...current,
                        categoryId: "",
                      }),
                    );

                    /*
                     * لو كانت نافذة الإضافة مفتوحة نغلقها
                     * حتى لا يتغير النوع تحت المستخدم.
                     */
                    setQuickCategoryOpen(
                      false,
                    );

                    setQuickCategory(
                      emptyQuickCategory(),
                    );

                    setQuickCategoryError(
                      "",
                    );
                  }}
                  options={[
                    {
                      value:
                        "expense",
                      label:
                        "مصروف",
                    },
                    {
                      value:
                        "income",
                      label:
                        "إيراد",
                    },
                  ]}
                />
              </FormField>

              <FormField
                label="الصندوق"
                required
                error={
                  fieldErrors.boxId
                }
              >
                <Select
                  value={boxId}
                  onChange={(
                    event,
                  ) =>
                    setBoxId(
                      event.target
                        .value,
                    )
                  }
                  options={[
                    {
                      value: "",
                      label:
                        "اختر الصندوق",
                    },
                    ...boxes.map(
                      (item) => ({
                        value:
                          String(
                            item.id,
                          ),
                        label:
                          item.name,
                      }),
                    ),
                  ]}
                />
              </FormField>

              <FormField
                label="الفئة"
                required
                error={
                  fieldErrors.categoryId
                }
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      value={
                        categoryId
                      }
                      onChange={(
                        event,
                      ) => {
                        setCategoryId(
                          event.target
                            .value,
                        );
                        setWorkerId("");

                        if (
                          fieldErrors.categoryId
                        ) {
                          setFieldErrors(
                            (
                              current,
                            ) => ({
                              ...current,
                              categoryId:
                                "",
                            }),
                          );
                        }
                      }}
                      options={[
                        {
                          value: "",
                          label:
                            availableCategories.length
                              ? "اختر الفئة"
                              : direction ===
                                  "income"
                                ? "لا توجد فئات إيراد"
                                : "لا توجد فئات مصروف",
                        },

                        ...availableCategories.map(
                          (item) => ({
                            value:
                              String(
                                item.id,
                              ),
                            label:
                              item.name,
                          }),
                        ),
                      ]}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 shrink-0"
                    startIcon={
                      <Plus
                        size={16}
                      />
                    }
                    onClick={
                      openQuickCategory
                    }
                  >
                    فئة جديدة
                  </Button>
                </div>

                <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">
                  يمكنك إنشاء فئة{" "}
                  {direction ===
                  "income"
                    ? "إيراد"
                    : "مصروف"}{" "}
                  جديدة من هنا دون
                  مغادرة المعاملة.
                </p>
              </FormField>

              {isPayrollExpense && (
                <FormField
                  label="العامل أو الموظف المستفيد"
                  required
                  error={fieldErrors.workerId}
                >
                  <Select
                    value={workerId}
                    onChange={(event) => {
                      setWorkerId(event.target.value);

                      if (fieldErrors.workerId) {
                        setFieldErrors((current) => ({
                          ...current,
                          workerId: "",
                        }));
                      }
                    }}
                    options={[
                      {
                        value: "",
                        label: workers.length
                          ? "اختر العامل أو الموظف"
                          : "لا يوجد عمال أو موظفون نشطون",
                      },
                      ...workers.map((worker) => ({
                        value: String(worker.id),
                        label: `${worker.name} — ${getWorkerTypeLabel(
                          worker.type,
                        )}`,
                      })),
                    ]}
                  />

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs leading-5 text-[var(--text-muted)]">
                      عند اختيار الرواتب والأجور تستخدم الصفحة باك دفعات العمال مباشرة، لذلك يتم تحديث الصندوق ورصيد المستفيد في عملية واحدة.
                    </p>

                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      startIcon={<BriefcaseBusiness size={14} />}
                      onClick={() => navigate(PATHS.WORKERS)}
                    >
                      إدارة العمال والموظفين
                    </Button>
                  </div>

                  {selectedWorker && (
                    <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-[var(--text-primary)]">
                          {selectedWorker.name}
                        </strong>
                        <span className="text-[var(--text-muted)]">
                          {getWorkerTypeLabel(selectedWorker.type)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[var(--text-muted)]">
                        <span>
                          الهاتف: {selectedWorker.phone || "—"}
                        </span>
                        <span>
                          الرصيد: {money(selectedWorker.balance)} ل.س
                        </span>
                      </div>
                    </div>
                  )}
                </FormField>
              )}

              <FormField
                label="المبلغ"
                required
                error={
                  fieldErrors.amount
                }
              >
                <Input
                  dir="ltr"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(
                    event,
                  ) =>
                    setAmount(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                />
              </FormField>

              <FormField
                label="التاريخ"
                required
                error={
                  fieldErrors.date
                }
              >
                <Input
                  dir="ltr"
                  type="date"
                  value={date}
                  onChange={(
                    event,
                  ) =>
                    setDate(
                      event.target
                        .value,
                    )
                  }
                />
              </FormField>

              <FormField label="رقم المرجع (اختياري)">
                <Input
                  dir="ltr"
                  value={reference}
                  onChange={(
                    event,
                  ) =>
                    setReference(
                      event.target
                        .value,
                    )
                  }
                  placeholder="مثال: رقم إيصال خارجي"
                />
              </FormField>

              <FormField
                label="الوصف"
                error={
                  fieldErrors.description
                }
              >
                <Input
                  value={
                    description
                  }
                  placeholder="وصف مختصر للعملية"
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event.target
                        .value,
                    )
                  }
                />
              </FormField>

              <FormField label="الملاحظات (اختياري)">
                <Textarea
                  value={notes}
                  placeholder="أي تفاصيل إضافية..."
                  onChange={(
                    event,
                  ) =>
                    setNotes(
                      event.target
                        .value,
                    )
                  }
                />
              </FormField>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm font-medium text-[var(--danger)]">
              {error}
            </p>
          )}
        </Card>

        <Card header="الأثر المالي">
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                الصندوق
              </span>

              <strong>
                {selected?.name ||
                  "—"}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                الرصيد الحالي
              </span>

              <strong
                dir="ltr"
                className="tabular-nums"
              >
                {money(
                  selected?.balance ||
                    0,
                )}{" "}
                {
                  selectedCurrency
                }
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">
                قيمة الحركة
              </span>

              <strong
                dir="ltr"
                className={`tabular-nums ${
                  direction ===
                  "income"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {direction ===
                "income"
                  ? "+"
                  : "-"}
                {displayAmount}{" "}
                {
                  selectedCurrency
                }
              </strong>
            </div>

            <div className="flex justify-between border-t border-[var(--border)] pt-4 font-bold">
              <span className="text-[var(--text-primary)]">
                الرصيد المتوقع
              </span>

              <span
                dir="ltr"
                className={`tabular-nums ${
                  expectedBalance <
                  0
                    ? "text-red-600"
                    : ""
                }`}
              >
                {money(
                  expectedBalance,
                )}{" "}
                {
                  selectedCurrency
                }
              </span>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            navigate(
              PATHS.TRANSACTIONS,
            )
          }
        >
          إلغاء
        </Button>

        <Button
          isLoading={saving}
          disabled={
            loading ||
            !boxId ||
            !categoryId ||
            (isPayrollExpense && !workerId) ||
            amount <= 0 ||
            (direction ===
              "expense" &&
              amount >
                (selected?.balance ||
                  0))
          }
          onClick={() =>
            void save()
          }
        >
          حفظ المعاملة
        </Button>
      </div>

      <Dialog
        open={quickCategoryOpen}
        title={
          direction === "income"
            ? "إضافة فئة إيراد"
            : "إضافة فئة مصروف"
        }
        onClose={
          closeQuickCategory
        }
        footer={
          <>
            <Button
              variant="secondary"
              disabled={
                quickCategorySaving
              }
              onClick={
                closeQuickCategory
              }
            >
              إلغاء
            </Button>

            <Button
              startIcon={
                <Plus size={16} />
              }
              isLoading={
                quickCategorySaving
              }
              loadingText="جاري إضافة الفئة..."
              disabled={
                !quickCategory.name.trim()
              }
              onClick={() =>
                void createQuickCategory()
              }
            >
              إضافة واختيار
              الفئة
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary)]">
              <Tags size={17} />
            </div>

            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                نوع الفئة:{" "}
                {direction ===
                "income"
                  ? "إيراد"
                  : "مصروف"}
              </p>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                ستُحفظ هذه الفئة
                مباشرة ضمن إدارة
                الفئات، ويمكن
                تعديلها أو تعطيلها
                لاحقًا من هناك.
              </p>
            </div>
          </div>

          <FormField
            label="اسم الفئة"
            required
          >
            <Input
              autoFocus
              value={
                quickCategory.name
              }
              placeholder={
                direction ===
                "income"
                  ? "مثال: إيرادات خدمات"
                  : "مثال: صيانة المحل"
              }
              disabled={
                quickCategorySaving
              }
              onChange={(
                event,
              ) => {
                setQuickCategory(
                  (current) => ({
                    ...current,
                    name:
                      event.target
                        .value,
                  }),
                );

                if (
                  quickCategoryError
                ) {
                  setQuickCategoryError(
                    "",
                  );
                }
              }}
            />
          </FormField>

          <FormField label="الوصف">
            <Textarea
              value={
                quickCategory.description
              }
              placeholder="وصف اختياري للفئة..."
              disabled={
                quickCategorySaving
              }
              onChange={(
                event,
              ) =>
                setQuickCategory(
                  (current) => ({
                    ...current,
                    description:
                      event.target
                        .value,
                  }),
                )
              }
            />
          </FormField>

          {quickCategoryError && (
            <p className="rounded-[var(--radius-md)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-bold text-[var(--danger)]">
              {
                quickCategoryError
              }
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}