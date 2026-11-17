import { useEffect, useState, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";

export const DEFAULT_PRINTER = "HP LaserJet P1005";

export type PrinterOption = {
  name: string;
  displayName: string;
  isDefault?: boolean;
};

export function usePrintSettings() {
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

    void loadPrinters();
    return () => {
      cancelled = true;
    };
  }, []);

  const sheetStyle = {
    "--invoice-top-margin": `${topMarginMm}mm`,
    "--invoice-side-margin": `${sideMarginMm}mm`,
    zoom: scaleFactor !== 100 ? `${scaleFactor}%` : undefined,
  } as CSSProperties;

  const paperClass =
    paperSize === "A5" ? "invoice-print-sheet--a5" : "invoice-print-sheet--a4";

  return {
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
  };
}

type PrintSettingsToolbarProps = {
  printers: PrinterOption[];
  selectedPrinter: string;
  paperSize: "A4" | "A5";
  copies: number;
  scaleFactor: number;
  topMarginMm: number;
  sideMarginMm: number;
  onPrinterChange: (printerName: string) => void;
  onPaperSizeChange: (size: "A4" | "A5") => void;
  onCopiesChange: (copies: number) => void;
  onScaleChange: (scale: number) => void;
  onTopMarginChange: (margin: number) => void;
  onSideMarginChange: (margin: number) => void;
  onReset: () => void;
};

export default function PrintSettingsToolbar({
  printers,
  selectedPrinter,
  paperSize,
  copies,
  scaleFactor,
  topMarginMm,
  sideMarginMm,
  onPrinterChange,
  onPaperSizeChange,
  onCopiesChange,
  onScaleChange,
  onTopMarginChange,
  onSideMarginChange,
  onReset,
}: PrintSettingsToolbarProps) {
  return (
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
          onChange={(e) => onPrinterChange(e.target.value)}
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
            onClick={() => onPaperSizeChange(size)}
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
          onChange={(e) =>
            onCopiesChange(Math.max(1, Math.min(99, Number(e.target.value) || 1)))
          }
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
          onChange={(e) => onScaleChange(Number(e.target.value) || 100)}
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
          onChange={(e) => onTopMarginChange(Number(e.target.value))}
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
          onChange={(e) => onSideMarginChange(Number(e.target.value))}
          className="h-9 w-18 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center font-bold text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
        />
      </div>

      <button
        type="button"
        onClick={onReset}
        title="إعادة ضبط الهوامش والحجم"
        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 font-bold text-[var(--text-secondary)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
      >
        <RotateCcw size={14} />
        إعادة ضبط
      </button>
    </div>
  );
}
