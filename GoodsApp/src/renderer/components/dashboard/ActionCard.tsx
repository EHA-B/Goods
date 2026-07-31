import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type ActionCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
};

export default function ActionCard({
  title,
  description,
  icon: Icon,
  to,
}: ActionCardProps) {
  return (
    <Link
      to={to}
      className={[
        "group flex items-center gap-4 rounded",
        "border border-[var(--border)]",
        "bg-[var(--surface)] p-4",
        "transition hover:bg-[var(--surface-hover)]",
      ].join(" ")}
    >
      <Icon
        size={20}
        className="text-[var(--primary)]"
      />

      <div className="flex-1">
        <p className="font-bold">
          {title}
        </p>

        <p className="text-xs text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <ArrowLeft
        size={15}
        className="transition group-hover:-translate-x-1"
      />
    </Link>
  );
}