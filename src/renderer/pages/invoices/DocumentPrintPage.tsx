import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileDown, LoaderCircle, Printer, RotateCcw } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  BackButton,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "../../components/ui";
import PrintSettingsToolbar, {
  DEFAULT_PRINTER,
  usePrintSettings,
} from "../../components/invoices/PrintSettingsToolbar";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { notifyError, notifySuccess } from "../../lib/notifications";
import { PATHS } from "../../routes/path";

import {
  defaultCompanySettings,
  settingsService,
  type CompanySettings,
} from "../settings/settingsService";

type Kind =
  | "payment"
  | "transaction"
  | "transfer"
  | "customer"
  | "supplier"
  | "cashbox"
  | "consignment"
  | "customers_balances"
  | "suppliers_balances";

type PaymentDocument = {
  id: number;
  payment_type?: string | null;
  party_name?: string | null;
  invoice_number?: string | null;
  cashbox_name?: string | null;
  payment_date?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  exchange_rate?: number | string | null;
  amount_base?: number | string | null;
  status?: string | null;
  notes?: string | null;
  reference_number?: string | null;
};

type TransactionDocument = {
  id: number;
  type?: string | null;
  category_name?: string | null;
  cashbox_name?: string | null;
  cashbox_currency?: string | null;
  transaction_date?: string | null;
  reference_number?: string | null;
  amount?: number | string | null;
  status?: string | null;
  description?: string | null;
  notes?: string | null;
};

type TransferMovement = {
  id?: number;
  direction?: string | null;
  cashbox_name?: string | null;
  cashbox_currency?: string | null;
  transaction_date?: string | null;
  amount?: number | string | null;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
};

type TransferDocument = {
  transfer_group_id?: string | number | null;
  movements: TransferMovement[];
};

type StatementParty = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  initial_balance?: number | string | null;
};

type StatementInvoice = {
  id: number;
  invoice_number?: string | null;
  invoice_date?: string | null;
  total?: number | string | null;
  paid_amount?: number | string | null;
  remaining_amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
};

type StatementPayment = {
  id: number;
  payment_type?: string | null;
  payment_date?: string | null;
  cashbox_name?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  notes?: string | null;
};

type StatementDocument = {
  party: StatementParty;
  balance?: number | string | null;
  initial_balance?: number | string | null;
  invoices: StatementInvoice[];
  payments: StatementPayment[];
  statement_type?: "customer" | "supplier" | string;
  from_date?: string | null;
  to_date?: string | null;
};

type CashboxMovement = {
  id: number;
  transaction_date?: string | null;
  reference_type?: string | null;
  direction?: string | null;
  amount?: number | string | null;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
};

type CashboxDocument = {
  cashbox: {
    name?: string | null;
    currency?: string | null;
    balance?: number | string | null;
  };
  movements: CashboxMovement[];
};

type ConsignmentSettlement = {
  id?: number;
  invoice_number?: string | null;
  supplier_name?: string | null;
  cashbox_name?: string | null;
  settlement_date?: string | null;
  status?: string | null;
  currency?: string | null;
  total_sales_amount?: number | string | null;
  commission_amount?: number | string | null;
  supplier_share?: number | string | null;
  exchange_rate?: number | string | null;
  remaining_stock_policy?: string | null;
  returned_quantity?: number | string | null;
  spoilage_quantity?: number | string | null;
  carried_quantity?: number | string | null;
  notes?: string | null;
};

type ConsignmentItem = {
  id: number;
  product_name?: string | null;
  received_quantity?: number | string | null;
  sold_quantity?: number | string | null;
  remaining_quantity?: number | string | null;
  resolved_quantity?: number | string | null;
  sales_amount?: number | string | null;
  resolution_policy?: string | null;
  notes?: string | null;
};

type ConsignmentDocument = {
  settlement: ConsignmentSettlement;
  items: ConsignmentItem[];
};

type PartyBalancesDocument = {
  parties: PartyApiRecord[];
};

type DocumentData =
  | PaymentDocument
  | TransactionDocument
  | TransferDocument
  | StatementDocument
  | CashboxDocument
  | ConsignmentDocument
  | PartyBalancesDocument;

const n = (value: unknown) =>
  Number(value ?? 0);

const fmt = (value: unknown) =>
  n(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });

const date = (value: unknown) =>
  String(value ?? "")
    .replace("T", " ")
    .slice(0, 19);

const money = (
  value: unknown,
  currency = "SYP",
) =>
  `${fmt(value)} ${
    currency === "SYP" ? "ل.س" : currency
  }`;

function getDirectionLabel(
  direction?: string | null,
) {
  switch (direction) {
    case "in":
      return "وارد";

    case "out":
      return "صادر";

    default:
      return direction ? "غير محدد" : "—";
  }
}

function getReferenceTypeLabel(
  type?: string | null,
) {
  switch (type) {
    case "sale":
    case "sale_invoice":
      return "فاتورة بيع";

    case "purchase":
    case "purchase_invoice":
      return "فاتورة شراء";

    case "payment":
      return "دفعة";

    case "transfer":
      return "تحويل";

    case "transaction":
      return "معاملة مالية";

    case "consignment":
    case "consignment_settlement":
      return "تسوية أمانة";

    default:
      return type ? "حركة مالية" : "—";
  }
}

function getRemainingPolicyLabel(
  policy?: string | null,
) {
  switch (policy) {
    case "manual":
      return "تسوية يدوية (دون تأثير على المخزون)";

    case "return_to_supplier":
      return "إعادة للمورد";

    case "spoilage":
      return "تالف";

    case "carry_forward":
      return "ترحيل للدورة القادمة";

    default:
      return policy ? "غير محددة" : "—";
  }
}

export default function DocumentPrintPage({
  kind,
}: {
  kind: Kind;
}) {
  const params = useParams();

  const raw =
    params.id ||
    params.customerId ||
    params.supplierId ||
    params.purchaseId ||
    params.groupId ||
    "";

  const id =
    kind === "transfer"
      ? raw
      : Number(raw);

  const [data, setData] =
    useState<DocumentData>();

  const [company, setCompany] =
    useState<CompanySettings>(
      defaultCompanySettings,
    );

  const [error, setError] =
    useState("");

  const [isPrinting, setIsPrinting] =
    useState(false);

  const [savingPdf, setSavingPdf] =
    useState(false);

  /** Optional statement period (customer / supplier statements only). */
  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  /** Optional sort & filter for full customer/supplier balance sheets. */
  const [balanceSort, setBalanceSort] = useState<"name" | "id" | "balance">("name");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "non_zero" | "debit" | "credit">("all");

  const {
    printers,
    selectedPrinter,
    paperSize,
    copies,
    scaleFactor,
    topMarginMm,
    sideMarginMm,
    setCopies,
    handlePaperSizeChange,
    handlePrinterChange,
    handleScaleChange,
    handleTopMarginChange,
    handleSideMarginChange,
    resetPrintAdjustments,
    sheetStyle,
    paperClass,
  } = usePrintSettings();

  const isStatement =
    kind === "customer" ||
    kind === "supplier";

  const isBalancesSheet =
    kind === "customers_balances" ||
    kind === "suppliers_balances";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const api =
          window.stockliteApi.printDocuments;

        const range = {
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        };

        const loaders: Record<
          Kind,
          (
            documentId: number | string,
          ) => Promise<unknown>
        > = {
          payment: (documentId) =>
            api.payment(
              Number(documentId),
            ),

          transaction: (documentId) =>
            api.transaction(
              Number(documentId),
            ),

          transfer: (documentId) =>
            api.transfer(
              String(documentId),
            ),

          customer: (documentId) =>
            api.customerStatement(
              Number(documentId),
              range,
            ),

          supplier: (documentId) =>
            api.supplierStatement(
              Number(documentId),
              range,
            ),

          cashbox: (documentId) =>
            api.cashboxStatement(
              Number(documentId),
            ),

          consignment: (documentId) =>
            api.consignment(
              Number(documentId),
            ),

          customers_balances: async () => ({
            parties: await window.stockliteApi.customers.list(),
          }),

          suppliers_balances: async () => ({
            parties: await window.stockliteApi.suppliers.list(),
          }),
        };

        const loader = loaders[kind];

        const [
          documentData,
          companyData,
        ] = await Promise.all([
          loader(id),
          settingsService.loadCompany(),
        ]);

        if (!cancelled) {
          setData(
            documentData as DocumentData,
          );

          setCompany(companyData);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "تعذر تجهيز المستند",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, id, fromDate, toDate]);

  const title = useMemo(
    () =>
      ({
        payment: "سند مالي",
        transaction:
          "مستند معاملة مالية",
        transfer:
          "سند تحويل بين الصناديق",
        customer:
          "كشف حساب عميل",
        supplier:
          "كشف حساب مورد",
        cashbox:
          "كشف حركة صندوق",
        consignment:
          "تسوية أمانة",
        customers_balances:
          "سجل أرصدة حسابات العملاء",
        suppliers_balances:
          "سجل أرصدة حسابات الموردين",
      })[kind],
    [kind],
  );

  if (error) {
    return (
      <EmptyState
        title="تعذر تجهيز المستند"
        description={error}
      />
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center">
        جاري تجهيز الطباعة...
      </div>
    );
  }

  const resetScrollBeforePrint = () => {
    window.scrollTo(0, 0);
    document.querySelector("main")?.scrollTo(0, 0);
  };

  const print = async () => {
    try {
      setIsPrinting(true);
      resetScrollBeforePrint();
      if (window.stockliteApi?.system?.printCurrentPage) {
        const result = await window.stockliteApi.system.printCurrentPage({
          pageSize: paperSize,
          deviceName: selectedPrinter || DEFAULT_PRINTER,
          copies,
          scaleFactor,
          silent: true,
        });
        if (result?.printed) {
          notifySuccess("تم إرسال المستند إلى الطابعة بنجاح");
        }
      } else {
        window.print();
      }
    } catch (err: unknown) {
      notifyError(getArabicErrorMessage(err, "تعذر تنفيذ الطباعة"));
    } finally {
      setIsPrinting(false);
    }
  };

  const savePdf = async () => {
    try {
      setSavingPdf(true);
      resetScrollBeforePrint();

      const suffix = raw
        ? ` ${raw}`
        : ` ${new Date().toISOString().slice(0, 10)}`;

      await window.stockliteApi.system.saveCurrentPageAsPdf({
        fileName: `${title}${suffix}`,
        pageSize: paperSize,
        scaleFactor,
      });
    } catch (err: unknown) {
      notifyError(getArabicErrorMessage(err, "تعذر حفظ ملف PDF"));
    } finally {
      setSavingPdf(false);
    }
  };

  const backTo =
    kind === "customers_balances"
      ? PATHS.CUSTOMERS
      : kind === "suppliers_balances"
        ? PATHS.SUPPLIERS
        : undefined;

  return (
    <div className="invoice-print-page space-y-5">
      <div className="no-print space-y-3">
        <style>{`@page { size: ${paperSize === "A5" ? "148mm 210mm" : "210mm 297mm"}; margin: 0mm; }`}</style>
        <PageHeader
          title={title}
          description="تحكم بإعدادات الطابعة والورق والهوامش مباشرة ثم اطبع المستند أو احفظه بصيغة PDF."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <BackButton to={backTo} />

              <Button
                startIcon={
                  isPrinting ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Printer size={17} />
                  )
                }
                disabled={isPrinting}
                onClick={() => void print()}
              >
                {isPrinting ? "جاري الطباعة..." : "طباعة مباشرة"}
              </Button>

              <Button
                variant="secondary"
                startIcon={
                  savingPdf ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <FileDown size={17} />
                  )
                }
                disabled={savingPdf}
                onClick={() =>
                  void savePdf()
                }
              >
                {savingPdf
                  ? "جاري الحفظ..."
                  : "حفظ PDF"}
              </Button>
            </div>
          }
        />

        <PrintSettingsToolbar
          printers={printers}
          selectedPrinter={selectedPrinter}
          paperSize={paperSize}
          copies={copies}
          scaleFactor={scaleFactor}
          topMarginMm={topMarginMm}
          sideMarginMm={sideMarginMm}
          onPrinterChange={handlePrinterChange}
          onPaperSizeChange={handlePaperSizeChange}
          onCopiesChange={setCopies}
          onScaleChange={handleScaleChange}
          onTopMarginChange={handleTopMarginChange}
          onSideMarginChange={handleSideMarginChange}
          onReset={resetPrintAdjustments}
        />

        {isStatement && (
          <Card
            header="النطاق الزمني لكشف الحساب"
            description="حدد فترة زمنية لتصفية الفواتير والدفعات المعروضة في الكشف، أو اتركها فارغة لعرض كامل السجل."
          >
            <div className="grid gap-4 md:grid-cols-3 md:items-end">
              <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
                <span>من تاريخ</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(event) =>
                    setFromDate(
                      event.target.value,
                    )
                  }
                  startContent={
                    <CalendarDays size={16} />
                  }
                />
              </label>

              <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
                <span>إلى تاريخ</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(event) =>
                    setToDate(
                      event.target.value,
                    )
                  }
                  startContent={
                    <CalendarDays size={16} />
                  }
                />
              </label>

              {(fromDate || toDate) && (
                <div>
                  <Button
                    variant="secondary"
                    startIcon={
                      <RotateCcw size={16} />
                    }
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    عرض كل الفترات
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {isBalancesSheet && (
          <Card
            header="خيارات عرض وترتيب السجل"
            description="يُعرض السجل بالترتيب في جدولين متجاورين في نفس الصفحة لاختصار المساحة."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
                <span>الترتيب حسب</span>
                <Select
                  value={balanceSort}
                  onChange={(e) =>
                    setBalanceSort(e.target.value as "name" | "id" | "balance")
                  }
                  options={[
                    { value: "name", label: "الاسم (أبجديًا)" },
                    { value: "id", label: "رقم السجل (التسلسلي)" },
                    { value: "balance", label: "قيمة الرصيد (من الأعلى للأقل)" },
                  ]}
                />
              </label>

              <label className="space-y-2 text-sm font-bold text-[var(--text-secondary)]">
                <span>تصفية الحسابات</span>
                <Select
                  value={balanceFilter}
                  onChange={(e) =>
                    setBalanceFilter(
                      e.target.value as "all" | "non_zero" | "debit" | "credit",
                    )
                  }
                  options={[
                    { value: "all", label: "جميع الحسابات" },
                    { value: "non_zero", label: "الحسابات ذات الرصيد فقط (غير المتوازنة)" },
                    { value: "debit", label: "حالة الرصيد: عليه فقط" },
                    { value: "credit", label: "حالة الرصيد: له فقط" },
                  ]}
                />
              </label>
            </div>
          </Card>
        )}
      </div>

      <article
        className={`invoice-print-sheet ${paperClass}${
          isStatement || isBalancesSheet || kind === "cashbox" || kind === "consignment"
            ? " invoice-print-sheet--flow"
            : ""
        }`}
        dir="rtl"
        style={sheetStyle}
      >
        <header className="invoice-print-header">
          <div className="invoice-company-block">
            <div className="invoice-company-identity">
              {company.logo && (
                <img
                  src={company.logo}
                  className="invoice-logo"
                  alt="شعار الشركة"
                />
              )}

              <div>
                <h1>
                  {company.name ||
                    "اسم الشركة"}
                </h1>

                {/* <p className="invoice-company-subtitle">
                  {company.address ||
                    "نظام المبيعات والمخزون"}
                </p> */}
              </div>
            </div>

            <div className="invoice-company-contact">
              {company.phone && (
                <p>
                  الهاتف:{" "}
                  <bdi>
                    {company.phone}
                  </bdi>
                </p>
              )}

              {company.email && (
                <p>
                  البريد:{" "}
                  <bdi>
                    {company.email}
                  </bdi>
                </p>
              )}
            </div>
          </div>

          <div className="invoice-title-box">
            <span className="invoice-document-label">
              مستند رسمي
            </span>

            <h2>{title}</h2>

            <p>
              تاريخ الطباعة:{" "}
              <bdi>
                {new Date().toLocaleString(
                  "en-GB",
                )}
              </bdi>
            </p>
          </div>
        </header>

        {kind === "payment" && (
          <Payment
            d={
              data as PaymentDocument
            }
          />
        )}

        {kind === "transaction" && (
          <Transaction
            d={
              data as TransactionDocument
            }
          />
        )}

        {kind === "transfer" && (
          <Transfer
            d={
              data as TransferDocument
            }
          />
        )}

        {(kind === "customer" ||
          kind === "supplier") && (
          <Statement
            d={
              data as StatementDocument
            }
            kind={kind}
          />
        )}

        {kind === "cashbox" && (
          <Cashbox
            d={
              data as CashboxDocument
            }
          />
        )}

        {kind === "consignment" && (
          <Consignment
            d={
              data as ConsignmentDocument
            }
          />
        )}

        {(kind === "customers_balances" ||
          kind === "suppliers_balances") && (
          <PartyBalancesSheet
            d={data as PartyBalancesDocument}
            partyType={
              kind === "customers_balances" ? "customer" : "supplier"
            }
            sortBy={balanceSort}
            filterBy={balanceFilter}
          />
        )}

        <footer className="invoice-print-footer">
          <div className="invoice-signatures">
            <div>
              <span>
                توقيع المستلم
              </span>
              <i />
            </div>

            <div>
              <span>
                المحاسب
              </span>
              <i />
            </div>

            <div>
              <span>
                الختم والتوقيع
              </span>
              <i />
            </div>
          </div>

          <p>
            {company.invoiceFooter ||
              "تم إنشاء هذا المستند إلكترونيًا."}
          </p>
        </footer>
      </article>
    </div>
  );
}

const Meta = ({
  items,
}: {
  items: [string, unknown][];
}) => (
  <section className="invoice-meta">
    {items.map(([key, value]) => (
      <div key={key}>
        <span>{key}</span>

        <strong>
          <bdi>
            {String(
              value ?? "—",
            )}
          </bdi>
        </strong>
      </div>
    ))}
  </section>
);

function getPartyBalanceState(
  balance: number,
  partyType: "customer" | "supplier",
): { code: "debit" | "credit" | "balanced"; label: "عليه" | "له" | "متوازن" } {
  if (Math.abs(balance) < 0.005) {
    return { code: "balanced", label: "متوازن" };
  }
  if (partyType === "customer") {
    // Customer: positive balance means customer owes us ("عليه"), negative means credit to customer ("له")
    return balance > 0
      ? { code: "debit", label: "عليه" }
      : { code: "credit", label: "له" };
  }
  // Supplier: positive balance means payable to supplier ("له"), negative means advance on supplier ("عليه")
  return balance > 0
    ? { code: "credit", label: "له" }
    : { code: "debit", label: "عليه" };
}

function PartyBalancesSheet({
  d,
  partyType,
  sortBy,
  filterBy,
}: {
  d: PartyBalancesDocument;
  partyType: "customer" | "supplier";
  sortBy: "name" | "id" | "balance";
  filterBy: "all" | "non_zero" | "debit" | "credit";
}) {
  const rows = useMemo(() => {
    const rawList = Array.isArray(d.parties) ? d.parties : [];

    const mapped = rawList.map((party) => {
      const numericBalance = Number(party.balance ?? 0);
      const state = getPartyBalanceState(numericBalance, partyType);
      return {
        id: Number(party.id),
        name: String(party.name ?? "—"),
        balance: numericBalance,
        absBalance: Math.abs(numericBalance),
        stateCode: state.code,
        stateLabel: state.label,
      };
    });

    const filtered = mapped.filter((row) => {
      if (filterBy === "non_zero") return row.stateCode !== "balanced";
      if (filterBy === "debit") return row.stateCode === "debit";
      if (filterBy === "credit") return row.stateCode === "credit";
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "id") return a.id - b.id;
      if (sortBy === "balance") return b.absBalance - a.absBalance || a.name.localeCompare(b.name, "ar");
      return a.name.localeCompare(b.name, "ar");
    });
  }, [d.parties, partyType, sortBy, filterBy]);

  // Split ordered rows sequentially into 2 side-by-side tables on the same page
  const half = Math.ceil(rows.length / 2);
  const rightRows = rows.slice(0, half);
  const leftRows = rows.slice(half);

  const totalDebit = rows
    .filter((r) => r.stateCode === "debit")
    .reduce((sum, r) => sum + r.absBalance, 0);

  const totalCredit = rows
    .filter((r) => r.stateCode === "credit")
    .reduce((sum, r) => sum + r.absBalance, 0);

  const renderTable = (
    slice: typeof rows,
    startIndex: number,
  ) => (
    <table className="invoice-items invoice-ledger-table party-balances-compact-table">
      <colgroup>
        <col style={{ width: "10%" }} />
        <col style={{ width: "44%" }} />
        <col style={{ width: "28%" }} />
        <col style={{ width: "18%" }} />
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          <th>الاسم</th>
          <th className="invoice-number-cell">الرصيد</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        {slice.length > 0 ? (
          slice.map((row, idx) => (
            <tr key={row.id}>
              <td className="invoice-number-cell">{startIndex + idx + 1}</td>
              <td className="invoice-product-name">{row.name}</td>
              <td className="invoice-number-cell invoice-line-total">
                {fmt(row.absBalance)} ل.س
              </td>
              <td style={{ textAlign: "center", fontWeight: 700 }}>
                {row.stateLabel}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} style={{ textAlign: "center" }}>
              —
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <>
      <Meta
        items={[
          [
            partyType === "customer" ? "إجمالي عدد العملاء" : "إجمالي عدد الموردين",
            rows.length.toLocaleString("en-US"),
          ],
          [
            "إجمالي الأرصدة ",
            `${fmt(totalDebit)} ل.س`,
          ],
          [
            "إجمالي الأرصدة ",
            `${fmt(totalCredit)} ل.س`,
          ],
          [
            "صافي الفرق",
            `${fmt(Math.abs(totalDebit - totalCredit))} ل.س (${
              Math.abs(totalDebit - totalCredit) < 0.005
                ? "متوازن"
                : totalDebit > totalCredit
                  ? "لنا"
                  : "علينا"
            })`,
          ],
        ]}
      />

      <div className="party-balances-two-col-grid">
        <div>{renderTable(rightRows, 0)}</div>
        <div>{renderTable(leftRows, half)}</div>
      </div>
    </>
  );
}

function Payment({
  d,
}: {
  d: PaymentDocument;
}) {
  const currency =
    d.currency || "SYP";

  return (
    <>
      <Meta
        items={[
          ["رقم السند", d.id],

          [
            "نوع السند",
            d.payment_type === "sale"
              ? "سند قبض"
              : d.payment_type === "purchase"
                ? "سند دفع"
                : d.payment_type === "general_receipt"
                  ? "سند قبض عام"
                  : d.payment_type === "general_payment"
                    ? "سند دفع عام"
                    : d.payment_type === "sale_reversal"
                      ? "إيصال عكس دفعة بيع"
                      : d.payment_type === "purchase_reversal"
                        ? "إيصال عكس دفعة شراء"
                        : "سند مالي",
          ],

          [
            "الطرف",
            d.party_name ||
              "بيع نقدي",
          ],

          [
            "رقم الفاتورة",
            d.invoice_number,
          ],

          [
            "الصندوق",
            d.cashbox_name,
          ],

          [
            "التاريخ",
            date(
              d.payment_date,
            ),
          ],
        ]}
      />

      <section className="invoice-summary mt-6">
        <div className="invoice-total">
          <span>
            المبلغ الأصلي
          </span>

          <strong>
            {money(
              d.amount,
              currency,
            )}
          </strong>
        </div>

        {currency !== "SYP" && (
          <>
            <div>
              <span>
                سعر الصرف
              </span>

              <strong>
                1 {currency} ={" "}
                {fmt(
                  d.exchange_rate,
                )}{" "}
                ل.س
              </strong>
            </div>

            <div>
              <span>
                القيمة الأساسية
              </span>

              <strong>
                {money(
                  d.amount_base,
                  "SYP",
                )}
              </strong>
            </div>
          </>
        )}
      </section>

      <p className="mt-8">
        البيان:{" "}
        {d.notes ||
          d.reference_number ||
          "دفعة مرتبطة بفاتورة"}
      </p>
    </>
  );
}

function Transaction({
  d,
}: {
  d: TransactionDocument;
}) {
  const currency =
    d.cashbox_currency ||
    "SYP";

  return (
    <>
      <Meta
        items={[
          [
            "رقم المستند",
            d.id,
          ],

          [
            "النوع",
            d.type === "income"
              ? "إيراد"
              : "مصروف",
          ],

          [
            "التصنيف",
            d.category_name,
          ],

          [
            "الصندوق",
            d.cashbox_name,
          ],

          [
            "التاريخ",
            date(
              d.transaction_date,
            ),
          ],

          [
            "المرجع",
            d.reference_number,
          ],
        ]}
      />

      <section className="invoice-summary mt-6">
        <div className="invoice-total">
          <span>المبلغ</span>

          <strong>
            {money(
              d.amount,
              currency,
            )}
          </strong>
        </div>
      </section>

      <p className="mt-8">
        الوصف:{" "}
        {d.description ||
          d.notes ||
          "—"}
      </p>
    </>
  );
}

function Transfer({
  d,
}: {
  d: TransferDocument;
}) {
  const outgoing =
    d.movements.find(
      (movement) =>
        movement.direction ===
        "out",
    );

  const incoming =
    d.movements.find(
      (movement) =>
        movement.direction ===
        "in",
    );

  const currency =
    outgoing?.cashbox_currency ||
    "SYP";

  return (
    <>
      <Meta
        items={[
          [
            "رقم التحويل",
            d.transfer_group_id,
          ],

          [
            "من صندوق",
            outgoing?.cashbox_name,
          ],

          [
            "إلى صندوق",
            incoming?.cashbox_name,
          ],

          [
            "التاريخ",
            date(
              outgoing?.transaction_date,
            ),
          ],

          [
            "العملة",
            currency === "SYP"
              ? "ل.س"
              : currency,
          ],
        ]}
      />

      <section className="invoice-summary mt-6">
        <div className="invoice-total">
          <span>
            قيمة التحويل
          </span>

          <strong>
            {money(
              outgoing?.amount,
              currency,
            )}
          </strong>
        </div>

        <div>
          <span>
            رصيد المصدر قبل/بعد
          </span>

          <strong>
            {fmt(
              outgoing?.balance_before,
            )}{" "}
            /{" "}
            {fmt(
              outgoing?.balance_after,
            )}
          </strong>
        </div>

        <div>
          <span>
            رصيد الوجهة قبل/بعد
          </span>

          <strong>
            {fmt(
              incoming?.balance_before,
            )}{" "}
            /{" "}
            {fmt(
              incoming?.balance_after,
            )}
          </strong>
        </div>
      </section>
    </>
  );
}

function Statement({
  d,
  kind,
}: {
  d: StatementDocument;
  kind: "customer" | "supplier";
}) {
  const periodLabel =
    d.from_date && d.to_date
      ? `من ${d.from_date} إلى ${d.to_date}`
      : d.from_date
        ? `من ${d.from_date}`
        : d.to_date
          ? `حتى ${d.to_date}`
          : "كل الفترات";

  const initialBalance = n(
    d.initial_balance ?? d.party?.initial_balance ?? 0,
  );
  const currentBalance = n(d.balance);
  const initialState = getPartyBalanceState(initialBalance, kind);
  const currentState = getPartyBalanceState(currentBalance, kind);

  return (
    <>
      <Meta
        items={[
          [
            "الاسم",
            d.party.name,
          ],

          [
            "الرصيد الافتتاحي",
            `${money(
              Math.abs(initialBalance),
              "SYP",
            )} (${initialState.label})`,
          ],

          [
            "الرصيد الحالي",
            `${money(
              Math.abs(currentBalance),
              "SYP",
            )} (${currentState.label})`,
          ],

          [
            "الفترة الزمنية",
            periodLabel,
          ],
        ]}
      />

      <h3 className="mt-7 mb-3 font-bold">
        الفواتير
      </h3>

      <table className="invoice-items">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>التاريخ</th>
            <th>الإجمالي</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
          </tr>
        </thead>

        <tbody>
          {d.invoices.map(
            (invoice) => (
              <tr key={invoice.id}>
                <td>
                  {invoice.invoice_number ||
                    `#${invoice.id}`}
                </td>

                <td>
                  {date(
                    invoice.invoice_date,
                  )}
                </td>

                <td>
                  {money(
                    invoice.total,
                    invoice.currency ||
                      "SYP",
                  )}
                </td>

                <td>
                  {money(
                    invoice.paid_amount,
                    invoice.currency ||
                      "SYP",
                  )}
                </td>

                <td>
                  {money(
                    invoice.remaining_amount,
                    invoice.currency ||
                      "SYP",
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      <h3 className="mt-7 mb-3 font-bold">
        الدفعات والسندات
      </h3>

      <table className="invoice-items">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>الصندوق</th>
            <th>مبلغ مدفوع</th>
            <th>مبلغ مقبوض</th>
            <th>البيان / ملاحظات</th>
          </tr>
        </thead>

        <tbody>
          {d.payments.map(
            (payment) => {
              const isReceived =
                payment.payment_type === "sale" ||
                payment.payment_type === "general_receipt" ||
                payment.payment_type === "purchase_reversal";
              const formattedAmount = money(
                payment.amount,
                payment.currency || "SYP",
              );

              return (
                <tr key={payment.id}>
                  <td>
                    {payment.id}
                  </td>

                  <td>
                    {date(
                      payment.payment_date,
                    )}
                  </td>

                  <td>
                    {payment.payment_type === "sale"
                      ? "دفعة بيع"
                      : payment.payment_type === "purchase"
                        ? "دفعة شراء"
                        : payment.payment_type === "general_receipt"
                          ? "سند قبض"
                          : payment.payment_type === "general_payment"
                            ? "سند دفع / سحب"
                            : payment.payment_type === "sale_reversal"
                              ? "عكس دفعة بيع"
                              : payment.payment_type === "purchase_reversal"
                                ? "عكس دفعة شراء"
                                : payment.payment_type || "—"}
                  </td>

                  <td>
                    {payment.cashbox_name ||
                      "—"}
                  </td>

                  <td>
                    {!isReceived ? formattedAmount : "—"}
                  </td>

                  <td>
                    {isReceived ? formattedAmount : "—"}
                  </td>

                  <td>
                    {payment.notes || "—"}
                  </td>
                </tr>
              );
            },
          )}
        </tbody>
      </table>
    </>
  );
}

function Cashbox({
  d,
}: {
  d: CashboxDocument;
}) {
  const currency =
    d.cashbox.currency ||
    "SYP";

  return (
    <>
      <Meta
        items={[
          [
            "الصندوق",
            d.cashbox.name,
          ],

          [
            "العملة",
            currency === "SYP"
              ? "ل.س"
              : currency,
          ],

          [
            "الرصيد الحالي",
            money(
              d.cashbox.balance,
              currency,
            ),
          ],

          [
            "عدد الحركات",
            d.movements.length,
          ],
        ]}
      />

      <table className="invoice-items mt-7">
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>الاتجاه</th>
            <th>المبلغ</th>
            <th>قبل</th>
            <th>بعد</th>
          </tr>
        </thead>

        <tbody>
          {d.movements.map(
            (movement) => (
              <tr key={movement.id}>
                <td>
                  {date(
                    movement.transaction_date,
                  )}
                </td>

                <td>
                  {getReferenceTypeLabel(
                    movement.reference_type,
                  )}
                </td>

                <td>
                  {getDirectionLabel(
                    movement.direction,
                  )}
                </td>

                <td>
                  {money(
                    movement.amount,
                    currency,
                  )}
                </td>

                <td>
                  {fmt(
                    movement.balance_before,
                  )}
                </td>

                <td>
                  {fmt(
                    movement.balance_after,
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </>
  );
}

function Consignment({
  d,
}: {
  d: ConsignmentDocument;
}) {
  const settlement = d.settlement;

  const currency =
    settlement.currency || "SYP";

  const returnedQuantity = n(
    settlement.returned_quantity,
  );

  const spoilageQuantity = n(
    settlement.spoilage_quantity,
  );

  const carriedQuantity = n(
    settlement.carried_quantity,
  );

  const totalResolvedQuantity =
    returnedQuantity +
    spoilageQuantity +
    carriedQuantity;

  return (
    <>
      <Meta
        items={[
          [
            "الفاتورة",
            settlement.invoice_number,
          ],

          [
            "المورد",
            settlement.supplier_name,
          ],

          [
            "التاريخ",
            date(
              settlement.settlement_date,
            ),
          ],
        ]}
      />

      <table className="invoice-items mt-7">
        <thead>
          <tr>
            <th>المنتج</th>
            <th>المستلم</th>
            <th>المباع</th>
            {settlement.remaining_stock_policy !== "manual" && (
              <>
                <th>المتبقي عند التسوية</th>
                <th>مصير المتبقي</th>
                <th>الكمية المعالجة</th>
              </>
            )}
            <th>قيمة المبيعات</th>
          </tr>
        </thead>

        <tbody>
          {d.items.map(
            (item) => (
              <tr key={item.id}>
                <td>
                  {item.product_name ||
                    "—"}
                </td>

                <td>
                  {fmt(
                    item.received_quantity,
                  )}
                </td>

                <td>
                  {fmt(
                    item.sold_quantity,
                  )}
                </td>

                {settlement.remaining_stock_policy !== "manual" && (
                  <>
                    <td>
                      {fmt(
                        item.remaining_quantity,
                      )}
                    </td>

                    <td>
                      {getRemainingPolicyLabel(
                        item.resolution_policy,
                      )}
                    </td>

                    <td>
                      {fmt(
                        item.resolved_quantity,
                      )}
                    </td>
                  </>
                )}

                <td>
                  {money(
                    item.sales_amount,
                    currency,
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      <section className="invoice-summary mt-6">
        <div>
          <span>
            إجمالي المبيعات
          </span>

          <strong>
            {money(
              settlement.total_sales_amount,
              currency,
            )}
          </strong>
        </div>

        <div>
          <span>
            العمولة
          </span>

          <strong>
            {money(
              settlement.commission_amount,
              currency,
            )}
          </strong>
        </div>

        <div className="invoice-total">
          <span>
            حصة المورد
          </span>

          <strong>
            {money(
              settlement.supplier_share,
              currency,
            )}
          </strong>
        </div>

        {currency !== "SYP" && (
          <div>
            <span>
              القيمة الأساسية
            </span>

            <strong>
              {money(
                n(
                  settlement.supplier_share,
                ) *
                  n(
                    settlement.exchange_rate,
                  ),
                "SYP",
              )}
            </strong>
          </div>
        )}
      </section>

      {settlement.remaining_stock_policy !== "manual" && (
      <section className="invoice-summary mt-6">
        <div className="invoice-total">
          <span>
            معالجة المخزون المتبقي
          </span>

          <strong>
            {fmt(
              totalResolvedQuantity,
            )}{" "}
            وحدة
          </strong>
        </div>

        <div>
          <span>
            المعاد للمورد
          </span>

          <strong>
            {fmt(
              returnedQuantity,
            )}{" "}
            وحدة
          </strong>
        </div>

        <div>
          <span>
            التالف
          </span>

          <strong>
            {fmt(
              spoilageQuantity,
            )}{" "}
            وحدة
          </strong>
        </div>

        {carriedQuantity > 0 && (
          <div>
            <span>
              المرحّل
            </span>

            <strong>
              {fmt(
                carriedQuantity,
              )}{" "}
              وحدة
            </strong>
          </div>
        )}
      </section>
      )}

      {settlement.notes && (
        <p className="mt-6 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-4 text-sm leading-7">
          <strong>
            ملاحظات التسوية:
          </strong>{" "}
          {settlement.notes}
        </p>
      )}
    </>
  );
}
