import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import { ReactNode } from "react";

type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
};

export default function DropdownMenu({
  trigger,
  children,
}: DropdownMenuProps) {
  return (
    <RadixDropdownMenu.Root>
      <RadixDropdownMenu.Trigger asChild>
        {trigger}
      </RadixDropdownMenu.Trigger>

      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          align="start"
          sideOffset={6}
          className="
            z-50
            min-w-[180px]
            overflow-hidden
            rounded-md
            border
            border-[var(--border)]
            bg-[var(--surface)]
            p-1
            shadow-lg
            animate-in
            fade-in
            zoom-in-95
          "
        >
          {children}
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  );
}