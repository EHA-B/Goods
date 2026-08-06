import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { useLocation } from "react-router-dom";

import { getContextHelp } from "../../pages/help/helpContext";
import ContextHelpDrawer from "./ContextHelpDrawer";

export default function ContextHelpButton() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const config = getContextHelp(pathname);

  if (!config) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-subtle)] hover:text-[var(--primary)]"
        aria-label="مساعدة هذه الصفحة"
        title="مساعدة هذه الصفحة"
      >
        <CircleHelp size={18} />
        <span className="hidden md:inline">مساعدة</span>
      </button>

      <ContextHelpDrawer open={open} config={config} onClose={() => setOpen(false)} />
    </>
  );
}
