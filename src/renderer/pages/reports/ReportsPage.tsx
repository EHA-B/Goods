import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarDays,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Play,
  PackageMinus,
  ReceiptText,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatusBadge,
} from "../../components/ui";
import { reportsCatalog } from "./reportsCatalog";
import { reportsService } from "./reportsService";
import type {
  ReportColumn,
  ReportDefinition,
  ReportFilterKey,
  ReportFilterOptions,
  ReportFilters,
  ReportResult,
} from "./reportsTypes";

const today =
  new Date().toISOString().slice(0, 10);

const monthStart =
  `${today.slice(0, 8)}01`;

const initialFilters: ReportFilters = {
  fromDate: monthStart,
  toDate: today,
  status: "all",
  groupBy: "day",
  currency: "all",
};

const emptyOptions: ReportFilterOptions = {
  customers: [],
  suppliers: [],
  products: [],
  cashboxes: [],
};

function formatNumber(
  value: unknown,
  maximumFractionDigits = 2,
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

function currencyUnit(
  row: Record<string, unknown>,
) {
  return String(row.currency || "SYP")
    .toUpperCase() === "USD"
    ? "USD"
    : "ل.س";
}

function formatCell(
  row: Record<string, unknown>,
  column: ReportColumn,
) {
  const value = row[column.key];

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (column.format === "number") {
    return formatNumber(value, 3);
  }

  if (column.format === "currency") {
    return `${formatNumber(value, 2)} ${currencyUnit(row)}`;
  }

  if (column.format === "date") {
    const date = new Date(String(value));

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString("ar-SY-u-nu-latn");
  }

  return String(value);
}

function statusOptionsForReport(
  reportId: string,
) {
  if (
    reportId ===
    "consignment-commission"
  ) {
    return [
      {
        value: "all",
        label: "كل الحالات",
      },
      {
        value: "pending",
        label: "بانتظار التسوية",
      },
      {
        value: "settled",
        label: "تمت التسوية",
      },
      {
        value: "reversed",
        label: "معكوسة",
      },
      {
        value: "cancelled",
        label: "ملغاة",
      },
    ];
  }

  if (
    reportId === "sales-details" ||
    reportId === "purchases-details"
  ) {
    return [
      {
        value: "all",
        label: "كل الحالات",
      },
      {
        value: "confirmed",
        label: "مؤكدة / غير مدفوعة",
      },
      {
        value: "partially_paid",
        label: "مدفوعة جزئيًا",
      },
      {
        value: "paid",
        label: "مدفوعة",
      },
      {
        value: "cancelled",
        label: "ملغاة",
      },
      {
        value: "draft",
        label: "مسودة",
      },
    ];
  }

  return [
    {
      value: "all",
      label: "كل الحالات",
    },
  ];
}

function renderStatus(
  value: unknown,
) {
  const label = String(value || "—");

  if (
    label === "تمت التسوية" ||
    label === "ربح"
  ) {
    return (
      <StatusBadge variant="success">
        {label}
      </StatusBadge>
    );
  }

  if (
    label === "ملغاة" ||
    label === "معكوسة" ||
    label === "خسارة"
  ) {
    return (
      <StatusBadge variant="danger">
        {label}
      </StatusBadge>
    );
  }

  if (label === "بانتظار التسوية") {
    return (
      <StatusBadge variant="warning">
        {label}
      </StatusBadge>
    );
  }

  return (
    <StatusBadge variant="gray">
      {label}
    </StatusBadge>
  );
}

function isStatusColumn(key: string) {
  return (
    key === "settlement_status" ||
    key === "result"
  );
}

function isNumericColumn(
  column: ReportColumn,
) {
  return (
    column.format === "number" ||
    column.format === "currency"
  );
}


function summaryItemValue(
  result: ReportResult,
  label: string,
) {
  return (
    result.summary?.find(
      (item) => item.label === label,
    )?.value ?? "0 ل.س"
  );
}

function numericSummaryValue(
  value: unknown,
) {
  const normalized = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


const invoiceFinancialLabels = new Set([
  "المجموع الفرعي",
  "الخصم",
  "تكلفة النقل",
  "تكلفة العتالة",
  "الضريبة",
  "الإجمالي",
  "المدفوع",
  "المتبقي",
  "ربح الأصناف الأساسي",
]);

const invoiceOperationalLabels = new Set([
  "الكمية الكلية",
  "الكمية المستلمة",
  "المتبقي بالمخزون",
  "عدد الدفعات",
  "آخر دفعة",
]);

function isInvoiceStatusSummary(label: string) {
  return (
    label === "الحالة" ||
    label === "حالة الأمانة"
  );
}

function DetailedInvoicePreview({
  result,
  kind,
}: {
  result: ReportResult;
  kind: "sales" | "purchases";
}) {
  const sections = result.sections ?? [];

  return (
    <div
      dir="rtl"
      className="space-y-5 p-5 text-right"
    >
      {!!result.summary?.length && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {result.summary.map((item) => (
            <div
              key={item.label}
              className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
            >
              <div className="absolute inset-y-0 right-0 w-1 bg-[var(--primary)]" />
              <div className="pr-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">
                {item.label}
              </div>
              <div
                dir="ltr"
                className="mt-2 pr-2 text-right text-lg font-extrabold tabular-nums text-[var(--text-primary)] [unicode-bidi:isolate]"
              >
                {String(item.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-5">
        {sections.map((section, sectionIndex) => {
          const summary = section.summary ?? [];
          const financial = summary.filter((item) =>
            invoiceFinancialLabels.has(item.label),
          );
          const operational = summary.filter((item) =>
            invoiceOperationalLabels.has(item.label),
          );
          const identity = summary.filter(
            (item) =>
              !invoiceFinancialLabels.has(item.label) &&
              !invoiceOperationalLabels.has(item.label),
          );

          return (
            <section
              key={`${section.title}-${sectionIndex}`}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
            >
              <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-extrabold leading-7 text-[var(--text-primary)]">
                    {section.title}
                  </h3>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--text-muted)]">
                    {kind === "sales"
                      ? "فاتورة مبيعات"
                      : "فاتورة مشتريات"}
                  </span>
                </div>

                {!!identity.length && (
                  <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                    {identity.map((item) => (
                      <div
                        key={item.label}
                        className="min-w-0"
                      >
                        <div className="text-[11px] font-bold text-[var(--text-muted)]">
                          {item.label}
                        </div>
                        <div className="mt-1 min-w-0 text-sm font-bold text-[var(--text-primary)]">
                          {isInvoiceStatusSummary(item.label)
                            ? renderStatus(item.value)
                            : String(item.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table
                  dir="rtl"
                  className="w-full min-w-[760px] border-collapse text-sm"
                >
                  <thead className="bg-[var(--surface-subtle)]">
                    <tr>
                      {section.columns.map((column) => (
                        <th
                          key={column.key}
                          className="border-b border-[var(--border)] px-4 py-3 text-right text-xs font-extrabold text-[var(--text-secondary)]"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.length ? (
                      section.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className={[
                            "border-b border-[var(--border)] last:border-b-0",
                            rowIndex % 2
                              ? "bg-[var(--surface-subtle)]/40"
                              : "bg-[var(--surface)]",
                          ].join(" ")}
                        >
                          {section.columns.map((column) => (
                            <td
                              key={column.key}
                              className={[
                                "px-4 py-3 align-middle text-[var(--text-primary)]",
                                isNumericColumn(column)
                                  ? "whitespace-nowrap text-center font-semibold tabular-nums [unicode-bidi:isolate]"
                                  : "text-right",
                              ].join(" ")}
                              dir={
                                isNumericColumn(column)
                                  ? "ltr"
                                  : "rtl"
                              }
                            >
                              {isStatusColumn(column.key)
                                ? renderStatus(row[column.key])
                                : formatCell(row, column)}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={section.columns.length}
                          className="px-5 py-8 text-center text-sm text-[var(--text-muted)]"
                        >
                          لا توجد أصناف ضمن هذه الفاتورة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(operational.length > 0 || financial.length > 0) && (
                <div className="grid border-t border-[var(--border)] lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
                  <div className="border-b border-[var(--border)] bg-[var(--surface)] p-4 lg:border-b-0 lg:border-l">
                    <div className="mb-3 text-xs font-extrabold text-[var(--text-secondary)]">
                      معلومات الحركة
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {operational.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] px-3 py-2"
                        >
                          <span className="text-xs font-semibold text-[var(--text-muted)]">
                            {item.label}
                          </span>
                          <strong
                            dir={item.label === "آخر دفعة" ? "ltr" : undefined}
                            className="text-sm font-extrabold text-[var(--text-primary)]"
                          >
                            {String(item.value)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[var(--surface-subtle)] p-4">
                    <div className="mb-3 text-xs font-extrabold text-[var(--text-secondary)]">
                      الملخص المالي للفاتورة
                    </div>
                    <div className="space-y-2">
                      {financial.map((item) => {
                        const important =
                          item.label === "الإجمالي" ||
                          item.label === "المتبقي" ||
                          item.label === "ربح الأصناف الأساسي";

                        return (
                          <div
                            key={item.label}
                            className={[
                              "flex items-center justify-between gap-4 rounded-[var(--radius-sm)] px-3 py-2",
                              important
                                ? "border border-[var(--border)] bg-[var(--surface)]"
                                : "",
                            ].join(" ")}
                          >
                            <span className="text-xs font-semibold text-[var(--text-muted)]">
                              {item.label}
                            </span>
                            <strong
                              dir="ltr"
                              className={[
                                "text-sm font-extrabold tabular-nums [unicode-bidi:isolate]",
                                important
                                  ? "text-[var(--primary)]"
                                  : "text-[var(--text-primary)]",
                              ].join(" ")}
                            >
                              {String(item.value)}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-xs text-[var(--text-muted)]">
        <span>
          عدد بنود الأصناف: {" "}
          <strong className="text-[var(--text-primary)]">
            {result.totalRows ??
              sections.reduce(
                (sum, section) => sum + section.rows.length,
                0,
              )}
          </strong>
        </span>
        <span>
          عدد الفواتير: {" "}
          <strong className="text-[var(--text-primary)]">
            {sections.length}
          </strong>
        </span>
      </div>
    </div>
  );
}

function ProfitLossPreview({
  result,
}: {
  result: ReportResult;
}) {
  const revenueSection =
    result.sections?.find(
      (section) =>
        section.title === "الإيرادات",
    );

  const expenseSection =
    result.sections?.find(
      (section) =>
        section.title ===
        "التكاليف والمصروفات",
    );

  const netValue = numericSummaryValue(
    summaryItemValue(
      result,
      "صافي الربح / الخسارة",
    ),
  );

  const isNetProfit = netValue >= 0;

  const cards = [
    {
      label: "إيراد المبيعات",
      value: summaryItemValue(
        result,
        "إجمالي إيراد المبيعات",
      ),
      icon: BanknoteArrowUp,
      tone:
        "border-[color-mix(in_srgb,var(--success)_34%,var(--border))] bg-[color-mix(in_srgb,var(--success)_7%,var(--surface))]",
      iconClass:
        "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]",
    },
    {
      label: "التكلفة والمصروفات",
      value: summaryItemValue(
        result,
        "إجمالي التكلفة والمصروفات",
      ),
      icon: BanknoteArrowDown,
      tone:
        "border-[color-mix(in_srgb,var(--danger)_30%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_5%,var(--surface))]",
      iconClass:
        "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
    },
    {
      label: "صافي النتيجة",
      value: summaryItemValue(
        result,
        "صافي الربح / الخسارة",
      ),
      icon: isNetProfit
        ? TrendingUp
        : TrendingDown,
      tone: isNetProfit
        ? "border-[color-mix(in_srgb,var(--success)_42%,var(--border))] bg-[color-mix(in_srgb,var(--success)_8%,var(--surface))]"
        : "border-[color-mix(in_srgb,var(--danger)_42%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))]",
      iconClass: isNetProfit
        ? "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]"
        : "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]",
    },
  ];

  const renderRows = (
    section:
      | NonNullable<
          ReportResult["sections"]
        >[number]
      | undefined,
    kind: "income" | "expense",
  ) => {
    if (!section?.rows.length) {
      return (
        <div className="flex min-h-36 items-center justify-center px-5 py-8 text-sm text-[var(--text-muted)]">
          لا توجد حركات ضمن الفترة المحددة.
        </div>
      );
    }

    return (
      <div className="divide-y divide-[var(--border)]">
        {section.rows.map(
          (row, index) => (
            <div
              key={index}
              className="grid gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div dir="rtl" className="min-w-0 text-right">
                <div className="flex flex-wrap items-center gap-2">
                  <strong dir="rtl" className="text-right text-sm text-[var(--text-primary)]">
                    {String(
                      row.metric ??
                        "—",
                    )}
                  </strong>

                  {row.category ? (
                    <span dir="rtl" className="rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-2 py-0.5 text-right text-[11px] font-bold text-[var(--text-muted)]">
                      {String(
                        row.category,
                      )}
                    </span>
                  ) : null}
                </div>

                {row.date &&
                row.date !== "—" ? (
                  <div
                    dir="rtl"
                    className="mt-1.5 flex items-center gap-1.5 text-right text-xs text-[var(--text-muted)]"
                  >
                    <CalendarDays
                      size={13}
                    />
                    <bdi
                      dir="ltr"
                      className="tabular-nums"
                    >
                      {formatCell(
                        row,
                        {
                          key: "date",
                          label: "التاريخ",
                          format: "date",
                        },
                      )}
                    </bdi>
                  </div>
                ) : null}
              </div>

              <div
                dir="ltr"
                className={[
                  "text-left text-base font-extrabold tabular-nums [unicode-bidi:isolate]",
                  kind === "income"
                    ? "text-[var(--success)]"
                    : "text-[var(--danger)]",
                ].join(" ")}
              >
                {formatCell(
                  row,
                  {
                    key: "amount",
                    label: "القيمة",
                    format: "currency",
                  },
                )}
              </div>
            </div>
          ),
        )}
      </div>
    );
  };

  return (
    <div dir="rtl" className="p-5 text-right">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className={[
                "rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-sm)]",
                card.tone,
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[var(--text-muted)]">
                    {card.label}
                  </div>
                  <div
                    dir="ltr"
                    className="mt-2 text-right text-xl font-extrabold tabular-nums [unicode-bidi:isolate] text-[var(--text-primary)]"
                  >
                    {String(
                      card.value,
                    )}
                  </div>
                </div>

                <span
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                    card.iconClass,
                  ].join(" ")}
                >
                  <Icon size={21} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={[
          "mt-4 overflow-hidden rounded-[var(--radius-lg)] border p-5",
          isNetProfit
            ? "border-[color-mix(in_srgb,var(--success)_48%,var(--border))] bg-[color-mix(in_srgb,var(--success)_7%,var(--surface))]"
            : "border-[color-mix(in_srgb,var(--danger)_48%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))]",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={[
                "flex h-12 w-12 items-center justify-center rounded-full",
                isNetProfit
                  ? "bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-[var(--success)]"
                  : "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]",
              ].join(" ")}
            >
              {isNetProfit ? (
                <TrendingUp
                  size={24}
                />
              ) : (
                <TrendingDown
                  size={24}
                />
              )}
            </span>

            <div>
              <div className="text-xs font-bold text-[var(--text-muted)]">
                النتيجة النهائية للفترة
              </div>
              <div className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">
                {isNetProfit
                  ? "صافي ربح"
                  : "صافي خسارة"}
              </div>
            </div>
          </div>

          <div
            dir="ltr"
            className={[
              "text-2xl font-black tabular-nums [unicode-bidi:isolate]",
              isNetProfit
                ? "text-[var(--success)]"
                : "text-[var(--danger)]",
            ].join(" ")}
          >
            {String(
              summaryItemValue(
                result,
                "صافي الربح / الخسارة",
              ),
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section dir="rtl" className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--success)_5%,var(--surface-subtle))] px-5 py-4">
            <div className="flex items-center gap-2">
              <CircleDollarSign
                size={18}
                className="text-[var(--success)]"
              />
              <h3 dir="rtl" className="text-right font-extrabold text-[var(--text-primary)]">
                الإيرادات
              </h3>
            </div>

            <span
              dir="ltr"
              className="text-sm font-extrabold tabular-nums [unicode-bidi:isolate] text-[var(--success)]"
            >
              {String(
                revenueSection
                  ?.summary?.find(
                    (item) =>
                      item.label ===
                      "إجمالي إيراد المبيعات",
                  )?.value ?? "0 ل.س",
              )}
            </span>
          </div>

          {renderRows(
            revenueSection,
            "income",
          )}
        </section>

        <section dir="rtl" className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--danger)_5%,var(--surface-subtle))] px-5 py-4">
            <div className="flex items-center gap-2">
              <ReceiptText
                size={18}
                className="text-[var(--danger)]"
              />
              <h3 dir="rtl" className="text-right font-extrabold text-[var(--text-primary)]">
                التكاليف والمصروفات
              </h3>
            </div>

            <span className="flex items-center gap-1 text-xs font-bold text-[var(--text-muted)]">
              <PackageMinus
                size={14}
              />
              تشمل خسائر المخزون
            </span>
          </div>

          {renderRows(
            expenseSection,
            "expense",
          )}
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-xs text-[var(--text-muted)]">
        <span>
          عدد بنود التقرير:{" "}
          <strong className="text-[var(--text-primary)]">
            {result.totalRows ??
              0}
          </strong>
        </span>

        <span>
          خسائر المخزون تخصم من صافي
          النتيجة ولا تغيّر رصيد الصندوق.
        </span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [
    selectedReport,
    setSelectedReport,
  ] =
    useState<ReportDefinition | null>(
      null,
    );

  const [query, setQuery] =
    useState("");

  const [filters, setFilters] =
    useState<ReportFilters>(
      initialFilters,
    );

  const [options, setOptions] =
    useState<ReportFilterOptions>(
      emptyOptions,
    );

  const [result, setResult] =
    useState<ReportResult | null>(
      null,
    );

  const [loading, setLoading] =
    useState(false);

  const [exporting, setExporting] =
    useState<
      "pdf" | "excel" | null
    >(null);

  useEffect(() => {
    void reportsService
      .loadOptions()
      .then(setOptions)
      .catch(() => undefined);
  }, []);

  const visibleReports =
    useMemo(() => {
      const term =
        query
          .trim()
          .toLocaleLowerCase("ar");

      return reportsCatalog.filter(
        (report) =>
          !term ||
          `${report.title} ${report.description}`
            .toLocaleLowerCase("ar")
            .includes(term),
      );
    }, [query]);

  const chooseReport = (
    report: ReportDefinition,
  ) => {
    setSelectedReport(report);
    setFilters(initialFilters);
    setResult(null);
  };

  const generate = async () => {
    if (!selectedReport) {
      return;
    }

    setLoading(true);

    try {
      const data =
        await reportsService.generate(
          selectedReport.id,
          filters,
        );

      setResult({
        ...data,
        title:
          data.title ||
          selectedReport.title,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر توليد التقرير.",
      );
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (
    format: "pdf" | "excel",
  ) => {
    if (!selectedReport) {
      return;
    }

    setExporting(format);

    try {
      const response =
        await reportsService.export(
          selectedReport.id,
          filters,
          format,
        );

      if (
        "canceled" in response &&
        response.canceled
      ) {
        return;
      }

      toast.success(
        format === "pdf"
          ? "تم إنشاء ملف PDF."
          : "تم إنشاء ملف Excel.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تصدير التقرير.",
      );
    } finally {
      setExporting(null);
    }
  };

  if (!selectedReport) {
    return (
      <>
        <PageHeader
          title="التقارير"
          description="التقارير الأساسية المتاحة حاليًا في StockLite."
        />

        <div className="mb-5 max-w-xl">
          <Input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value,
              )
            }
            placeholder="ابحث عن تقرير..."
            startContent={
              <Search size={17} />
            }
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {visibleReports.map(
            (report) => {
              const Icon =
                report.icon;

              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() =>
                    chooseReport(
                      report,
                    )
                  }
                  className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-right shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]"
                >
                  <div className="flex items-start justify-between gap-5">
                    <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
                      <Icon size={25} />
                    </span>

                    <ArrowRight
                      size={19}
                      className="rotate-180 text-[var(--text-muted)] transition-transform group-hover:-translate-x-1 group-hover:text-[var(--primary)]"
                    />
                  </div>

                  <div className="mt-8">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      {report.title}
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
                      {
                        report.description
                      }
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
                    <span>
                      فتح التقرير
                    </span>
                    <span>←</span>
                  </div>
                </button>
              );
            },
          )}
        </div>

        {!visibleReports.length && (
          <Card className="mt-5">
            <EmptyState
              icon={
                <FileText
                  size={32}
                />
              }
              title="لا توجد تقارير مطابقة"
              description="غيّر عبارة البحث."
            />
          </Card>
        )}
      </>
    );
  }

  const has = (
    key: ReportFilterKey,
  ) =>
    selectedReport.filters.includes(
      key,
    );

  const isCommission =
    selectedReport.id ===
    "consignment-commission";

  const isProfit =
    selectedReport.id ===
    "sales-profit";

  const isDetailedSales =
    selectedReport.id ===
    "sales-details";

  const isDetailedPurchases =
    selectedReport.id ===
    "purchases-details";

  return (
    <>
      <PageHeader
        title={
          selectedReport.title
        }
        description={
          selectedReport.description
        }
        actions={
          <Button
            variant="secondary"
            startIcon={
              <ArrowRight
                size={16}
              />
            }
            onClick={() =>
              setSelectedReport(
                null,
              )
            }
          >
            كل التقارير
          </Button>
        }
      />

      <Card
        header="إعدادات التقرير"
        description="حدد البيانات المطلوبة ثم اضغط عرض التقرير."
        actions={
          <SlidersHorizontal
            size={19}
            className="text-[var(--text-muted)]"
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {has("dateRange") && (
            <>
              <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
                <span>
                  من تاريخ
                </span>

                <Input
                  type="date"
                  value={
                    filters.fromDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (current) => ({
                        ...current,
                        fromDate:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  startContent={
                    <CalendarDays
                      size={16}
                    />
                  }
                />
              </label>

              <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
                <span>
                  إلى تاريخ
                </span>

                <Input
                  type="date"
                  value={
                    filters.toDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setFilters(
                      (current) => ({
                        ...current,
                        toDate:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  startContent={
                    <CalendarDays
                      size={16}
                    />
                  }
                />
              </label>
            </>
          )}

          {has("customer") && (
            <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
              <span>
                العميل
              </span>

              <Select
                value={
                  filters.customerId ??
                  "all"
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      customerId:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                options={[
                  {
                    value: "all",
                    label:
                      "كل العملاء",
                  },
                  ...options.customers,
                ]}
              />
            </label>
          )}

          {has("supplier") && (
            <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
              <span>
                المورد
              </span>

              <Select
                value={
                  filters.supplierId ??
                  "all"
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      supplierId:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                options={[
                  {
                    value: "all",
                    label:
                      "كل الموردين",
                  },
                  ...options.suppliers,
                ]}
              />
            </label>
          )}

          {has("product") && (
            <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
              <span>
                الصنف
              </span>

              <Select
                value={
                  filters.productId ??
                  "all"
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      productId:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                options={[
                  {
                    value: "all",
                    label:
                      "كل الأصناف",
                  },
                  ...options.products,
                ]}
              />
            </label>
          )}

          {has("status") && (
            <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
              <span>
                الحالة
              </span>

              <Select
                value={
                  filters.status ??
                  "all"
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      status:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                options={statusOptionsForReport(
                  selectedReport.id,
                )}
              />
            </label>
          )}

          {has("currency") && (
            <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
              <span>
                العملة
              </span>

              <Select
                value={
                  filters.currency ??
                  "all"
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      currency:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                options={[
                  {
                    value: "all",
                    label:
                      "كل العملات",
                  },
                  {
                    value: "SYP",
                    label:
                      "الليرة السورية (SYP)",
                  },
                  {
                    value: "USD",
                    label:
                      "الدولار الأمريكي (USD)",
                  },
                ]}
              />
            </label>
          )}

          {has("groupBy") && (
            <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
              <span>
                التجميع حسب
              </span>

              <Select
                value={
                  filters.groupBy ??
                  "day"
                }
                onChange={(
                  event,
                ) =>
                  setFilters(
                    (current) => ({
                      ...current,
                      groupBy:
                        event
                          .target
                          .value,
                    }),
                  )
                }
                options={[
                  {
                    value: "day",
                    label: "اليوم",
                  },
                  {
                    value: "month",
                    label: "الشهر",
                  },
                  {
                    value: "product",
                    label: "الصنف",
                  },
                ]}
              />
            </label>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
          <Button
            startIcon={
              <Play size={16} />
            }
            isLoading={loading}
            loadingText="جاري توليد التقرير"
            onClick={() =>
              void generate()
            }
          >
            عرض التقرير
          </Button>

          <Button
            variant="secondary"
            startIcon={
              <FileText
                size={16}
              />
            }
            isLoading={
              exporting === "pdf"
            }
            onClick={() =>
              void exportReport(
                "pdf",
              )
            }
          >
            تصدير PDF
          </Button>

          <Button
            variant="secondary"
            startIcon={
              <FileSpreadsheet
                size={16}
              />
            }
            isLoading={
              exporting ===
              "excel"
            }
            onClick={() =>
              void exportReport(
                "excel",
              )
            }
          >
            تصدير Excel
          </Button>
        </div>
      </Card>

      <Card
        className="mt-5 overflow-hidden"
        padding={false}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
              {isCommission ? (
                <BadgeDollarSign
                  size={20}
                />
              ) : result &&
                result.summary?.some(
                  (item) =>
                    item.label.includes(
                      "خسارة",
                    ) &&
                    String(
                      item.value,
                    ).startsWith("-"),
                ) ? (
                <TrendingDown
                  size={20}
                />
              ) : (
                <TrendingUp
                  size={20}
                />
              )}
            </div>

            <div>
              <h2 className="font-bold text-[var(--text-primary)]">
                معاينة التقرير
              </h2>

              <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                {result
                  ? `تم التوليد: ${new Date(
                      result.generatedAt,
                    ).toLocaleString(
                      "ar-SY-u-nu-latn",
                    )}`
                  : "سيظهر التقرير هنا بعد توليده."}
              </p>
            </div>
          </div>

          {result && ((result.rows?.length ?? 0) > 0 || (result.sections?.length ?? 0) > 0) ? (
            <Button
              size="sm"
              variant="secondary"
              startIcon={
                <Download
                  size={15}
                />
              }
              onClick={() =>
                void exportReport(
                  "excel",
                )
              }
            >
              تنزيل Excel
            </Button>
          ) : undefined}
        </div>

        {!result ? (
          <div className="p-5">
            <EmptyState
              icon={
                <FileText
                  size={34}
                />
              }
              title="لم يتم توليد التقرير بعد"
              description="اضبط الفلاتر ثم اضغط عرض التقرير."
            />
          </div>
        ) : isProfit &&
          result.sections &&
          result.sections.length > 0 ? (
          <ProfitLossPreview
            result={result}
          />
        ) : (isDetailedSales || isDetailedPurchases) &&
          result.sections &&
          result.sections.length > 0 ? (
          <DetailedInvoicePreview
            result={result}
            kind={isDetailedSales ? "sales" : "purchases"}
          />
        ) : result.sections &&
          result.sections.length > 0 ? (
          <div dir="rtl" className="flex flex-col text-right">
            {result.summary &&
              result.summary.length > 0 && (
              <div className="grid gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] p-5 sm:grid-cols-2 xl:grid-cols-4">
                {result.summary.map(
                  (item) => (
                    <div
                      key={item.label}
                      className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                    >
                      <div className="absolute inset-y-0 right-0 w-1 bg-[var(--primary)]" />

                      <div className="pr-2 text-xs font-medium leading-5 text-[var(--text-muted)]">
                        {item.label}
                      </div>

                      <div
                        dir="ltr"
                        className="mt-2 pr-2 text-right text-lg font-bold tabular-nums text-[var(--text-primary)]"
                      >
                        {String(item.value)}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {result.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="border-b border-[var(--border)] last:border-0">
                <div className="bg-[var(--surface-subtle)] px-5 py-4 font-bold text-[var(--text-primary)]">
                  {section.title}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {section.columns.map((column) => (
                          <th
                            key={column.key}
                            className={[
                              "whitespace-nowrap px-5 py-3 font-bold text-[var(--text-secondary)]",
                              isNumericColumn(column) ? "text-left" : "text-right",
                            ].join(" ")}
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.length > 0 ? section.rows.map((row, index) => (
                        <tr
                          key={index}
                          className={[
                            "border-t border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]",
                            index % 2 === 1 ? "bg-[var(--surface-subtle)]/45" : "bg-[var(--surface)]",
                          ].join(" ")}
                        >
                          {section.columns.map((column) => (
                            <td
                              key={column.key}
                              className={[
                                "px-5 py-3 text-[var(--text-primary)]",
                                isNumericColumn(column) ? "whitespace-nowrap text-left font-medium tabular-nums" : "text-right",
                              ].join(" ")}
                              dir={isNumericColumn(column) ? "ltr" : undefined}
                            >
                              {isStatusColumn(column.key) ? renderStatus(row[column.key]) : formatCell(row, column)}
                            </td>
                          ))}
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={section.columns.length} className="px-5 py-6 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border)]">
                            لا توجد بيانات
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {section.summary && section.summary.length > 0 && (
                  <div className="flex flex-wrap items-center justify-end gap-6 border-t border-[var(--border)] bg-[var(--surface-subtle)]/50 px-5 py-3">
                    {section.summary.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-[var(--text-secondary)] font-medium">{item.label}:</span>
                        <strong className="text-[var(--text-primary)] font-bold text-base" dir="ltr">{String(item.value)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}


            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-xs text-[var(--text-muted)]">
               <span>
                 عدد النتائج:{" "}
                 <strong className="text-[var(--text-primary)]">
                   {Number(result.totalRows ?? result.sections.reduce((acc, sec) => acc + sec.rows.length, 0)).toLocaleString("en-US")}
                 </strong>
               </span>
               <span>
                 {isProfit
                   ? "الأرباح والتكاليف معروضة بالقيمة الأساسية للنظام."
                   : ""}
               </span>
            </div>
          </div>
        ) : result.summary?.length ||
          result.rows.length ? (
          <>
            {!!result.summary
              ?.length && (
              <div className="grid gap-3 border-b border-[var(--border)] p-5 sm:grid-cols-2 xl:grid-cols-4">
                {result.summary.map(
                  (item) => (
                    <div
                      key={
                        item.label
                      }
                      className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]"
                    >
                      <div className="absolute inset-y-0 right-0 w-1 bg-[var(--primary)]" />

                      <div className="pr-2 text-xs font-medium leading-5 text-[var(--text-muted)]">
                        {item.label}
                      </div>

                      <div
                        dir="ltr"
                        className="mt-2 pr-2 text-right text-lg font-bold tabular-nums text-[var(--text-primary)]"
                      >
                        {String(
                          item.value,
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {isCommission && (
              <div className="mx-5 mt-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--primary-subtle)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                يعرض هذا التقرير حركة بضاعة
                الأمانة لكل مورد.{" "}
                <strong className="text-[var(--text-primary)]">
                  سعر التسويق
                </strong>{" "}
                هو السعر المدخل عند إنشاء
                فاتورة الأمانة، بينما العمولة
                وحصة المورد تظهر بعد تنفيذ
                التسوية.
              </div>
            )}

            <div className="p-5">
              <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                <div className="max-h-[620px] overflow-auto">
                  <table className="w-full min-w-[1180px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-[var(--surface-subtle)] shadow-[0_1px_0_var(--border)]">
                      <tr>
                        {result.columns.map(
                          (
                            column,
                          ) => (
                            <th
                              key={
                                column.key
                              }
                              className={[
                                "whitespace-nowrap px-4 py-3.5 font-bold text-[var(--text-secondary)]",
                                isNumericColumn(
                                  column,
                                )
                                  ? "text-left"
                                  : "text-right",
                              ].join(
                                " ",
                              )}
                            >
                              {
                                column.label
                              }
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {result.rows.map(
                        (
                          row,
                          index,
                        ) => (
                          <tr
                            key={
                              index
                            }
                            className={[
                              "border-t border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]",
                              index %
                                2 ===
                              1
                                ? "bg-[var(--surface-subtle)]/45"
                                : "bg-[var(--surface)]",
                            ].join(
                              " ",
                            )}
                          >
                            {result.columns.map(
                              (
                                column,
                              ) => (
                                <td
                                  key={
                                    column.key
                                  }
                                  className={[
                                    "px-4 py-3.5 text-[var(--text-primary)]",
                                    isNumericColumn(
                                      column,
                                    )
                                      ? "whitespace-nowrap text-left font-medium tabular-nums"
                                      : "text-right",
                                    column.key ===
                                      "supplier_name" ||
                                    column.key ===
                                      "product_name"
                                      ? "font-bold"
                                      : "",
                                  ].join(
                                    " ",
                                  )}
                                  dir={
                                    isNumericColumn(
                                      column,
                                    )
                                      ? "ltr"
                                      : undefined
                                  }
                                >
                                  {isStatusColumn(
                                    column.key,
                                  )
                                    ? renderStatus(
                                        row[
                                          column
                                            .key
                                        ],
                                      )
                                    : formatCell(
                                        row,
                                        column,
                                      )}
                                </td>
                              ),
                            )}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-3 text-xs text-[var(--text-muted)]">
              <span>
                عدد النتائج:{" "}
                <strong className="text-[var(--text-primary)]">
                  {result.totalRows ??
                    result.rows
                      .length}
                </strong>
              </span>

              <span>
                {isCommission
                  ? "القيم المالية تظهر بعملة فاتورة الأمانة."
                  : isProfit
                    ? "الأرباح والتكاليف معروضة بالقيمة الأساسية للنظام."
                    : ""}
              </span>
            </div>
          </>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={
                <FileText
                  size={34}
                />
              }
              title="لا توجد بيانات"
              description="لا توجد نتائج مطابقة للفلاتر المحددة."
            />
          </div>
        )}
      </Card>
    </>
  );
}