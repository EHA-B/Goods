import { useEffect } from "react";

/**
 * Selector covering every focusable form element (input, select, textarea, and
 * SearchableSelect trigger buttons).  Read-only and disabled elements are
 * excluded so focus skips them naturally.
 */
const FOCUSABLE_SELECTOR = [
  "input:not([disabled]):not([readonly]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled]):not([readonly])",
  "button[aria-haspopup='listbox']:not([disabled])",
].join(", ");

/**
 * Collect every visible, focusable form field on the page in DOM order.
 * Elements inside `<dialog>` or hidden containers are filtered out via
 * `offsetParent` check.
 */
function getFocusableFields(): HTMLElement[] {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );

  return elements.filter((el) => {
    // Skip elements that are not visible (e.g. inside closed dialogs).
    // offsetParent is null for hidden elements — except for fixed-position
    // elements, so also check getComputedStyle as a fallback.
    if (
      el.offsetParent === null &&
      getComputedStyle(el).position !== "fixed"
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Custom hook that enables Left/Right arrow key navigation between form fields.
 *
 * - **Right Arrow** → moves focus to the **next** field (visually "right" in RTL,
 *   which is the *previous* element in DOM order).
 * - **Left Arrow**  → moves focus to the **previous** field (visually "left" in
 *   RTL, which is the *next* element in DOM order).
 *
 * Navigation only fires when the caret is at the very start or end of the
 * current input value (for text inputs), so normal cursor movement inside a
 * field is never disrupted.
 *
 * The hook is designed to work in an RTL (Arabic) layout where the DOM order
 * goes right‑to‑left visually.
 */
export default function useArrowFieldNavigation() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const target = e.target as HTMLElement;
      const tag = target.tagName;

      // Only act when an INPUT, SELECT, TEXTAREA, or our SearchableSelect
      // button is focused.
      const isInput = tag === "INPUT" || tag === "TEXTAREA";
      const isSelect = tag === "SELECT";
      const isSearchableButton =
        tag === "BUTTON" &&
        target.getAttribute("aria-haspopup") === "listbox";

      if (!isInput && !isSelect && !isSearchableButton) return;

      // For text-based inputs, only navigate if the caret is at the edge of
      // the value so normal text editing isn't broken.
      if (isInput) {
        const input = target as HTMLInputElement | HTMLTextAreaElement;
        const type = (input as HTMLInputElement).type;

        // Number / date / time inputs have no selectable text range — always
        // allow navigation since arrow keys don't move a cursor in them.
        const isTextLike =
          type === "text" ||
          type === "search" ||
          type === "url" ||
          type === "tel" ||
          type === "email" ||
          type === "password" ||
          tag === "TEXTAREA";

        if (isTextLike) {
          const len = input.value.length;
          const start = input.selectionStart ?? 0;
          const end = input.selectionEnd ?? 0;

          // If there's a selection range, let the browser handle it.
          if (start !== end) return;

          // ArrowRight in a text field: only navigate if caret is at the end
          // (in RTL, ArrowRight goes visually right → previous field).
          if (e.key === "ArrowRight" && start !== 0) return;

          // ArrowLeft: only navigate if caret is at position 0.
          if (e.key === "ArrowLeft" && start !== len) return;
        }
      }

      const fields = getFocusableFields();
      const currentIndex = fields.indexOf(target as HTMLElement);
      if (currentIndex === -1) return;

      // In an RTL layout, DOM order is right-to-left visually.
      // ArrowRight → previous field in DOM (visually to the right).
      // ArrowLeft  → next field in DOM (visually to the left).
      let nextIndex: number;
      if (e.key === "ArrowRight") {
        nextIndex = currentIndex - 1;
      } else {
        nextIndex = currentIndex + 1;
      }

      // Wrap around at boundaries
      if (nextIndex < 0) nextIndex = fields.length - 1;
      if (nextIndex >= fields.length) nextIndex = 0;

      e.preventDefault();
      const nextField = fields[nextIndex];
      nextField.focus();

      // For text inputs, select all text so the user can immediately type to
      // replace or press arrow again to continue navigating.
      if (
        nextField.tagName === "INPUT" ||
        nextField.tagName === "TEXTAREA"
      ) {
        const inp = nextField as HTMLInputElement;
        // select() is not supported on date/time inputs in some browsers
        try {
          inp.select();
        } catch {
          // ignore
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
