import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type DialogSize = "sm" | "md" | "lg" | "xl";
type Props = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: DialogSize;
  closeOnBackdrop?: boolean;
};
const sizes: Record<DialogSize, string> = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

export default function Dialog({ open, title, description, children, footer, onClose, size = "md", closeOnBackdrop = true }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = originalOverflow; previous?.focus?.(); };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[var(--overlay-strong)] p-4 backdrop-blur-[2px]" onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}
        className={["flex max-h-[min(88vh,820px)] w-full flex-col overflow-hidden rounded-[var(--radius-dialog)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-dialog)] outline-none", sizes[size], "animate-[stocklite-dialog-enter_180ms_ease-out]"].join(" ")}>
        <header className="flex items-start justify-between gap-4 border-b border-[var(--divider)] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">{title}</h2>
            {description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-3 focus-visible:ring-[var(--focus-ring)]"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--divider)] bg-[var(--surface-subtle)]/70 px-5 py-4">{footer}</footer>}
      </div>
    </div>, document.body,
  );
}
