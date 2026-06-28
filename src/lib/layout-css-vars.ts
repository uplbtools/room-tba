/** Batch layout height reads/writes to one frame and skip unchanged values. */
export function observeBlockHeight(
  el: HTMLElement,
  cssVar: string,
  options?: {
    root?: HTMLElement | null;
    shouldSkip?: () => boolean;
    skipValue?: string;
    onSync?: (heightPx: string, root: HTMLElement) => void;
  },
): () => void {
  const root =
    options?.root ?? (el.closest(".app-layout") as HTMLElement | null);
  if (!root) return () => {};

  let rafId = 0;
  let lastWritten = "";

  const sync = () => {
    rafId = 0;
    if (options?.shouldSkip?.()) {
      const skip = options.skipValue ?? "0px";
      if (lastWritten === skip) return;
      lastWritten = skip;
      root.style.setProperty(cssVar, skip);
      options?.onSync?.(skip, root);
      return;
    }

    const height = `${Math.round(el.getBoundingClientRect().height)}px`;
    if (height === lastWritten) return;
    lastWritten = height;
    root.style.setProperty(cssVar, height);
    options?.onSync?.(height, root);
  };

  const schedule = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(sync);
  };

  sync();
  const observer = new ResizeObserver(schedule);
  observer.observe(el);

  return () => {
    observer.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/** Same as observeBlockHeight but writes element width (e.g. FAB column inset). */
export function observeBlockWidth(
  el: HTMLElement,
  cssVar: string,
  options?: {
    root?: HTMLElement | null;
    shouldSkip?: () => boolean;
    skipValue?: string;
    onSync?: (widthPx: string, root: HTMLElement) => void;
  },
): () => void {
  const root =
    options?.root ?? (el.closest(".app-layout") as HTMLElement | null);
  if (!root) return () => {};

  let rafId = 0;
  let lastWritten = "";

  const sync = () => {
    rafId = 0;
    if (options?.shouldSkip?.()) {
      const skip = options.skipValue ?? "0px";
      if (lastWritten === skip) return;
      lastWritten = skip;
      root.style.setProperty(cssVar, skip);
      options?.onSync?.(skip, root);
      return;
    }

    const width = `${Math.round(el.getBoundingClientRect().width)}px`;
    if (width === lastWritten) return;
    lastWritten = width;
    root.style.setProperty(cssVar, width);
    options?.onSync?.(width, root);
  };

  const schedule = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(sync);
  };

  sync();
  const observer = new ResizeObserver(schedule);
  observer.observe(el);

  return () => {
    observer.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/** rAF-throttle a layout-sensitive callback (e.g. popover reposition). */
export function rafThrottle<T extends (...args: never[]) => void>(
  fn: T,
): (...args: Parameters<T>) => void {
  let rafId = 0;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (lastArgs) fn(...lastArgs);
    });
  };
}
