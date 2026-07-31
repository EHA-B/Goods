import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ error = false, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          "min-h-32 w-full rounded-[var(--radius-sm)] border bg-[var(--surface)]",
          "p-3 outline-none transition",
          error
            ? "border-[var(--danger)]"
            : "border-[var(--border-strong)] hover:border-[var(--text-muted)] focus:border-[var(--primary)]",
          className,
        ].join(" ")}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;