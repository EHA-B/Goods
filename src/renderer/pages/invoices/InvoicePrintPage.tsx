import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { notifyError, notifySuccess } from "../../lib/notifications";
import { useEffect, useState, type CSSProperties } from "react";
import { FileDown, LoaderCircle, Printer, RotateCcw } from "lucide-react";
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

const DEFAULT_PRINTER = "HP LaserJet P1005";

const saleStatus: Record<string, string> = {
  draft: "مسودة",
  confirmed: "مؤكدة",
  partially_paid: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

const purchaseStatus = saleStatus;

type PrinterOption = {
  name: string;
  displayName: string;
  isDefault?: boolean;
};

export default function InvoicePrintPage({ type }: { type: "sale" | "purchase" }) {
  const { saleId, purchaseId } = useParams();
  const [company, setCompany] = useState<CompanySettings>(defaultCompanySettings);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  const [saleDetails, setSaleDetails] = useState<SaleInvoiceDetails | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseInvoiceDetails | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(true);
  const [error, setError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const [printers, setPrinters] = useState<PrinterOption[]>([
    { name: DEFAULT_PRINTER, displayName: DEFAULT_PRINTER },
  ]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => {
    try {
      return localStorage.getItem("stocklite.invoice-printer") || DEFAULT_PRINTER;
    } catch {
      return DEFAULT_PRINTER;
    }
  });

  const [paperSize, setPaperSize] = useState<"A4" | "A5">(() => {
    try {
      const saved = localStorage.getItem("stocklite.invoice-paper-size");
      return saved === "A5" || saved === "A4" ? saved : "A4";
    } catch {
      return "A4";
    }
  });

  const [copies, setCopies] = useState<number>(1);
  const [scaleFactor, setScaleFactor] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem("stocklite.invoice-scale"));
      return Number.isFinite(saved) && saved >= 50 && saved <= 150 ? saved : 100;
    } catch {
      return 100;
    }
  });

  const [topMarginMm, setTopMarginMm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("stocklite.invoice-top-margin");
      if (saved !== null && Number.isFinite(Number(saved))) return Number(saved);
    } catch {
      // ignore
    }
    return paperSize === "A5" ? 3 : 6;
  });

  const [sideMarginMm, setSideMarginMm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("stocklite.invoice-side-margin");
      if (saved !== null && Number.isFinite(Number(saved))) return Number(saved);
    } catch {
      // ignore
    }
    return paperSize === "A5" ? 4.5 : 6;
  });

  const handlePaperSizeChange = (size: "A4" | "A5") => {
    setPaperSize(size);
    const nextTop = size === "A5" ? 3 : 6;
    const nextSide = size === "A5" ? 4.5 : 6;
    setTopMarginMm(nextTop);
    setSideMarginMm(nextSide);
    try {
      localStorage.setItem("stocklite.invoice-paper-size", size);
      localStorage.setItem("stocklite.invoice-top-margin", String(nextTop));
      localStorage.setItem("stocklite.invoice-side-margin", String(nextSide));
    } catch {
      // Ignore storage errors
    }
  };

  const handlePrinterChange = (printerName: string) => {
    setSelectedPrinter(printerName);
    try {
      localStorage.setItem("stocklite.invoice-printer", printerName);
    } catch {
      // Ignore
    }
  };

  const handleScaleChange = (value: number) => {
    const clamped = Math.max(50, Math.min(150, value));
    setScaleFactor(clamped);
    try {
      localStorage.setItem("stocklite.invoice-scale", String(clamped));
    } catch {
      // Ignore
    }
  };

  const handleTopMarginChange = (value: number) => {
    const clamped = Math.max(0, Math.min(40, value));
    setTopMarginMm(clamped);
    try {
      localStorage.setItem("stocklite.invoice-top-margin", String(clamped));
    } catch {
      // Ignore
    }
  };

  const handleSideMarginChange = (value: number) => {
    const clamped = Math.max(0, Math.min(30, value));
    setSideMarginMm(clamped);
    try {
      localStorage.setItem("stocklite.invoice-side-margin", String(clamped));
    } catch {
      // Ignore
    }
  };

  const resetPrintAdjustments = () => {
    const defaultTop = paperSize === "A5" ? 3 : 6;
    const defaultSide = paperSize === "A5" ? 4.5 : 6;
    handleScaleChange(100);
    handleTopMarginChange(defaultTop);
    handleSideMarginChange(defaultSide);
    setCopies(1);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadPrinters() {
      try {
        const res = await window.stockliteApi?.system?.getPrinters?.();
        if (cancelled || !res) return;
        const list = Array.isArray(res.printers) ? res.printers : [];
        const hasDefaultP1005 = list.some(
          (p) => p.name.toLowerCase() === DEFAULT_PRINTER.toLowerCase(),
        );
        const merged = hasDefaultP1005
          ? list
          : [{ name: DEFAULT_PRINTER, displayName: DEFAULT_PRINTER }, ...list];
        setPrinters(merged);

        const savedPrinter = localStorage.getItem("stocklite.invoice-printer");
        if (!savedPrinter && res.defaultPrinter) {
          setSelectedPrinter(res.defaultPrinter);
        }
      } catch {
        // Fallback to default printer list
      }
    }

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
        if (!cancelled) setError(getArabicErrorMessage(e, "تعذر تحميل تفاصيل الفاتورة"));
      } finally {
        if (!cancelled) setIsLoadingInvoice(false);
      }
    }

    void loadPrinters();
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

  const invoiceId = saleDetails ? saleDetails.invoice.id : purchaseDetails?.invoice.id;

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
          notifySuccess("تم إرسال الفاتورة إلى الطابعة بنجاح");
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
      setIsSavingPdf(true);
      resetScrollBeforePrint();
      const number = saleDetails?.invoice.invoice_number ?? purchaseDetails?.invoice.invoice_number ?? invoiceId;
      await window.stockliteApi.system.saveCurrentPageAsPdf({
        fileName: `${type === "sale" ? "فاتورة مبيعات" : "فاتورة مشتريات"} ${number}`,
        pageSize: paperSize,
        scaleFactor,
      });
    } catch (err: unknown) {
      notifyError(getArabicErrorMessage(err, "تعذر حفظ ملف PDF"));
    } finally {
      setIsSavingPdf(false);
    }
  };

  const sheetStyle = {
    "--invoice-top-margin": `${topMarginMm}mm`,
    "--invoice-side-margin": `${sideMarginMm}mm`,
    zoom: scaleFactor !== 100 ? `${scaleFactor}%` : undefined,
  } as CSSProperties;

  return (
    <div className="invoice-print-page">
      <div className="no-print mb-5 space-y-3">
        <style>{`@page { size: ${paperSize} portrait; margin: 0mm; }`}</style>
        <PageHeader
          title="معاينة الفاتورة"
          description="تحكم بإعدادات الطابعة والورق والهوامش مباشرة ثم اطبع الفاتورة بنقرة واحدة."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <BackButton to={type === "sale" ? `/sales/${invoiceId}` : `/purchases/${invoiceId}`} />
              <Button
                startIcon={isPrinting ? <LoaderCircle size={17} className="animate-spin" /> : <Printer size={17} />}
                onClick={() => void print()}
                disabled={isLoadingCompany || isPrinting}
              >
                {isPrinting ? "جاري الطباعة..." : "طباعة مباشرة"}
              </Button>
              <Button
                variant="secondary"
                startIcon={isLoadingCompany || isSavingPdf ? <LoaderCircle size={17} className="animate-spin" /> : <FileDown size={17} />}
                onClick={() => void savePdf()}
                disabled={isLoadingCompany || isSavingPdf}
              >
                {isLoadingCompany || isSavingPdf ? "جاري الحفظ..." : "حفظ PDF"}
              </Button>
            </div>
          }
        />

        <div
          dir="rtl"
          className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs shadow-[var(--shadow-sm)]"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="invoice-printer-select" className="font-bold text-[var(--text-secondary)]">
              الطابعة:
            </label>
            <select
              id="invoice-printer-select"
              value={selectedPrinter}
              onChange={(e) => handlePrinterChange(e.target.value)}
              className="h-9 min-w-[190px] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            >
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName || p.name}
                </option>
              ))}
            </select>
          </div>

          <div
            role="group"
            aria-label="حجم ورق الطباعة"
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-1 font-bold"
          >
            <span className="px-2 text-[var(--text-secondary)]">الورق:</span>
            {(["A4", "A5"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handlePaperSizeChange(size)}
                className={[
                  "rounded-[var(--radius-sm)] px-2.5 py-1 transition-colors",
                  paperSize === size
                    ? "bg-[var(--primary)] text-[var(--text-inverse)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="invoice-copies-input" className="font-bold text-[var(--text-secondary)]">
              النسخ:
            </label>
            <input
              id="invoice-copies-input"
              type="number"
              min={1}
              max={99}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              className="h-9 w-16 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="invoice-scale-input" className="font-bold text-[var(--text-secondary)]">
              الحجم %:
            </label>
            <input
              id="invoice-scale-input"
              type="number"
              min={50}
              max={150}
              step={5}
              value={scaleFactor}
              onChange={(e) => handleScaleChange(Number(e.target.value) || 100)}
              className="h-9 w-20 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="invoice-top-margin-input" className="font-bold text-[var(--text-secondary)]">
              هامش علوي (ملم):
            </label>
            <input
              id="invoice-top-margin-input"
              type="number"
              min={0}
              max={40}
              step={0.5}
              value={topMarginMm}
              onChange={(e) => handleTopMarginChange(Number(e.target.value))}
              className="h-9 w-18 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="invoice-side-margin-input" className="font-bold text-[var(--text-secondary)]">
              هامش جانبي (ملم):
            </label>
            <input
              id="invoice-side-margin-input"
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={sideMarginMm}
              onChange={(e) => handleSideMarginChange(Number(e.target.value))}
              className="h-9 w-18 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
            />
          </div>

          <button
            type="button"
            onClick={resetPrintAdjustments}
            title="إعادة ضبط الهوامش والحجم"
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            <RotateCcw size={14} />
            إعادة ضبط
          </button>
        </div>
      </div>

      {saleDetails ? (
        <PrintableInvoice
          paperSize={paperSize}
          style={sheetStyle}
          company={company}
          title="فاتورة مبيعات"
          invoiceNumber={saleDetails.invoice.invoice_number}
          invoiceDate={saleDetails.invoice.invoice_date}
          partyLabel="العميل"
          partyName={saleDetails.customer?.name ?? "بيع نقدي"}
          statusLabel={saleStatus[saleDetails.invoice.status] ?? saleDetails.invoice.status}
          edited={Boolean(saleDetails.invoice.is_edited)}
          items={saleDetails.items.map((item: Record<string, unknown>, i) => ({
            id: Number(item.id || i),
            productName: String(item.product_name ?? "-"),
            unit: item.product_unit ? String(item.product_unit) : item.unit ? String(item.unit) : undefined,
            quantity: Number(item.quantity ?? 0),
            stockWeight: Number(item.stock_weight ?? 0),
            unitPrice: Number(item.unit_price ?? 0),
            lineTotal: Number(item.line_total ?? 0),
          }))}
          subtotal={saleDetails.financial_summary.subtotal}
          discount={saleDetails.financial_summary.discount_amount}
          tax={saleDetails.invoice.tax}
          total={saleDetails.financial_summary.total_amount}
          paidAmount={saleDetails.financial_summary.paid_amount}
          currency={saleDetails.invoice.currency}
          exchangeRate={saleDetails.invoice.exchange_rate}
          totalBase={saleDetails.financial_summary.total_base}
          extraAmount={{ label: "العمولة", value: saleDetails.invoice.commission_amount }}
          notes={saleDetails.invoice.notes || undefined}
        />
      ) : purchaseDetails ? (
        <PrintableInvoice
          paperSize={paperSize}
          style={sheetStyle}
          company={company}
          title="فاتورة مشتريات"
          invoiceNumber={purchaseDetails.invoice.invoice_number}
          invoiceDate={purchaseDetails.invoice.invoice_date}
          partyLabel="المورد"
          partyName={purchaseDetails.supplier?.name ?? "-"}
          statusLabel={purchaseStatus[purchaseDetails.invoice.status] ?? purchaseDetails.invoice.status}
          edited={Boolean(purchaseDetails.invoice.is_edited)}
          items={purchaseDetails.items.map((item: Record<string, unknown>, i) => ({
            id: Number(item.id || i),
            productName: String(item.product_name ?? "-"),
            unit: item.product_unit ? String(item.product_unit) : item.unit ? String(item.unit) : undefined,
            quantity: Number(item.quantity ?? 0),
            stockWeight: Number(item.stock_weight ?? 0),
            unitPrice: Number(item.unit_price ?? 0),
            lineTotal: Number(item.line_total ?? 0),
          }))}
          subtotal={purchaseDetails.financial_summary.subtotal}
          discount={purchaseDetails.financial_summary.discount_amount}
          tax={purchaseDetails.invoice.tax}
          total={purchaseDetails.financial_summary.total_amount}
          paidAmount={purchaseDetails.financial_summary.paid_amount}
          currency={purchaseDetails.invoice.currency}
          exchangeRate={purchaseDetails.invoice.exchange_rate}
          totalBase={purchaseDetails.financial_summary.total_base}
          extraAmounts={[
            {
              label: `تكلفة النقل (${purchaseDetails.financial_summary.transport_cost_bearer === "supplier" ? "على المورد" : "علينا"})`,
              value: Number(purchaseDetails.financial_summary.transport_cost ?? 0) * (purchaseDetails.financial_summary.transport_cost_bearer === "supplier" ? -1 : 1),
            },
            {
              label: `تكلفة العتالة (${purchaseDetails.financial_summary.emptying_cost_bearer === "supplier" ? "على المورد" : "علينا"})`,
              value: Number(purchaseDetails.financial_summary.emptying_cost ?? 0) * (purchaseDetails.financial_summary.emptying_cost_bearer === "supplier" ? -1 : 1),
            },
          ]}
          notes={purchaseDetails.invoice.notes || undefined}
        />
      ) : null}
    </div>
  );
}
