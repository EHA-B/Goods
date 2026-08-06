import { useEffect, useMemo, useState } from "react";
import { Lightbulb, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getContextHelp } from "../../pages/help/helpContext";

const TIP_STORAGE_PREFIX = "stocklite.help.tip.dismissed.";

function storageKey(pathname: string) {
  return `${TIP_STORAGE_PREFIX}${pathname}`;
}

export default function ContextTip() {
  const location = useLocation();
  const context = useMemo(() => getContextHelp(location.pathname), [location.pathname]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    if (!context?.tips?.length) return;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey(location.pathname)) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;

    const timer = window.setTimeout(() => setVisible(true), 1400);
    return () => window.clearTimeout(timer);
  }, [context, location.pathname]);

  if (!visible || !context?.tips?.length) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(location.pathname), "1");
    } catch {
      // Ignore storage failures.
    }
    setVisible(false);
  };

  return (
    <aside
      dir="rtl"
      className="fixed bottom-5 left-5 z-[1500] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
      aria-label="نصيحة استخدام"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--warning-subtle)] text-[var(--warning)]">
          <Lightbulb size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[var(--warning)]">هل تعلم؟</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                {context.tips[0]}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--background)] hover:text-[var(--text-primary)]"
              aria-label="إخفاء النصيحة"
            >
              <X size={17} />
            </button>
          </div>
          <Link
            to={`/help/${context.articleSlug}`}
            onClick={dismiss}
            className="mt-3 inline-flex text-xs font-bold text-[var(--primary)] hover:underline"
          >
            معرفة المزيد
          </Link>
        </div>
      </div>
    </aside>
  );
}
