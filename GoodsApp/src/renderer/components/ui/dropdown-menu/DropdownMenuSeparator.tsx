import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";

export default function DropdownMenuSeparator() {
  return (
    <RadixDropdownMenu.Separator
      className="my-1 h-px bg-[var(--border)]"
    />
  );
}