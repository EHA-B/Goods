import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Search,
} from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

type Props = {
  id?: string;
  value: string;
  options: SearchableSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  ariaLabel?: string;
};

type DropdownPosition = {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
};

const DROPDOWN_MIN_WIDTH = 260;
const DROPDOWN_GAP = 6;
const VIEWPORT_MARGIN = 8;
const DROPDOWN_MAX_HEIGHT = 330;

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("ar");
}

export default function SearchableSelect({
  id,
  value,
  options,
  onValueChange,
  placeholder = "اختر من القائمة",
  searchPlaceholder = "ابحث...",
  emptyMessage = "لا توجد نتائج مطابقة",
  disabled = false,
  error = false,
  className = "",
  ariaLabel,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      normalizeSearchText(
        `${option.label} ${option.keywords ?? ""}`,
      ).includes(normalizedQuery),
    );
  }, [options, query]);

  const updateDropdownPosition = useCallback(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const width = Math.min(
      Math.max(rect.width, DROPDOWN_MIN_WIDTH),
      Math.max(0, viewportWidth - VIEWPORT_MARGIN * 2),
    );

    // Keep the dropdown aligned with the right edge of the trigger in RTL,
    // but clamp it so it never leaves the visible viewport.
    const desiredLeft = rect.right - width;
    const left = Math.min(
      Math.max(desiredLeft, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
    );

    const spaceBelow =
      viewportHeight - rect.bottom - DROPDOWN_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - DROPDOWN_GAP - VIEWPORT_MARGIN;

    const shouldOpenAbove =
      spaceBelow < 220 && spaceAbove > spaceBelow;

    const availableSpace = shouldOpenAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(
      140,
      Math.min(DROPDOWN_MAX_HEIGHT, availableSpace),
    );

    if (shouldOpenAbove) {
      setDropdownPosition({
        left,
        bottom: viewportHeight - rect.top + DROPDOWN_GAP,
        width,
        maxHeight,
        placement: "top",
      });
      return;
    }

    setDropdownPosition({
      left,
      top: rect.bottom + DROPDOWN_GAP,
      width,
      maxHeight,
      placement: "bottom",
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setDropdownPosition(null);
      return;
    }

    updateDropdownPosition();

    const frame = window.requestAnimationFrame(() => {
      updateDropdownPosition();
      searchInputRef.current?.focus();
    });

    const handleViewportChange = () => {
      updateDropdownPosition();
    };

    // Capture scroll events as well, because a parent container may scroll.
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(handleViewportChange)
        : null;

    if (rootRef.current) {
      resizeObserver?.observe(rootRef.current);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      resizeObserver?.disconnect();
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      const clickedTrigger = rootRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);

      if (!clickedTrigger && !clickedDropdown) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current
          ?.querySelector<HTMLButtonElement>("button")
          ?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function selectValue(nextValue: string) {
    onValueChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  const dropdown =
    open && !disabled && dropdownPosition
      ? createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            dir="rtl"
            style={{
              position: "fixed",
              left: dropdownPosition.left,
              top: dropdownPosition.top,
              bottom: dropdownPosition.bottom,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
              zIndex: 11000,
            }}
            className="flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
            data-placement={dropdownPosition.placement}
          >
            <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] p-2">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />

                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      filteredOptions.length === 1
                    ) {
                      event.preventDefault();
                      selectValue(filteredOptions[0].value);
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-subtle)] pr-9 pl-3 text-right text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const selected = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectValue(option.value)}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-right text-sm transition-colors",
                        selected
                          ? "bg-[var(--primary-subtle)] font-bold text-[var(--primary)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]",
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>

                      {selected && (
                        <Check size={16} className="shrink-0" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className={["relative", className].join(" ")}
      >
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={[
            "flex h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border bg-[var(--surface)] px-3 text-right outline-none",
            "transition-[border-color,box-shadow,background-color] duration-150",
            error
              ? "border-[var(--danger)]"
              : "border-[var(--border-strong)] hover:border-[var(--text-muted)] focus:border-[var(--primary)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer",
          ].join(" ")}
        >
          <span
            className={[
              "min-w-0 flex-1 truncate",
              selectedOption
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)]",
            ].join(" ")}
          >
            {selectedOption?.label ?? placeholder}
          </span>

          <ChevronDown
            size={18}
            className={[
              "shrink-0 text-[var(--text-muted)] transition-transform duration-150",
              open ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>
      </div>

      {dropdown}
    </>
  );
}
