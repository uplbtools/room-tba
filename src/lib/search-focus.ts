let focusSearchInput: (() => void) | null = null;

export function registerSearchFocus(handler: () => void) {
  focusSearchInput = handler;
  return () => {
    if (focusSearchInput === handler) focusSearchInput = null;
  };
}

export function focusSearch() {
  focusSearchInput?.();
}
