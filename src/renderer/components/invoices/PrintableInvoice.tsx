import type { CompanySettings } from "../../pages/settings/settingsService";

type PrintItem = { id: number; productName: string; batchCode?: string; quantity: number; stockWeight?: number; unitPrice: number; lineTotal: number };
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
};
const money = (value: number, currency = "SYP") =>
  `${value.toLocaleString("en-US")} ${currency === "SYP" ? "ل.س" : currency}`;
export default function PrintableInvoice(props: Props) {
  return <article className="invoice-print-sheet" dir="rtl">
    <header className="invoice-print-header">
      <div className="invoice-company-block">
        <div className="invoice-company-identity">
          {props.company.logo && <img src={props.company.logo} alt="شعار الشركة" className="invoice-logo" />}
          <div><h1>{props.company.name || "اسم الشركة"}</h1><p className="invoice-company-subtitle">نظام المبيعات والمخزون</p></div>
        </div>
        <div className="invoice-company-contact">
          {props.company.address && <p><span>العنوان:</span> {props.company.address}</p>}
          {props.company.phone && <p><span>الهاتف:</span> <bdi>{props.company.phone}</bdi></p>}
          {props.company.email && <p><span>البريد:</span> <bdi>{props.company.email}</bdi></p>}
        </div>
      </div>
      <div className="invoice-title-box">
        <span className="invoice-document-label">فاتورة رسمية{props.edited ? " — معدلة" : ""}</span>
        <h2>{props.title}</h2>
        <dl><div><dt>رقم الفاتورة</dt><dd><bdi>{props.invoiceNumber}</bdi></dd></div><div><dt>تاريخ الفاتورة</dt><dd><bdi>{props.invoiceDate}</bdi></dd></div></dl>
      </div>
    </header>

    <section className="invoice-meta">
      <div className="invoice-party-card"><span>{props.partyLabel}</span><strong>{props.partyName}</strong></div>
      <div className="invoice-type-card"><span>نوع الفاتورة</span><strong>{props.title}</strong></div>
      {/* <div className="invoice-status-card"><span>حالة الفاتورة</span><strong>{props.statusLabel}</strong></div> */}
      {props.company.commercialRegister && <div><span>السجل التجاري</span><strong><bdi>{props.company.commercialRegister}</bdi></strong></div>}
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
          <th className="invoice-number-cell">العدد</th>
          <th className="invoice-number-cell">الوزن القائم</th>
          <th className="invoice-number-cell">السعر الإفرادي</th>
          <th className="invoice-number-cell">القيمة الإجمالية</th>
          <th>ملاحظات</th>
        </tr>
      </thead>
      <tbody>
        {props.items.map((item, index) => (
          <tr key={`${item.id}-${index}`}>
            <td className="invoice-product-name">{item.productName}</td>
            <td className="invoice-number-cell">{item.quantity.toLocaleString("en-US")}</td>
            <td className="invoice-number-cell">{item.stockWeight && item.stockWeight > 0 ? item.stockWeight.toLocaleString("en-US") : "—"}</td>
            <td className="invoice-number-cell">{money(item.unitPrice, props.currency)}</td>
            <td className="invoice-number-cell invoice-line-total">{money(item.lineTotal, props.currency)}</td>
            <td className="invoice-item-notes">{item.batchCode || ""}</td>
          </tr>
        ))}
        {Array.from({ length: Math.max(0, 18 - props.items.length) }, (_, index) => (
          <tr className="invoice-empty-row" key={`empty-${index}`} aria-hidden="true">
            <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="invoice-ledger-total">
          <th colSpan={4}>المجموع</th>
          <th className="invoice-number-cell">{money(props.total, props.currency)}</th>
          <th></th>
        </tr>
      </tfoot>
    </table>

    <section className="invoice-bottom-grid">
      <div className="invoice-notes-area">
        <div className="invoice-notes"><strong>ملاحظات الفاتورة</strong><p>{props.notes || "لا توجد ملاحظات."}</p></div>
        <p className="invoice-footer-message">{props.company.invoiceFooter || "شكرًا لتعاملكم معنا."}</p>
      </div>
      <div className="invoice-summary">
        <div><span>المجموع الفرعي</span><strong>{money(props.subtotal, props.currency)}</strong></div>
        <div><span>الخصم</span><strong>{money(props.discount, props.currency)}</strong></div>
        {props.extraAmount && (
          <div>
            <span>{props.extraAmount.label}</span>
            <strong>{money(props.extraAmount.value, props.currency)}</strong>
          </div>
        )}
        {props.extraAmounts
          ?.filter((item) => Math.abs(Number(item.value)) > 0)
          .map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{money(Number(item.value), props.currency)}</strong>
            </div>
          ))}
        <div><span>الضريبة</span><strong>{money(props.tax, props.currency)}</strong></div>
        <div className="invoice-total"><span>الإجمالي النهائي</span><strong>{money(props.total, props.currency)}</strong></div>
        <div><span>المبلغ المدفوع</span><strong>{money(props.paidAmount, props.currency)}</strong></div>
        <div className="invoice-remaining"><span>المبلغ المتبقي</span><strong>{money(Math.max(0, props.total - props.paidAmount), props.currency)}</strong></div>
        {props.currency && props.currency !== "SYP" && (
          <>
            <div><span>سعر الصرف</span><strong>1 {props.currency} = {Number(props.exchangeRate || 0).toLocaleString("en-US")} SYP</strong></div>
            <div><span>القيمة بالعملة الأساسية</span><strong>{money(Number(props.totalBase || 0), "SYP")}</strong></div>
          </>
        )}
      </div>
    </section>

    {/* <footer className="invoice-print-footer"><div className="invoice-signatures"><div><span>توقيع المستلم</span><i /></div><div><span>المحاسب</span><i /></div><div><span>الختم والتوقيع</span><i /></div></div><p>تم إنشاء هذه الفاتورة إلكترونيًا.</p></footer> */}
  </article>;
}
