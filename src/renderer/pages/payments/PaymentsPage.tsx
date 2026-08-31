import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownLeft,
  ArrowUpRight,
  FilterX,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import TableFooter from "../../components/common/TableFooter";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../../components/common";

import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "../../components/ui";

import { RECORDS_PAGE_SIZE, useClientPagination } from "../../lib/pagination";

const formatMoney = (
  value: number | null,
  currency = "SYP",
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  return (
    Number(value).toLocaleString(
      "en-US",
      {
        maximumFractionDigits: 2,
      },
    ) +
    " " +
    currency
  );
};

const PAYMENT_TYPE_LABELS: Record<
  string,
  string
> = {
  sale: "دفعة مبيعات",
  purchase: "دفعة مشتريات",
  general_receipt: "سند قبض عام",
  general_payment: "سند دفع عام",
};

type DirectionFilter =
  | "all"
  | "receipt"
  | "payment";

export default function PaymentsPage() {
  const navigate = useNavigate();

  const [items, setItems] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("all");

  const [
    directionFilter,
    setDirectionFilter,
  ] =
    useState<DirectionFilter>("all");

  const [
    currencyFilter,
    setCurrencyFilter,
  ] = useState("all");

  const [
    fromDate,
    setFromDate,
  ] = useState("");

  const [
    toDate,
    setToDate,
  ] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const data =
        await window.stockliteApi.payments.list();

      setItems(data || []);
    } catch (e: any) {
      setError(
        e?.message ||
          "حدث خطأ أثناء تحميل الدفعات",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const currencies = useMemo(() => {
    return [
      ...new Set(
        items
          .map((item) =>
            String(
              item.currency || "",
            )
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean),
      ),
    ].sort();
  }, [items]);

  const filteredItems =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLocaleLowerCase(
            "ar",
          );

      return items.filter(
        (item) => {
          const paymentType =
            String(
              item.payment_type ||
                "",
            );

          const isReceipt =
            paymentType ===
              "sale" ||
            paymentType ===
              "general_receipt";

          const itemCurrency =
            String(
              item.currency ||
                "SYP",
            ).toUpperCase();

          const itemDate =
            String(
              item.payment_date ||
                "",
            ).slice(0, 10);

          const accountName =
            item.customer_name ||
            item.supplier_name ||
            "";

          const fallbackParty =
            item.party_type ===
            "customer"
              ? "عميل"
              : item.party_type ===
                  "supplier"
                ? "مورد"
                : "";

          const searchableText = [
            item.id,
            accountName,
            fallbackParty,
            item.party_id,
            PAYMENT_TYPE_LABELS[
              paymentType
            ] ?? paymentType,
            item.notes,
            item.reference,
            itemCurrency,
            item.amount,
          ]
            .filter(
              (value) =>
                value !== null &&
                value !==
                  undefined,
            )
            .join(" ")
            .toLocaleLowerCase(
              "ar",
            );

          const matchesSearch =
            !query ||
            searchableText.includes(
              query,
            );

          const matchesType =
            typeFilter ===
              "all" ||
            paymentType ===
              typeFilter;

          const matchesDirection =
            directionFilter ===
              "all" ||
            (directionFilter ===
              "receipt" &&
              isReceipt) ||
            (directionFilter ===
              "payment" &&
              !isReceipt);

          const matchesCurrency =
            currencyFilter ===
              "all" ||
            itemCurrency ===
              currencyFilter;

          const matchesFromDate =
            !fromDate ||
            (itemDate &&
              itemDate >=
                fromDate);

          const matchesToDate =
            !toDate ||
            (itemDate &&
              itemDate <= toDate);

          return (
            matchesSearch &&
            matchesType &&
            matchesDirection &&
            matchesCurrency &&
            matchesFromDate &&
            matchesToDate
          );
        },
      );
    }, [
      items,
      searchQuery,
      typeFilter,
      directionFilter,
      currencyFilter,
      fromDate,
      toDate,
    ]);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
  } = useClientPagination(
    filteredItems,
    {
      pageSize: RECORDS_PAGE_SIZE,
      resetKey: `${searchQuery}|${typeFilter}|${directionFilter}|${currencyFilter}|${fromDate}|${toDate}`,
    },
  );

  const filtersAreActive =
    Boolean(
      searchQuery.trim(),
    ) ||
    typeFilter !== "all" ||
    directionFilter !==
      "all" ||
    currencyFilter !==
      "all" ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setDirectionFilter(
      "all",
    );
    setCurrencyFilter(
      "all",
    );
    setFromDate("");
    setToDate("");
  };

  return (
    <>
      <PageHeader
        title="المدفوعات والمقبوضات"
        description="إدارة كافة سندات القبض والدفع العامة ودفعات الفواتير."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              startIcon={
                <RefreshCw
                  size={16}
                />
              }
              onClick={() =>
                void loadData()
              }
            >
              تحديث
            </Button>

            <Button
              startIcon={
                <Plus size={16} />
              }
              onClick={() =>
                navigate(
                  "/payments/new",
                )
              }
            >
              سند جديد
            </Button>
          </div>
        }
      />

      <Card padding={false}>
        <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="md:col-span-2 xl:col-span-2">
              <Input
                value={searchQuery}
                onChange={(
                  event,
                ) =>
                  setSearchQuery(
                    event.target
                      .value,
                  )
                }
                placeholder="ابحث بالعميل أو المورد أو الملاحظات..."
                startContent={
                  <Search
                    size={16}
                  />
                }
              />
            </div>

            <Select
              value={typeFilter}
              onChange={(
                event,
              ) =>
                setTypeFilter(
                  event.target
                    .value,
                )
              }
              options={[
                {
                  value: "all",
                  label:
                    "كل أنواع العمليات",
                },
                {
                  value: "sale",
                  label:
                    "دفعات المبيعات",
                },
                {
                  value:
                    "purchase",
                  label:
                    "دفعات المشتريات",
                },
                {
                  value:
                    "general_receipt",
                  label:
                    "سندات القبض العامة",
                },
                {
                  value:
                    "general_payment",
                  label:
                    "سندات الدفع العامة",
                },
              ]}
            />

            <Select
              value={
                directionFilter
              }
              onChange={(
                event,
              ) =>
                setDirectionFilter(
                  event.target
                    .value as DirectionFilter,
                )
              }
              options={[
                {
                  value: "all",
                  label:
                    "قبض ودفع",
                },
                {
                  value:
                    "receipt",
                  label:
                    "مقبوضات فقط",
                },
                {
                  value:
                    "payment",
                  label:
                    "مدفوعات فقط",
                },
              ]}
            />

            <Select
              value={
                currencyFilter
              }
              onChange={(
                event,
              ) =>
                setCurrencyFilter(
                  event.target
                    .value,
                )
              }
              options={[
                {
                  value: "all",
                  label:
                    "كل العملات",
                },
                ...currencies.map(
                  (currency) => ({
                    value:
                      currency,
                    label:
                      currency ===
                      "SYP"
                        ? "الليرة السورية (SYP)"
                        : currency ===
                            "USD"
                          ? "الدولار الأمريكي (USD)"
                          : currency,
                  }),
                ),
              ]}
            />

            <div className="flex items-center gap-2">
              {filtersAreActive && (
                <Button
                  variant="secondary"
                  startIcon={
                    <FilterX
                      size={16}
                    />
                  }
                  onClick={
                    clearFilters
                  }
                >
                  مسح
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:max-w-2xl">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-[var(--text-muted)]">
                من تاريخ
              </span>

              <Input
                type="date"
                value={fromDate}
                onChange={(
                  event,
                ) =>
                  setFromDate(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold text-[var(--text-muted)]">
                إلى تاريخ
              </span>

              <Input
                type="date"
                value={toDate}
                onChange={(
                  event,
                ) =>
                  setToDate(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center gap-3 text-[var(--text-muted)]">
            <RefreshCw
              size={20}
              className="animate-spin"
            />

            <span>
              جارٍ التحميل…
            </span>
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center gap-4">
            <p className="text-[var(--danger)]">
              {error}
            </p>

            <Button
              variant="secondary"
              onClick={() =>
                void loadData()
              }
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : items.length ===
          0 ? (
          <EmptyState
            title="لا توجد دفعات"
            description="لم يتم تسجيل أي دفعات بعد."
          />
        ) : filteredItems.length ===
          0 ? (
          <div className="p-5">
            <EmptyState
              title="لا توجد نتائج مطابقة"
              description="لم نعثر على دفعات تطابق الفلاتر المحددة."
              action={
                <Button
                  variant="secondary"
                  startIcon={
                    <FilterX
                      size={16}
                    />
                  }
                  onClick={
                    clearFilters
                  }
                >
                  مسح الفلاتر
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <DataTable>
              <DataTableHead>
                <DataTableRow>
                  <DataTableHeaderCell>
                    #
                  </DataTableHeaderCell>

                  <DataTableHeaderCell>
                    التاريخ
                  </DataTableHeaderCell>

                  <DataTableHeaderCell>
                    النوع
                  </DataTableHeaderCell>

                  <DataTableHeaderCell>
                    الحساب
                  </DataTableHeaderCell>

                  <DataTableHeaderCell>
                    المبلغ
                  </DataTableHeaderCell>

                  <DataTableHeaderCell>
                    الرصيد بعد
                  </DataTableHeaderCell>

                  <DataTableHeaderCell>
                    ملاحظات
                  </DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>

              <DataTableBody>
                {paginatedItems.map(
                  (payment) => {
                    const isReceipt =
                      payment.payment_type ===
                        "sale" ||
                      payment.payment_type ===
                        "general_receipt";

                    const account =
                      payment.customer_name ||
                      payment.supplier_name ||
                      `${
                        payment.party_type ===
                        "customer"
                          ? "عميل"
                          : payment.party_type ===
                              "supplier"
                            ? "مورد"
                            : "حساب"
                      }${
                        payment.party_id
                          ? ` #${payment.party_id}`
                          : ""
                      }`;

                    return (
                      <DataTableRow
                        key={
                          payment.id
                        }
                      >
                        <DataTableCell className="text-xs text-[var(--text-muted)]">
                          {payment.id}
                        </DataTableCell>

                        <DataTableCell>
                          {
                            payment.payment_date
                          }
                        </DataTableCell>

                        <DataTableCell>
                          <span className="text-sm font-medium">
                            {PAYMENT_TYPE_LABELS[
                              payment
                                .payment_type
                            ] ??
                              payment.payment_type}
                          </span>
                        </DataTableCell>

                        <DataTableCell>
                          {account}
                        </DataTableCell>

                        <DataTableCell>
                          {isReceipt ? (
                            <span
                              dir="ltr"
                              className="inline-flex items-center gap-1 font-semibold text-[var(--success)]"
                            >
                              <ArrowDownLeft
                                size={
                                  14
                                }
                              />

                              {formatMoney(
                                payment.amount,
                                payment.currency,
                              )}
                            </span>
                          ) : (
                            <span
                              dir="ltr"
                              className="inline-flex items-center gap-1 font-semibold text-[var(--danger)]"
                            >
                              <ArrowUpRight
                                size={
                                  14
                                }
                              />

                              {formatMoney(
                                payment.amount,
                                payment.currency,
                              )}
                            </span>
                          )}
                        </DataTableCell>

                        <DataTableCell className="font-bold tabular-nums">
                          <span dir="ltr" className="inline-block">
                          {formatMoney(
                            payment.balance_after,
                            payment.currency,
                          )}
                          </span>
                        </DataTableCell>

                        <DataTableCell className="max-w-xs truncate text-sm text-[var(--text-muted)]">
                          {payment.notes ||
                            "—"}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  },
                )}
              </DataTableBody>
            </DataTable>

            <TableFooter
              visibleCount={paginatedItems.length}
              totalCount={filteredItems.length}
              entityName="عملية"
              page={page}
              totalPages={totalPages}
              pageSize={RECORDS_PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </Card>
    </>
  );
}