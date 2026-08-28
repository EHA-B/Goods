import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { BookOpen, CheckCircle2, ExternalLink, HelpCircle, X } from "lucide-react";
import { Link } from "react-router-dom";

import { getHelpArticle } from "../../pages/help/helpContent";
import type { ContextHelpConfig } from "../../pages/help/helpContext";

type Props = {
  open: boolean;
  config: ContextHelpConfig;
  onClose: () => void;
};

export default function ContextHelpDrawer({ open, config, onClose }: Props) {
  const article = useMemo(() => getHelpArticle(config.articleSlug), [config.articleSlug]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000]" dir="rtl">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]"
        aria-label="إغلاق المساعدة"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="context-help-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-subtle)] text-[var(--primary)]">
              <HelpCircle size={21} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--primary)]">مساعدة هذه الصفحة</p>
              <h2 id="context-help-title" className="mt-1 text-lg font-extrabold text-[var(--text-primary)]">
                {config.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]"
            aria-label="إغلاق"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{config.intro}</p>

          {config.tips && config.tips.length > 0 && (
            <section className="mt-5 rounded-[var(--radius-md)] border border-[var(--primary)]/20 bg-[var(--primary-subtle)]/55 p-4">
              <h3 className="font-bold text-[var(--text-primary)]">نقاط سريعة</h3>
              <ul className="mt-3 space-y-3">
                {config.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                    <CheckCircle2 size={16} className="mt-1 shrink-0 text-[var(--primary)]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {article && (
            <section className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-[var(--primary)]" />
                <h3 className="font-bold text-[var(--text-primary)]">من الدليل الكامل</h3>
              </div>

              <div className="space-y-3">
                {article.sections.slice(0, 3).map((section, index) => (
                  <div key={section.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface)] text-xs font-extrabold text-[var(--primary)] shadow-sm">
                        {(index + 1).toLocaleString("en-US")}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{section.title}</h4>
                        {section.paragraphs?.[0] && (
                          <p className="mt-2 line-clamp-3 text-xs leading-6 text-[var(--text-muted)]">{section.paragraphs[0]}</p>
                        )}
                        {section.steps?.[0] && (
                          <p className="mt-2 line-clamp-3 text-xs leading-6 text-[var(--text-muted)]">{section.steps[0]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <footer className="border-t border-[var(--border)] p-4">
          <Link
            to={`/help/${config.articleSlug}`}
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:opacity-90"
          >
            <ExternalLink size={17} />
            فتح الشرح الكامل
          </Link>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
