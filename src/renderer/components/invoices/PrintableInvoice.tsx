import type { CSSProperties } from "react";
import type { CompanySettings } from "../../pages/settings/settingsService";

type PrintItem = {
  id: number;
  productName: string;
  unit?: string;
  batchCode?: string;
  notes?: string;
  quantity: number;
  stockWeight?: number;
  unitPrice: number;
  lineTotal: number;
};

type Props = {
  company: CompanySettings;
  title: string;
  invoiceNumber: string;
  invoiceDate: string;
  partyLabel: string;
  partyName: string;
  statusLabel: string;
  edited?: boolean;
  items: PrintItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  currency?: string;
  exchangeRate?: number;
  totalBase?: number;
  extraAmount?: { label: string; value: number };
  extraAmounts?: Array<{
    label: string;
    value: number;
  }>;
  notes?: string;
  paperSize?: "A4" | "A5";
  style?: CSSProperties;
};

const money = (value: number, currency = "SYP") =>
  `${value.toLocaleString("en-US")} ${currency === "SYP" ? "ل.س" : currency}`;

function paginateItems(items: PrintItem[], maxIntermediate: number, maxLast: number): PrintItem[][] {
  if (items.length <= maxLast) {
    return [items];
  }

  const pages: PrintItem[][] = [];
  let remaining = [...items];

  while (remaining.length > 0) {
    if (remaining.length <= maxLast) {
      pages.push(remaining);
      break;
    }

    let takeCount: number;
    if (remaining.length <= maxIntermediate) {
      takeCount = maxLast;
    } else {
      takeCount = maxIntermediate;
    }

    pages.push(remaining.slice(0, takeCount));
    remaining = remaining.slice(takeCount);
  }

  return pages;
}

export default function PrintableInvoice(props: Props) {
  const paperClass = props.paperSize === "A5" ? "invoice-print-sheet--a5" : "invoice-print-sheet--a4";
  const maxLast = 16;
  const maxIntermediate = props.paperSize === "A5" ? 20 : 22;

  const pages = paginateItems(props.items, maxIntermediate, maxLast);
  const totalPages = pages.length;

  return (
    <>
      {pages.map((pageItems, pageIndex) => {
        const isLastPage = pageIndex === totalPages - 1;
        const emptyRowsCount = Math.max(
          0,
          (isLastPage ? maxLast : maxIntermediate) - pageItems.length,
        );
        const pageSubtotal = pageItems.reduce(
          (sum, item) => sum + (Number(item.lineTotal) || 0),
          0,
        );

        return (
          <article
            key={`invoice-page-${pageIndex + 1}`}
            className={`invoice-print-sheet ${paperClass}`}
            dir="rtl"
            style={props.style}
          >
            <header className="invoice-print-header">
              <div className="invoice-company-block">
                <div className="invoice-company-identity">
                  {props.company.logo && (
                    <img
                      src={props.company.logo}
                      alt="شعار الشركة"
                      className="invoice-logo"
                    />
                  )}
                  <div>
                    <h1>{props.company.name || "اسم الشركة"}</h1>
                    {/* <p className="invoice-company-subtitle">نظام المبيعات والمخزون</p> */}
                  </div>
                </div>
                <div className="invoice-company-contact">
                  {props.company.address && (
                    <p>
                      <span>العنوان:</span> {props.company.address}
                    </p>
                  )}
                  {props.company.phone && (
                    <p>
                      <span>الهاتف:</span> <bdi>{props.company.phone}</bdi>
                    </p>
                  )}
                  {props.company.email && (
                    <p>
                      <span>البريد:</span> <bdi>{props.company.email}</bdi>
                    </p>
                  )}
                </div>
              </div>
              <div className="invoice-title-box">
                <span className="invoice-document-label">
                  فاتورة رسمية{props.edited ? " — معدلة" : ""}
                  {totalPages > 1 ? ` (صفحة ${pageIndex + 1} من ${totalPages})` : ""}
                </span>
                <h2>{props.title}</h2>
                <dl>
                  <div>
                    <dt>رقم الفاتورة</dt>
                    <dd>
                      <bdi>{props.invoiceNumber}</bdi>
                    </dd>
                  </div>
                  <div>
                    <dt>تاريخ الفاتورة</dt>
                    <dd>
                      <bdi>{props.invoiceDate}</bdi>
                    </dd>
                  </div>
                  {totalPages > 1 && (
                    <div>
                      <dt>الصفحة</dt>
                      <dd>
                        <bdi>
                          {pageIndex + 1} من {totalPages}
                        </bdi>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </header>

            <section className="invoice-meta">
              <div className="invoice-party-card">
                <span>{props.partyLabel}</span>
                <strong>{props.partyName}</strong>
              </div>
            </section>

            <table className="invoice-items invoice-ledger-table">
              <colgroup>
                <col className="invoice-col-description" />
                <col className="invoice-col-quantity" />
                <col className="invoice-col-weight" />
                <col className="invoice-col-price" />
                <col className="invoice-col-total" />
                <col className="invoice-col-notes" />
              </colgroup>
              <thead>
                <tr>
                  <th>اسم المادة</th>
                  <th className="invoice-number-cell">الكمية</th>
                  <th className="invoice-number-cell">العدد</th>
                  <th className="invoice-number-cell">السعر الإفرادي</th>
                  <th className="invoice-number-cell">القيمة الإجمالية</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item, index) => (
                  <tr key={`${item.id}-${index}`}>
                    <td className="invoice-product-name">{item.productName}</td>
                    <td className="invoice-number-cell">
                      ({item.unit ? ` ${item.unit}` : ""}) {item.quantity.toLocaleString("en-US")}
                    </td>
                    <td className="invoice-number-cell">
                      {item.stockWeight && item.stockWeight > 0
                        ? item.stockWeight.toLocaleString("en-US")
                        : "—"}
                    </td>
                    <td className="invoice-number-cell">{money(item.unitPrice, props.currency)}</td>
                    <td className="invoice-number-cell invoice-line-total">
                      {money(item.lineTotal, props.currency)}
                    </td>
                    <td className="invoice-item-notes">{item.notes || item.batchCode || ""}</td>
                  </tr>
                ))}
                {Array.from({ length: emptyRowsCount }, (_, index) => (
                  <tr className="invoice-empty-row" key={`empty-${index}`} aria-hidden="true">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {isLastPage ? (
                  <tr className="invoice-ledger-total">
                    <th colSpan={4}>المجموع</th>
                    <th className="invoice-number-cell">{money(props.total, props.currency)}</th>
                    <th></th>
                  </tr>
                ) : (
                  <tr className="invoice-ledger-total invoice-ledger-subtotal">
                    <th colSpan={4}>
                      مجموع الصفحة {pageIndex + 1} (يتبع في صفحة {pageIndex + 2})
                    </th>
                    <th className="invoice-number-cell">{money(pageSubtotal, props.currency)}</th>
                    <th style={{ textAlign: "center", fontSize: "10px" }}>⬅ يتبع</th>
                  </tr>
                )}
              </tfoot>
            </table>

            {isLastPage && (
              <section className="invoice-bottom-grid">
                <div className="invoice-notes-area">
                  <div className="invoice-notes">
                    <strong>ملاحظات الفاتورة</strong>
                    <p>{props.notes || "لا توجد ملاحظات."}</p>
                  </div>
                  <p className="invoice-footer-message">
                    {props.company.invoiceFooter || "شكرًا لتعاملكم معنا."}
                  </p>
                </div>
                <div className="invoice-summary">
                  <div>
                    <span>المجموع الفرعي</span>
                    <strong>{money(props.subtotal, props.currency)}</strong>
                  </div>
                  <div>
                    <span>الخصم</span>
                    <strong>{money(props.discount, props.currency)}</strong>
                  </div>
                  <div className="invoice-total">
                    <span>الإجمالي النهائي</span>
                    <strong>{money(props.total, props.currency)}</strong>
                  </div>
                  <div>
                    <span>المبلغ المدفوع</span>
                    <strong>{money(props.paidAmount, props.currency)}</strong>
                  </div>
                  <div className="invoice-remaining">
                    <span>المبلغ المتبقي</span>
                    <strong>
                      {money(Math.max(0, props.total - props.paidAmount), props.currency)}
                    </strong>
                  </div>
                  {props.currency && props.currency !== "SYP" && (
                    <>
                      <div>
                        <span>سعر الصرف</span>
                        <strong>
                          1 {props.currency} = {Number(props.exchangeRate || 0).toLocaleString("en-US")} SYP
                        </strong>
                      </div>
                      <div>
                        <span>القيمة بالعملة الأساسية</span>
                        <strong>{money(Number(props.totalBase || 0), "SYP")}</strong>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}
          </article>
        );
      })}
    </>
  );
}
