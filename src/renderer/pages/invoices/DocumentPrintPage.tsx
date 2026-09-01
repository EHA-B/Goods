import { useEffect, useMemo, useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  BackButton,
  Button,
  EmptyState,
  PageHeader,
} from "../../components/ui";

import {
  getPaymentStatusLabel,
  getPurchaseStatusLabel,
  getSaleStatusLabel,
} from "../../lib/statusTranslations";

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
  | "consignment";

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
};

type StatementDocument = {
  party: StatementParty;
  balance?: number | string | null;
  invoices: StatementInvoice[];
  payments: StatementPayment[];
  statement_type?: "customer" | "supplier" | string;
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

type DocumentData =
  | PaymentDocument
  | TransactionDocument
  | TransferDocument
  | StatementDocument
  | CashboxDocument
  | ConsignmentDocument;

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

function getTransactionStatusLabel(
  status?: string | null,
) {
  switch (status) {
    case "active":
      return "فعالة";

    case "completed":
      return "مكتملة";

    case "cancelled":
      return "ملغاة";

    case "reversed":
      return "معكوسة";

    case "pending":
      return "قيد الانتظار";

    default:
      return status ? "غير محددة" : "—";
  }
}

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

function getConsignmentStatusLabel(
  status?: string | null,
) {
  switch (status) {
    case "pending":
      return "قيد التسوية";

    case "completed":
    case "settled":
      return "تمت التسوية";

    case "reversed":
      return "معكوسة";

    case "cancelled":
      return "ملغاة";

    default:
      return status ? "غير محددة" : "—";
  }
}

function getRemainingPolicyLabel(
  policy?: string | null,
) {
  switch (policy) {
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

  const [savingPdf, setSavingPdf] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const api =
          window.stockliteApi.printDocuments;

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
            ),

          supplier: (documentId) =>
            api.supplierStatement(
              Number(documentId),
            ),

          cashbox: (documentId) =>
            api.cashboxStatement(
              Number(documentId),
            ),

          consignment: (documentId) =>
            api.consignment(
              Number(documentId),
            ),
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
      } catch (error: unknown) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "تعذر تجهيز المستند",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, id]);

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

  const print = () =>
    window.print();

  const savePdf = async () => {
    try {
      setSavingPdf(true);

      await window.stockliteApi.system.saveCurrentPageAsPdf(
        {
          fileName: `${title} ${raw}`,
        },
      );
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "تعذر حفظ ملف PDF",
      );
    } finally {
      setSavingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title={title}
          description="مستند موحّد A4 وRTL من البيانات الفعلية للنظام."
          actions={
            <div className="flex gap-2">
              <BackButton />

              <Button
                variant="secondary"
                startIcon={
                  <Printer size={17} />
                }
                onClick={print}
              >
                طباعة
              </Button>

              <Button
                startIcon={
                  <FileDown size={17} />
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
      </div>

      <article
        className="invoice-print-sheet"
        dir="rtl"
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

                <p className="invoice-company-subtitle">
                  {company.address ||
                    "نظام المبيعات والمخزون"}
                </p>
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

        <div>
          <span>الحالة</span>

          <strong>
            {getPaymentStatusLabel(
              d.status ||
                "active",
            )}
          </strong>
        </div>
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

        <div>
          <span>الحالة</span>

          <strong>
            {getTransactionStatusLabel(
              d.status,
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
  const getInvoiceStatus =
    kind === "customer"
      ? getSaleStatusLabel
      : getPurchaseStatusLabel;

  return (
    <>
      <Meta
        items={[
          [
            "الاسم",
            d.party.name,
          ],

          [
            "الهاتف",
            d.party.phone,
          ],

          [
            "العنوان",
            d.party.address,
          ],

          [
            "الرصيد الحالي",
            money(
              d.balance,
              "SYP",
            ),
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
            <th>الحالة</th>
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

                <td>
                  {getInvoiceStatus(
                    invoice.status,
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      <h3 className="mt-7 mb-3 font-bold">
        الدفعات
      </h3>

      <table className="invoice-items">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>الصندوق</th>
            <th>المبلغ</th>
            <th>الحالة</th>
          </tr>
        </thead>

        <tbody>
          {d.payments.map(
            (payment) => (
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
                  {money(
                    payment.amount,
                    payment.currency ||
                      "SYP",
                  )}
                </td>

                <td>
                  {getPaymentStatusLabel(
                    payment.status,
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
            "رقم التسوية",
            settlement.id,
          ],

          [
            "الفاتورة",
            settlement.invoice_number,
          ],

          [
            "المورد",
            settlement.supplier_name,
          ],

          [
            "الصندوق",
            settlement.cashbox_name,
          ],

          [
            "التاريخ",
            date(
              settlement.settlement_date,
            ),
          ],

          [
            "الحالة",
            getConsignmentStatusLabel(
              settlement.status,
            ),
          ],

          [
            "سياسة المتبقي",
            getRemainingPolicyLabel(
              settlement.remaining_stock_policy,
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
            <th>المتبقي عند التسوية</th>
            <th>مصير المتبقي</th>
            <th>الكمية المعالجة</th>
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