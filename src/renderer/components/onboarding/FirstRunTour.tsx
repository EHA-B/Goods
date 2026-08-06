import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "../../routes/path";

const TOUR_STORAGE_KEY = "stocklite.onboarding.tour.v1";
const TOUR_EVENT = "stocklite:start-tour";

type TourState = "completed" | "dismissed" | null;

type TourStep = {
  title: string;
  description: string;
  target?: string;
  route?: string;
  hint?: string;
};

const STEPS: TourStep[] = [
  {
    title: "مرحبًا بك في StockLite",
    description:
      "جولة قصيرة من 6 خطوات ستعرّفك على أهم أقسام البرنامج دون تغيير أي بيانات.",
    hint: "يمكنك تخطي الجولة الآن وتشغيلها لاحقًا من مركز المساعدة أو الإعدادات.",
  },
  {
    title: "لوحة التحكم",
    description:
      "من هنا تراجع مؤشرات اليوم، آخر العمليات، والتنبيهات التي تحتاج إلى انتباهك.",
    target: '[data-tour-key="dashboard"]',
    route: PATHS.DASHBOARD,
  },
  {
    title: "المنتجات والمخزون",
    description:
      "أضف المنتجات أولًا، ثم أدخل الكميات الفعلية عبر فاتورة شراء أو دفعة مخزون.",
    target: '[data-tour-key="products"]',
    route: PATHS.PRODUCTS,
  },
  {
    title: "المشتريات",
    description:
      "تسجيل الشراء يُدخل الكمية إلى المخزون ويربطها بالمورد وسعر التكلفة والعملة.",
    target: '[data-tour-key="purchases"]',
    route: PATHS.PURCHASES,
  },
  {
    title: "المبيعات",
    description:
      "أنشئ فاتورة البيع، اختر الدفعة الصحيحة، وسجل الدفع في صندوق يطابق عملة الفاتورة.",
    target: '[data-tour-key="sales"]',
    route: PATHS.SALES,
  },
  {
    title: "الصناديق والمساعدة",
    description:
      "راجع الأرصدة والحركات من الصناديق، واستعمل مركز المساعدة متى احتجت شرحًا لأي عملية.",
    target: '[data-tour-key="help"]',
    route: PATHS.HELP,
    hint: "يمكنك فتح الجولة مجددًا من مركز المساعدة في أي وقت.",
  },
];

function getStoredState(): TourState {
  try {
    const value = localStorage.getItem(TOUR_STORAGE_KEY);
    return value === "completed" || value === "dismissed" ? value : null;
  } catch {
    return null;
  }
}

function storeState(value: Exclude<TourState, null>) {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, value);
  } catch {
    // The tour still works even if localStorage is unavailable.
  }
}

export function startFirstRunTour() {
  window.dispatchEvent(new Event(TOUR_EVENT));
}

export function resetFirstRunTour() {
  try {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  startFirstRunTour();
}

export default function FirstRunTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const openTour = useCallback(() => {
    setStepIndex(0);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const onStart = () => openTour();
    window.addEventListener(TOUR_EVENT, onStart);

    const timer = window.setTimeout(() => {
      if (getStoredState() === null) openTour();
    }, 1000);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(TOUR_EVENT, onStart);
    };
  }, [openTour]);

  useEffect(() => {
    if (!isOpen || !step.route || location.pathname === step.route) return;
    navigate(step.route);
  }, [isOpen, location.pathname, navigate, step.route]);

  const updateTarget = useCallback(() => {
    if (!isOpen || !step.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector<HTMLElement>(step.target);
    if (!element) {
      setTargetRect(null);
      return;
    }

    element.scrollIntoView({ block: "center", behavior: "smooth" });
    setTargetRect(element.getBoundingClientRect());
  }, [isOpen, step.target]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(updateTarget, 220);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [isOpen, location.pathname, stepIndex, updateTarget]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        storeState("dismissed");
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const cardStyle = useMemo<CSSProperties>(() => {
    if (!targetRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const width = Math.min(390, window.innerWidth - 32);
    const margin = 16;
    const availableBelow = window.innerHeight - targetRect.bottom;
    const top = availableBelow > 300
      ? targetRect.bottom + 14
      : Math.max(margin, targetRect.top - 280);
    const left = Math.min(
      Math.max(margin, targetRect.left + targetRect.width / 2 - width / 2),
      window.innerWidth - width - margin,
    );

    return { position: "fixed", top, left, width };
  }, [targetRect]);

  if (!isOpen || typeof document === "undefined") return null;

  const close = (state: "completed" | "dismissed") => {
    storeState(state);
    setIsOpen(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10050]" dir="rtl" aria-live="polite">
      <div className="absolute inset-0 bg-[var(--overlay-strong)]" />

      {targetRect && (
        <div
          className="pointer-events-none fixed rounded-xl ring-4 ring-[var(--tour-highlight)] shadow-[0_0_0_9999px_var(--tour-shadow)] transition-all duration-200"
          style={{
            top: Math.max(8, targetRect.top - 6),
            left: Math.max(8, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-label="الجولة التعريفية"
        style={cardStyle}
        className="z-[10060] overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="border-b border-[var(--border)] bg-[var(--primary-subtle)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--text-inverse)]">
                <Compass size={21} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--primary)]">
                  الخطوة {stepIndex + 1} من {STEPS.length}
                </p>
                <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                  {step.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => close("dismissed")}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
              aria-label="إغلاق الجولة"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            {step.description}
          </p>
          {step.hint && (
            <p className="mt-3 rounded-xl bg-[var(--background)] px-3 py-2.5 text-xs leading-6 text-[var(--text-muted)]">
              {step.hint}
            </p>
          )}

          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={[
                  "h-1.5 rounded-full transition-all",
                  index === stepIndex
                    ? "w-7 bg-[var(--primary)]"
                    : index < stepIndex
                      ? "w-3 bg-[var(--primary)]/45"
                      : "w-3 bg-[var(--border)]",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
          <button
            type="button"
            onClick={() => close("dismissed")}
            className="text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            تخطي الجولة
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
              السابق
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLast) close("completed");
                else setStepIndex((current) => current + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--text-inverse)] hover:opacity-90"
            >
              {isLast ? <Check size={16} /> : <ChevronLeft size={16} />}
              {isLast ? "إنهاء الجولة" : "التالي"}
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
