import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  messageClassName?: string;
};

function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
  className = "",
  messageClassName = "",
}: FormFieldProps) {
  const messageId = htmlFor
    ? `${htmlFor}-message`
    : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className={[
          "mb-2 block",
          "text-sm font-bold",
          "text-[var(--text-primary)]",
        ].join(" ")}
      >
        {label}

        {required && (
          <span
            aria-hidden="true"
            className="mr-1 text-[var(--danger)]"
          >
            *
          </span>
        )}
      </label>

      {children}

      <div
        id={messageId}
        aria-live={error ? "polite" : "off"}
        className={[
          "min-h-6 pt-1.5",
          messageClassName,
        ].join(" ")}
      >
        {error ? (
          <p className="text-xs font-medium text-[var(--danger)]">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs leading-5 text-[var(--text-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default FormField;
export type { FormFieldProps };