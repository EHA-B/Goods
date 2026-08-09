import type { ReactNode } from "react";
import Card from "./Card";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export default function FormSection({
  title,
  description,
  icon,
  actions,
  children,
}: Props) {
  return (
    <Card
      header={
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-[var(--primary)]">
              {icon}
            </span>
          )}

          <span>{title}</span>
        </div>
      }
      description={description}
      actions={actions}
    >
      <div className="grid gap-5">
        {children}
      </div>
    </Card>
  );
}