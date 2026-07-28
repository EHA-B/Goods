import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

type InputSize = "sm" | "md" | "lg";

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  inputSize?: InputSize;
  error?: boolean;
  startContent?: ReactNode;
  endContent?: ReactNode;
  containerClassName?: string;
};

const sizeClasses: Record<InputSize, string> = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-12 text-sm",
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      inputSize = "md",
      error = false,
      startContent,
      endContent,
      disabled,
      readOnly,
      className = "",
      containerClassName = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div
        className={[
          "group relative flex w-full items-center",
          "rounded-[var(--radius-sm)] border",
          "bg-[var(--surface)]",
          "transition-[background-color,border-color,box-shadow]",
          "duration-150 ease-out",
          error
            ? [
                "border-[var(--danger)]",
                "focus-within:border-[var(--danger)]",
                "focus-within:ring-3",
                "focus-within:ring-[var(--danger-subtle)]",
              ].join(" ")
            : [
                "border-[var(--border-strong)]",
                "hover:border-[var(--text-muted)]",
                "focus-within:border-[var(--primary)]",
                "focus-within:ring-3",
                "focus-within:ring-[var(--focus-ring)]",
              ].join(" "),
          disabled
            ? [
                "cursor-not-allowed",
                "bg-[var(--surface-subtle)]",
                "opacity-70",
              ].join(" ")
            : "",
          readOnly
            ? "bg-[var(--surface-subtle)]"
            : "",
          sizeClasses[inputSize],
          containerClassName,
        ].join(" ")}
      >
        {startContent && (
          <span
            className={[
              "mr-3 flex shrink-0 items-center",
              "text-[var(--text-muted)]",
              "transition-colors duration-150",
              error
                ? "group-focus-within:text-[var(--danger)]"
                : "group-focus-within:text-[var(--primary)]",
            ].join(" ")}
          >
            {startContent}
          </span>
        )}

        <input
          ref={ref}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={error || undefined}
          className={[
            "h-full min-w-0 flex-1",
            "bg-transparent px-3",
            "text-[var(--text-primary)]",
            "outline-none",
            "placeholder:text-[var(--text-muted)]",
            "disabled:cursor-not-allowed",
            startContent ? "pr-1" : "",
            endContent ? "pl-1" : "",
            className,
          ].join(" ")}
          {...props}
        />

        {endContent && (
          <span className="ml-1 flex shrink-0 items-center">
            {endContent}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
export type { InputProps, InputSize };
export { default as Card } from "./Card";
export { default as FormSection } from "./FormSection";
export { default as PageHeader } from "./PageHeader";
export { default as Dialog } from "./Dialog";
export { default as ConfirmDialog } from "./ConfirmDialog";