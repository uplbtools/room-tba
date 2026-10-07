const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** False inside a collapsed <details> (its summary excepted) or when hidden. */
function isRendered(el: HTMLElement): boolean {
  const closed = el.closest("details:not([open])");
  if (closed && !(el.tagName === "SUMMARY" && el.parentElement === closed)) {
    return false;
  }
  return typeof el.checkVisibility === "function" ? el.checkVisibility() : true;
}

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) =>
      !el.hasAttribute("disabled") && el.tabIndex !== -1 && isRendered(el),
  );
}

/** Innermost trap wins when several are open (menu under a modal, etc.). */
const activeTraps: symbol[] = [];

/**
 * Trap Tab within a dialog and restore focus on teardown.
 *
 * Listens on `document`, not the container: openers like the app menu
 * restore focus to their trigger when they close, so the first Escape after
 * "menu → Settings" used to land outside the dialog and never reach a
 * container-scoped listener — the modal looked un-closable.
 */
export function trapFocus(
  container: HTMLElement,
  options?: { onEscape?: () => void; initialFocus?: HTMLElement | null },
): () => void {
  const previous = document.activeElement;
  const trapId = Symbol("focus-trap");
  activeTraps.push(trapId);
  const isInnermost = () => activeTraps[activeTraps.length - 1] === trapId;

  const handleKeydown = (event: KeyboardEvent) => {
    if (!isInnermost()) return;
    if (event.key === "Escape") {
      options?.onEscape?.();
      event.stopPropagation();
      return;
    }
    if (event.key !== "Tab") return;

    const items = focusableElements(container);
    if (items.length === 0) return;

    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (!container.contains(active) || active === container) {
      // Focus escaped, never arrived, or sits on the dialog itself
      // (initialFocus: container): pull the next Tab onto an item.
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
      return;
    }

    if (event.shiftKey) {
      if (active === first) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener("keydown", handleKeydown, true);
  queueMicrotask(() => {
    (options?.initialFocus ?? focusableElements(container)[0])?.focus();
  });

  return () => {
    const index = activeTraps.indexOf(trapId);
    if (index !== -1) activeTraps.splice(index, 1);
    document.removeEventListener("keydown", handleKeydown, true);
    if (previous instanceof HTMLElement && document.contains(previous)) {
      previous.focus();
    }
  };
}
