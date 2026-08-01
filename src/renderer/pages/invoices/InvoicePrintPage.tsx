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

const saleStatus = {
  draft: "مسودة",
  confirmed: "مؤكدة",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

const purchaseStatus = saleStatus;

export default function InvoicePrintPage({ type }: { type: "sale" | "purchase" }) {
  const { saleId, purchaseId } = useParams();
  const [company, setCompany] = useState<CompanySettings>(defaultCompanySettings);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      try {
        const settings = await settingsService.loadCompany();
        if (!cancelled) setCompany(settings);
      } catch {
        // تبقى القيم الافتراضية متاحة للطباعة عند تعذر تحميل الإعدادات.
      } finally {
        if (!cancelled) setIsLoadingCompany(false);
      }
    }

    void loadCompany();
    return () => {
      cancelled = true;
    };
  }, []);

  const sale = type === "sale" ? salesService.getById(Number(saleId)) : undefined;
  const purchase = type === "purchase" ? purchasesService.getById(Number(purchaseId)) : undefined;
  const invoice = sale ?? purchase;

  if (!invoice) {
    return <EmptyState title="الفاتورة غير موجودة" description="تعذر تجهيز معاينة الطباعة لهذه الفاتورة." />;
  }

  const print = () => window.print();

  return (
    <div className="space-y-5">
      <div className="no-print">
        <PageHeader
          title="معاينة الفاتورة"
          description="راجع التنسيق، ثم اطبع الفاتورة أو اختر حفظ بصيغة PDF من نافذة الطباعة."
          actions={
            <div className="flex gap-2">
              <BackButton to={type === "sale" ? `/sales/${invoice.id}` : `/purchases/${invoice.id}`} />
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

      {sale ? (
        <PrintableInvoice
          company={company}
          title="فاتورة مبيعات"
          invoiceNumber={sale.invoiceNumber}
          invoiceDate={sale.invoiceDate}
          partyLabel="العميل"
          partyName={sale.customerName}
          statusLabel={saleStatus[sale.status]}
          items={sale.items}
          subtotal={sale.subtotal}
          discount={sale.discount}
          tax={sale.tax}
          total={sale.total}
          paidAmount={sale.paidAmount}
          extraAmount={{ label: "العمولة", value: sale.commissionAmount }}
          notes={sale.notes}
        />
      ) : (
        purchase && (
          <PrintableInvoice
            company={company}
            title="فاتورة مشتريات"
            invoiceNumber={purchase.invoiceNumber}
            invoiceDate={purchase.invoiceDate}
            partyLabel="المورد"
            partyName={purchase.supplierName}
            statusLabel={purchaseStatus[purchase.status]}
            items={purchase.items.map((item) => ({ ...item, unitPrice: item.purchasePrice }))}
            subtotal={purchase.subtotal}
            discount={purchase.discount}
            tax={purchase.tax}
            total={purchase.total}
            paidAmount={purchase.paidAmount}
            notes={purchase.notes}
          />
        )
      )}
    </div>
  );
}
