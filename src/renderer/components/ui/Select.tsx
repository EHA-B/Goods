import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type Props = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  options: Option[];
  placeholder?: string;
  error?: boolean;
};

const Select = forwardRef<HTMLSelectElement, Props>(
  (
    {
      options,
      placeholder,
      error = false,
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={[
            "h-11 w-full appearance-none rounded-[var(--radius-control)] border bg-[var(--surface)] px-3 pl-10 text-sm text-[var(--text-primary)] outline-none transition-[border-color,box-shadow,background-color] duration-150",
            error
              ? "border-[var(--danger)] focus:ring-3 focus:ring-[var(--danger-subtle)]"
              : "border-[var(--border-strong)] hover:border-[var(--primary)]/45 focus:border-[var(--primary)] focus:ring-3 focus:ring-[var(--focus-ring)]",
            className,
          ].join(" ")}
          {...props}
        >
          {placeholder && (
            <option value="">
              {placeholder}
            </option>
          )}

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;