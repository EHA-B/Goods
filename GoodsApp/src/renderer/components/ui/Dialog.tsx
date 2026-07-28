import {
  type ReactNode,
  useEffect,
} from "react";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export default function Dialog({
  open,
  title,
  children,
  footer,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-lg"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <header className="border-b border-[var(--divider)] px-5 py-4">
          <h2 className="text-lg font-bold">
            {title}
          </h2>
        </header>

        <div className="p-5">
          {children}
        </div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-[var(--divider)] px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}