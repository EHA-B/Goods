import { Search } from "lucide-react";
import Input from "./Input";
import type { InputProps } from "./Input";

export default function SearchInput(
  props: InputProps,
) {
  return (
    <Input
      placeholder="بحث..."
      startContent={
        <Search size={16} />
      }
      {...props}
    />
  );
}