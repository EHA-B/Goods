import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "subtle" | "elevated" | "interactive";
type CardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  header?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  headerClassName?: string;
  padding?: boolean;
  variant?: CardVariant;
};

const variants: Record<CardVariant, string> = {
  default: "border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]",
  subtle: "border-[var(--border)] bg-[var(--surface-subtle)]",
  elevated: "border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]",
  interactive: "border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]/25 hover:shadow-[var(--shadow-md)]",
};

export default function Card({ header, description, actions, footer, padding = true,
  bodyClassName = "", headerClassName = "", className = "", variant = "default", children, ...props }: CardProps) {
  const hasHeader = header || description || actions;
  return (
    <section className={["overflow-hidden rounded-[var(--radius-card)] border", variants[variant], className].join(" ")} {...props}>
      {hasHeader && <header className={["flex flex-col gap-3 border-b border-[var(--divider)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between", headerClassName].join(" ")}>
        <div className="min-w-0">
          {header && <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-[var(--text-primary)]">{header}</h2>}
          {description && <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-muted)]">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </header>}
      <div className={[padding ? "p-5" : "", bodyClassName].join(" ")}>{children}</div>
      {footer && <footer className="border-t border-[var(--divider)] bg-[var(--surface-subtle)]/65 px-5 py-4">{footer}</footer>}
    </section>
  );
}
