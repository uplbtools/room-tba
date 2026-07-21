const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

/** Trap Tab within a dialog and restore focus on teardown. */
export function trapFocus(
  container: HTMLElement,
  options?: { onEscape?: () => void; initialFocus?: HTMLElement | null },
): () => void {
  const previous = document.activeElement;
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      options?.onEscape?.();
      return;
    }
    if (event.key !== "Tab") return;

    const items = focusableElements(container);
    if (items.length === 0) return;

    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !container.contains(active)) {
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

  container.addEventListener("keydown", handleKeydown);
  queueMicrotask(() => {
    (options?.initialFocus ?? focusableElements(container)[0])?.focus();
  });

  return () => {
    container.removeEventListener("keydown", handleKeydown);
    if (previous instanceof HTMLElement && document.contains(previous)) {
      previous.focus();
    }
  };
}
