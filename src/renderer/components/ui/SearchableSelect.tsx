import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
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
  keywords?: string | string[];
  disabled?: boolean;
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

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي");
}

function getKeywords(option: SearchableSelectOption) {
  if (!option.keywords) {
    return "";
  }

  return Array.isArray(option.keywords)
    ? option.keywords.join(" ")
    : option.keywords;
}

function getSearchScore(option: SearchableSelectOption, query: string) {
  if (!query) {
    return 0;
  }

  const label = normalizeSearchText(option.label);
  const keywords = normalizeSearchText(getKeywords(option));
  const combined = `${label} ${keywords}`.trim();

  if (label === query) return 0;
  if (label.startsWith(query)) return 1;
  if (label.split(/\s+/).some((word) => word.startsWith(query))) return 2;
  if (label.includes(query)) return 3;
  if (keywords.split(/\s+/).some((word) => word.startsWith(query))) return 4;
  if (combined.includes(query)) return 5;

  return Number.POSITIVE_INFINITY;
}

function isPrintableKey(event: ReactKeyboardEvent) {
  return (
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  );
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
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isComposingRef = useRef(false);
  const searchTermRef = useRef("");
  const autocompleteSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] =
    useState<DropdownPosition | null>(null);

  const triggerId = id ?? `searchable-select-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchTerm);

    if (!normalizedQuery) {
      return options;
    }

    return options
      .map((option, originalIndex) => ({
        option,
        originalIndex,
        score: getSearchScore(option, normalizedQuery),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => a.score - b.score || a.originalIndex - b.originalIndex)
      .map(({ option }) => option);
  }, [options, searchTerm]);

  const activeOption =
    activeIndex >= 0 ? filteredOptions[activeIndex] : undefined;

  const getOptionId = useCallback(
    (option: SearchableSelectOption) =>
      `${listboxId}-option-${encodeURIComponent(option.value)}`,
    [listboxId],
  );

  const findFirstEnabledIndex = useCallback(
    (items: SearchableSelectOption[]) =>
      items.findIndex((option) => !option.disabled),
    [],
  );

  const findLastEnabledIndex = useCallback(
    (items: SearchableSelectOption[]) => {
      for (let index = items.length - 1; index >= 0; index -= 1) {
        if (!items[index].disabled) {
          return index;
        }
      }

      return -1;
    },
    [],
  );

  const findNextEnabledIndex = useCallback(
    (
      items: SearchableSelectOption[],
      currentIndex: number,
      direction: 1 | -1,
    ) => {
      if (items.length === 0) {
        return -1;
      }

      let nextIndex = currentIndex;

      for (let step = 0; step < items.length; step += 1) {
        nextIndex += direction;

        if (nextIndex < 0) {
          nextIndex = items.length - 1;
        } else if (nextIndex >= items.length) {
          nextIndex = 0;
        }

        if (!items[nextIndex].disabled) {
          return nextIndex;
        }
      }

      return -1;
    },
    [],
  );

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

    const shouldOpenAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

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

  const closeDropdown = useCallback((restoreFocus = false) => {
    setOpen(false);
    setQuery("");
    setSearchTerm("");
    searchTermRef.current = "";
    autocompleteSelectionRef.current = null;
    setActiveIndex(-1);

    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  const openDropdown = useCallback(
    (initialQuery = "") => {
      if (disabled) {
        return;
      }

      setQuery(initialQuery);
      setSearchTerm(initialQuery);
      searchTermRef.current = initialQuery;
      setOpen(true);
    },
    [disabled],
  );

  const selectValue = useCallback(
    (option: SearchableSelectOption) => {
      if (option.disabled) {
        return;
      }

      onValueChange(option.value);
      closeDropdown(true);
    },
    [closeDropdown, onValueChange],
  );


  const applyInlineAutocomplete = useCallback(
    (typedValue: string) => {
      const normalizedTyped = normalizeSearchText(typedValue);

      setSearchTerm(typedValue);
      searchTermRef.current = typedValue;

      if (!normalizedTyped) {
        autocompleteSelectionRef.current = null;
        setQuery(typedValue);
        return;
      }

      const suggestion = options.find((option) => {
        if (option.disabled) {
          return false;
        }

        return normalizeSearchText(option.label).startsWith(normalizedTyped);
      });

      if (!suggestion || suggestion.label.length <= typedValue.length) {
        autocompleteSelectionRef.current = null;
        setQuery(typedValue);
        return;
      }

      setQuery(suggestion.label);
      autocompleteSelectionRef.current = {
        start: typedValue.length,
        end: suggestion.label.length,
      };

      window.requestAnimationFrame(() => {
        const input = searchInputRef.current;
        const selection = autocompleteSelectionRef.current;

        if (!input || !selection) {
          return;
        }

        input.setSelectionRange(selection.start, selection.end);
      });
    },
    [options],
  );

  const moveActive = useCallback(
    (direction: 1 | -1) => {
      setActiveIndex((currentIndex) => {
        if (filteredOptions.length === 0) {
          return -1;
        }

        if (currentIndex === -1) {
          return direction === 1
            ? findFirstEnabledIndex(filteredOptions)
            : findLastEnabledIndex(filteredOptions);
        }

        return findNextEnabledIndex(
          filteredOptions,
          currentIndex,
          direction,
        );
      });
    },
    [
      filteredOptions,
      findFirstEnabledIndex,
      findLastEnabledIndex,
      findNextEnabledIndex,
    ],
  );

  useEffect(() => {
    if (!open) {
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
    if (!open) {
      return;
    }

    const selectedIndex = filteredOptions.findIndex(
      (option) => option.value === value && !option.disabled,
    );

    if (!searchTerm && selectedIndex >= 0) {
      setActiveIndex(selectedIndex);
      return;
    }

    setActiveIndex(findFirstEnabledIndex(filteredOptions));
  }, [
    filteredOptions,
    findFirstEnabledIndex,
    open,
    searchTerm,
    value,
  ]);

  useEffect(() => {
    if (!open || !activeOption) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      optionRefs.current.get(activeOption.value)?.scrollIntoView({
        block: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeOption, open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      const clickedTrigger = rootRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);

      if (!clickedTrigger && !clickedDropdown) {
        closeDropdown(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeDropdown(true);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown, open]);

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        openDropdown();
        window.requestAnimationFrame(() => moveActive(1));
      } else {
        moveActive(1);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        openDropdown();
        window.requestAnimationFrame(() => moveActive(-1));
      } else {
        moveActive(-1);
      }
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(findFirstEnabledIndex(filteredOptions));
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(findLastEnabledIndex(filteredOptions));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (open) {
        const option =
          activeIndex >= 0 ? filteredOptions[activeIndex] : undefined;

        if (option && !option.disabled) {
          selectValue(option);
        }
      } else {
        openDropdown();
      }
      return;
    }

    if (event.key === " ") {
      if (!open) {
        event.preventDefault();
        openDropdown();
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      closeDropdown(true);
      return;
    }

    if (isPrintableKey(event)) {
      event.preventDefault();

      const nextSearchTerm = `${searchTermRef.current}${event.key}`;

      if (!open) {
        openDropdown(nextSearchTerm);
      }

      applyInlineAutocomplete(nextSearchTerm);

      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (isComposingRef.current || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      const input = event.currentTarget;
      const selectionStart = input.selectionStart ?? 0;
      const selectionEnd = input.selectionEnd ?? 0;

      if (selectionEnd > selectionStart) {
        event.preventDefault();
        const nextValue = query.slice(0, selectionStart);
        autocompleteSelectionRef.current = null;
        setQuery(nextValue);
        setSearchTerm(nextValue);
        searchTermRef.current = nextValue;

        window.requestAnimationFrame(() => {
          searchInputRef.current?.setSelectionRange(
            nextValue.length,
            nextValue.length,
          );
        });
        return;
      }
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(findFirstEnabledIndex(filteredOptions));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(findLastEnabledIndex(filteredOptions));
      return;
    }

    if (event.key === "Enter") {
      const option =
        activeIndex >= 0 ? filteredOptions[activeIndex] : undefined;

      if (option && !option.disabled) {
        event.preventDefault();
        selectValue(option);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDropdown(true);
      return;
    }

    if (event.key === "Tab") {
      closeDropdown(false);
    }
  }

  const dropdown =
    open && !disabled && dropdownPosition
      ? createPortal(
          <div
            ref={dropdownRef}
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
                  role="combobox"
                  aria-autocomplete="both"
                  aria-controls={listboxId}
                  aria-expanded={open}
                  aria-activedescendant={
                    activeOption ? getOptionId(activeOption) : undefined
                  }
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => {
                    const nextValue = event.target.value;

                    if (isComposingRef.current || (event.nativeEvent as InputEvent).isComposing) {
                      autocompleteSelectionRef.current = null;
                      setQuery(nextValue);
                      setSearchTerm(nextValue);
                      searchTermRef.current = nextValue;
                      return;
                    }

                    applyInlineAutocomplete(nextValue);
                  }}
                  onCompositionStart={() => {
                    isComposingRef.current = true;
                  }}
                  onCompositionEnd={(event) => {
                    isComposingRef.current = false;
                    applyInlineAutocomplete(event.currentTarget.value);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface-subtle)] pr-9 pl-3 text-right text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--focus-ring)]"
                />
              </div>
            </div>

            <div
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel ?? placeholder}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const selected = option.value === value;
                  const active = index === activeIndex;
                  const optionId = getOptionId(option);

                  return (
                    <button
                      key={option.value}
                      ref={(element) => {
                        if (element) {
                          optionRefs.current.set(option.value, element);
                        } else {
                          optionRefs.current.delete(option.value);
                        }
                      }}
                      id={optionId}
                      type="button"
                      role="option"
                      tabIndex={-1}
                      disabled={option.disabled}
                      aria-selected={selected}
                      aria-disabled={option.disabled || undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => {
                        if (!option.disabled) {
                          setActiveIndex(index);
                        }
                      }}
                      onClick={() => selectValue(option)}
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-right text-sm transition-colors",
                        option.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                        selected
                          ? "bg-[var(--primary-subtle)] font-bold text-[var(--primary)]"
                          : active
                            ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
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
          ref={triggerRef}
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-controls={open ? listboxId : undefined}
          aria-expanded={open}
          onClick={() => {
            if (open) {
              closeDropdown(false);
            } else {
              openDropdown();
            }
          }}
          onKeyDown={handleTriggerKeyDown}
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
