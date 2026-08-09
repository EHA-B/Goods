import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Minus, Plus } from "lucide-react";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size" | "value"
> & {
  error?: boolean;
  suffix?: string;
  step?: number;
  showControls?: boolean;
  value?: string | number;
};

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      error = false,
      suffix,
      step = 1,
      showControls = true,
      value,
      onChange,
      min,
      max,
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
    const update = (delta: number) => {
      if (disabled) return;

      const current = Number(value || 0);

      let next = current + delta;

      if (min !== undefined)
        next = Math.max(Number(min), next);

      if (max !== undefined)
        next = Math.min(Number(max), next);

      onChange?.({
        target: {
          value: String(next),
        },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <div
        className={[
          "flex h-11 items-center rounded-[var(--radius-sm)] border bg-[var(--surface)]",
          error
            ? "border-[var(--danger)]"
            : "border-[var(--border-strong)] hover:border-[var(--text-muted)] focus-within:border-[var(--primary)]",
        ].join(" ")}
      >
        {showControls && (
          <button
            type="button"
            onClick={() => update(-step)}
            className="flex h-full w-10 items-center justify-center hover:bg-[var(--surface-hover)]"
          >
            <Minus size={15} />
          </button>
        )}

        <input
          ref={ref}
          type="number"
          value={value}
          onChange={onChange}
          onWheel={(e) => e.currentTarget.blur()}
          disabled={disabled}
          className={[
            "h-full flex-1 bg-transparent px-2 text-center outline-none",
            "[appearance:textfield]",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[&::-webkit-outer-spin-button]:appearance-none",
            className,
          ].join(" ")}
          {...props}
        />

        {suffix && (
          <span className="px-3 text-sm text-[var(--text-muted)]">
            {suffix}
          </span>
        )}

        {showControls && (
          <button
            type="button"
            onClick={() => update(step)}
            className="flex h-full w-10 items-center justify-center hover:bg-[var(--surface-hover)]"
          >
            <Plus size={15} />
          </button>
        )}
      </div>
    );
  },
);

NumberInput.displayName = "NumberInput";

export default NumberInput;