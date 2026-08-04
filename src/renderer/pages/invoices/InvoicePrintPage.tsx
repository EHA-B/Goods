import { useEffect, useState } from "react";
import { FileDown, LoaderCircle, Printer } from "lucide-react";
import { useParams } from "react-router-dom";
import PrintableInvoice from "../../components/invoices/PrintableInvoice";
import { BackButton, Button, EmptyState, PageHeader } from "../../components/ui";
import { purchasesService } from "../purchases/purchasesService";
import { salesService } from "../sales/salesService";
import {
  defaultCompanySettings,
  settingsService,
  type CompanySettings,
} from "../settings/settingsService";

const saleStatus: Record<string, string> = {
  draft: "مسودة",
  confirmed: "مؤكدة",
  partially_paid: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

const purchaseStatus = saleStatus;

export default function InvoicePrintPage({ type }: { type: "sale" | "purchase" }) {
  const { saleId, purchaseId } = useParams();
  const [company, setCompany] = useState<CompanySettings>(defaultCompanySettings);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  
  const [saleDetails, setSaleDetails] = useState<SaleInvoiceDetails | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseInvoiceDetails | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      try {
        const settings = await settingsService.loadCompany();
        if (!cancelled) setCompany(settings);
      } catch {
        // Fallback to defaults
      } finally {
        if (!cancelled) setIsLoadingCompany(false);
      }
    }

    async function loadInvoice() {
      try {
        if (type === "sale" && saleId) {
          const details = await salesService.getDetails(Number(saleId));
          if (!cancelled) setSaleDetails(details);
        } else if (type === "purchase" && purchaseId) {
          const details = await purchasesService.getDetails(Number(purchaseId));
          if (!cancelled) setPurchaseDetails(details);
        }
      } catch (err: unknown) {
        const e = err as Error;
        if (!cancelled) setError(e.message || "تعذر تحميل تفاصيل الفاتورة");
      } finally {
        if (!cancelled) setIsLoadingInvoice(false);
      }
    }

    void loadCompany();
    void loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [type, saleId, purchaseId]);

  if (isLoadingInvoice) {
    return <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>;
  }

  if (error || (!saleDetails && !purchaseDetails)) {
    return <EmptyState title="الفاتورة غير موجودة" description={error || "تعذر تجهيز معاينة الطباعة لهذه الفاتورة."} />;
  }

  const print = () => window.print();

  const invoiceId = saleDetails ? saleDetails.invoice.id : purchaseDetails?.invoice.id;

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title="معاينة الفاتورة"
          description="راجع التنسيق، ثم اطبع الفاتورة أو اختر حفظ بصيغة PDF من نافذة الطباعة."
          actions={
            <div className="flex gap-2">
              <BackButton to={type === "sale" ? `/sales/${invoiceId}` : `/purchases/${invoiceId}`} />
              <Button variant="secondary" startIcon={<Printer size={17} />} onClick={print} disabled={isLoadingCompany}>
                طباعة
              </Button>
              <Button startIcon={isLoadingCompany ? <LoaderCircle size={17} className="animate-spin" /> : <FileDown size={17} />} onClick={print} disabled={isLoadingCompany}>
                {isLoadingCompany ? "جاري التجهيز..." : "حفظ PDF"}
              </Button>
            </div>
          }
        />
      </div>

      {saleDetails ? (
        <PrintableInvoice
          company={company}
          title="فاتورة مبيعات"
          invoiceNumber={saleDetails.invoice.invoice_number}
          invoiceDate={saleDetails.invoice.invoice_date}
          partyLabel="العميل"
          partyName={saleDetails.customer?.name ?? "بيع نقدي"}
          statusLabel={saleStatus[saleDetails.invoice.status] ?? saleDetails.invoice.status}
          items={saleDetails.items.map((item: Record<string, unknown>, i) => ({
            id: Number(item.id || i),
            productName: String(item.product_name ?? "-"),
            quantity: Number(item.quantity ?? 0),
            unitPrice: Number(item.unit_price ?? 0),
            lineTotal: Number(item.line_total ?? 0),
          }))}
          subtotal={saleDetails.financial_summary.subtotal}
          discount={saleDetails.financial_summary.discount_amount}
          tax={saleDetails.invoice.tax}
          total={saleDetails.financial_summary.total_amount}
          paidAmount={saleDetails.financial_summary.paid_amount}
          extraAmount={{ label: "العمولة", value: saleDetails.invoice.commission_amount }}
          notes={saleDetails.invoice.notes || undefined}
        />
      ) : purchaseDetails ? (
        <PrintableInvoice
          company={company}
          title="فاتورة مشتريات"
          invoiceNumber={purchaseDetails.invoice.invoice_number}
          invoiceDate={purchaseDetails.invoice.invoice_date}
          partyLabel="المورد"
          partyName={purchaseDetails.supplier?.name ?? "-"}
          statusLabel={purchaseStatus[purchaseDetails.invoice.status] ?? purchaseDetails.invoice.status}
          items={purchaseDetails.items.map((item: Record<string, unknown>, i) => ({
            id: Number(item.id || i),
            productName: String(item.product_name ?? "-"),
            quantity: Number(item.quantity ?? 0),
            unitPrice: Number(item.unit_price ?? 0),
            lineTotal: Number(item.line_total ?? 0),
          }))}
          subtotal={purchaseDetails.financial_summary.subtotal}
          discount={purchaseDetails.financial_summary.discount_amount}
          tax={purchaseDetails.invoice.tax}
          total={purchaseDetails.financial_summary.total_amount}
          paidAmount={purchaseDetails.financial_summary.paid_amount}
          notes={purchaseDetails.invoice.notes || undefined}
        />
      ) : null}
    </div>
  );
}
