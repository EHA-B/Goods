import type {
  HTMLAttributes,
  ReactNode,
} from "react";

type CardProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> & {
  header?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;

  bodyClassName?: string;
  headerClassName?: string;

  padding?: boolean;
};

export default function Card({
  header,
  description,
  actions,
  footer,

  padding = true,

  bodyClassName = "",
  headerClassName = "",

  className = "",

  children,

  ...props
}: CardProps) {
  const hasHeader =
    header ||
    description ||
    actions;

  return (
    <section
      className={[
        "overflow-hidden rounded-[var(--radius-md)]",
        "border border-[var(--border)]",
        "bg-[var(--surface)]",
        className,
      ].join(" ")}
      {...props}
    >
      {hasHeader && (
        <header
          className={[
            "flex items-start justify-between gap-4",
            "border-b border-[var(--border)]",
            "px-5 py-4",
            headerClassName,
          ].join(" ")}
        >
          <div className="min-w-0">
            {header && (
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                {header}
              </h2>
            )}

            {description && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="shrink-0">
              {actions}
            </div>
          )}
        </header>
      )}

      <div
        className={[
          padding ? "p-5" : "",
          bodyClassName,
        ].join(" ")}
      >
        {children}
      </div>

      {footer && (
        <footer className="border-t border-[var(--border)] px-5 py-4">
          {footer}
        </footer>
      )}
    </section>
  );
}