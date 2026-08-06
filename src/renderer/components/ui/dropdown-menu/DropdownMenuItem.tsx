import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import { ReactNode } from "react";
import clsx from "clsx";

type Props = {
  children: ReactNode;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export default function DropdownMenuItem({
  children,
  icon,
  danger,
  disabled,
  onClick,
}: Props) {
  return (
    <RadixDropdownMenu.Item
      disabled={disabled}
      onSelect={onClick}
      className={clsx(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors",
        "data-[disabled]:pointer-events-none",
        "data-[disabled]:opacity-50",
        danger
          ? "text-[var(--danger)] hover:bg-[var(--danger-subtle)] focus:bg-[var(--danger-subtle)]"
          : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)]"
      )}
    >
      {icon}

      <span>{children}</span>
    </RadixDropdownMenu.Item>
  );
}