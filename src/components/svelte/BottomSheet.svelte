<script lang="ts">
  import type { Snippet } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import {
    LANDSCAPE_COMPACT_MEDIA,
    neighbourSnap,
    resolveBottomSheetRelease,
    resolveSnapRelease,
    sheetTranslateY,
    snapHeight,
    type BottomSheetSnap,
    type SnapHeights,
  } from "@lib/bottom-sheet-snap";
  import { sidePanelStore } from "@lib/store.svelte";

  let {
    open = false,
    snap = $bindable<BottomSheetSnap>("peek"),
    peekRatio = 0.48,
    halfRatio,
    peekFitTo,
    expandedRatio = 0.92,
    topInset = "0px",
    bottomInset = "0px",
    scrollResetKey,
    onDismiss,
    children,
  }: {
    open?: boolean;
    snap?: BottomSheetSnap;
    /** Fraction of the available height used for peek (0–1). */
    peekRatio?: number;
    /**
     * Fraction for a middle stop between peek and expanded (GMaps' half
     * sheet). Left out, the sheet has two stops. The stop is dropped when it
     * would sit within a thumb of peek or expanded (a tall peek on a short
     * screen).
     */
    halfRatio?: number;
    /**
     * Selector inside the content (e.g. ".entity-actions"). When present,
     * peek ends just below it instead of at peekRatio, never taller than
     * peekRatio and never under PEEK_FIT_MIN_RATIO: on a tall phone a fixed
     * ratio covered a third of the map with photo and body text nobody had
     * scrolled to yet.
     */
    peekFitTo?: string;
    /** Fraction used when expanded — leave a map strip for tap-to-collapse. */
    expandedRatio?: number;
    topInset?: string;
    bottomInset?: string;
    /**
     * Scroll the body back to the top whenever this changes (another entity
     * opened): a room opened from a long building sheet must start at its
     * own name, not at the parent's scroll offset.
     */
    scrollResetKey?: unknown;
    onDismiss?: () => void;
    children: Snippet;
  } = $props();

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  /** Phone landscape: a full-height left side panel, no snaps or dragging. */
  const sidePanel = new MediaQuery(LANDSCAPE_COMPACT_MEDIA);

  const DRAG_THRESHOLD = 6;
  const FOLLOW_THRESHOLD = 40;
  const DISMISS_THRESHOLD = 80;
  const FLICK_VELOCITY = 0.55;

  let rootEl = $state<HTMLElement | null>(null);
  let sheetEl = $state<HTMLElement | null>(null);
  let contentEl = $state<HTMLElement | null>(null);

  let availableH = $state(0);
  let dragStartY: number | null = null;
  let dragStartTime = 0;
  let dragMoved = false;
  let dragFromHandle = false;
  let dragOffset = $state(0);

  /** Content offset (px from the sheet top) where a fitted peek should end. */
  let peekFitPx = $state<number | null>(null);
  const PEEK_FIT_MIN_RATIO = 0.25;
  const PEEK_FIT_GAP_PX = 12;
  const peekH = $derived(
    Math.round(
      peekFitPx === null
        ? availableH * peekRatio
        : Math.min(
            availableH * peekRatio,
            Math.max(availableH * PEEK_FIT_MIN_RATIO, peekFitPx),
          ),
    ),
  );
  const expandedH = $derived(Math.round(availableH * expandedRatio));
  const HALF_MIN_GAP_PX = 64;
  const halfH = $derived.by(() => {
    if (halfRatio === undefined || sidePanel.current) return undefined;
    const h = Math.round(availableH * halfRatio);
    return h - peekH >= HALF_MIN_GAP_PX && expandedH - h >= HALF_MIN_GAP_PX
      ? h
      : undefined;
  });
  const heights = $derived<SnapHeights>({
    peek: peekH,
    half: halfH,
    expanded: expandedH,
  });
  const visibleH = $derived(snapHeight(snap, heights));

  // The middle stop can vanish (rotation, keyboard): fall back to peek.
  $effect(() => {
    if (snap === "half" && halfH === undefined) snap = "peek";
  });
  const baseTranslate = $derived(sheetTranslateY(visibleH, availableH));
  const liveTranslate = $derived(
    Math.min(
      availableH,
      Math.max(0, baseTranslate + dragOffset),
    ),
  );
  const isDragging = $derived(dragStartY !== null && dragMoved);

  function measure() {
    const el = rootEl;
    if (!el) return;
    availableH = Math.max(0, Math.round(el.getBoundingClientRect().height));
  }

  $effect(() => {
    if (!open) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    if (rootEl) ro.observe(rootEl);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  });

  function measurePeekFit() {
    const target =
      peekFitTo && contentEl
        ? contentEl.querySelector<HTMLElement>(peekFitTo)
        : null;
    if (!target || !sheetEl || !contentEl) {
      peekFitPx = null;
      return;
    }
    // Rects move together with the sheet's translate, so the difference is
    // the target's position in the sheet whatever the current snap.
    const bottom =
      target.getBoundingClientRect().bottom -
      sheetEl.getBoundingClientRect().top +
      contentEl.scrollTop;
    peekFitPx = bottom > 0 ? Math.ceil(bottom + PEEK_FIT_GAP_PX) : null;
  }

  // Re-fit whenever the content changes (another place opened, photos or
  // actions loaded in).
  $effect(() => {
    if (!open || !peekFitTo || !contentEl) {
      peekFitPx = null;
      return;
    }
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measurePeekFit);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(contentEl, { childList: true, subtree: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(contentEl);
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      ro.disconnect();
    };
  });

  $effect(() => {
    void scrollResetKey;
    if (contentEl) contentEl.scrollTop = 0;
  });

  $effect(() => {
    if (open) return;
    dragStartY = null;
    dragMoved = false;
    dragOffset = 0;
  });

  function contentScrollTop(): number {
    return contentEl?.scrollTop ?? 0;
  }

  function shouldIgnoreDragTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return true;
    if (target.closest(".bottom-sheet__handle")) return false;
    return Boolean(
      // summary: native <details> disclosures (editor "More fields",
      // calendar term cards) toggle on click; capturing the pointer for a
      // sheet drag swallowed those taps entirely on mobile.
      target.closest(
        "button, a, input, textarea, select, label, summary, [role='button']",
      ),
    );
  }

  function beginDrag(event: PointerEvent, fromHandle: boolean) {
    if (!open || sidePanel.current) return;
    dragStartY = event.clientY;
    dragStartTime = performance.now();
    dragMoved = false;
    dragFromHandle = fromHandle;
    dragOffset = 0;
    sheetEl?.setPointerCapture?.(event.pointerId);
  }

  function onHandlePointerDown(event: PointerEvent) {
    event.stopPropagation();
    beginDrag(event, true);
  }

  function onSheetPointerDown(event: PointerEvent) {
    if (shouldIgnoreDragTarget(event.target)) return;
    beginDrag(event, false);
  }

  function onSheetPointerMove(event: PointerEvent) {
    if (dragStartY === null) return;
    const delta = event.clientY - dragStartY;
    if (Math.abs(delta) > DRAG_THRESHOLD) dragMoved = true;
    if (!dragMoved) return;

    if (
      !dragFromHandle &&
      snap === "expanded" &&
      contentScrollTop() > 0
    ) {
      dragStartY = null;
      dragMoved = false;
      dragOffset = 0;
      return;
    }

    dragOffset = delta;
  }

  function onSheetPointerUp(event: PointerEvent) {
    if (dragStartY === null) return;
    const elapsed = performance.now() - dragStartTime;
    const delta = event.clientY - dragStartY;
    const velocity = Math.abs(delta) / Math.max(elapsed, 1);
    const moved = dragMoved;
    const fromHandle = dragFromHandle;

    dragStartY = null;
    dragFromHandle = false;
    dragOffset = 0;

    if (!moved) {
      // setPointerCapture retargets the pointerup to the sheet, so the
      // browser never delivers a click to the handle button. Treat a
      // no-move press on the handle as the tap it is, or the handle can
      // only be dragged, never tapped.
      if (fromHandle) {
        cycleSnap();
        pointerToggledAt = performance.now();
      }
      return;
    }

    if (halfH !== undefined) {
      const next = resolveSnapRelease({
        delta,
        velocity,
        snap,
        heights,
        followThreshold: FOLLOW_THRESHOLD,
        dismissThreshold: DISMISS_THRESHOLD,
        flickVelocity: FLICK_VELOCITY,
      });
      if (next === "dismiss") onDismiss?.();
      else if (next !== "none") snap = next;
      return;
    }

    const intent = resolveBottomSheetRelease({
      delta,
      velocity,
      snap,
      followThreshold: FOLLOW_THRESHOLD,
      dismissThreshold: DISMISS_THRESHOLD,
      flickVelocity: FLICK_VELOCITY,
    });

    if (intent === "expand") snap = "expanded";
    else if (intent === "peek") snap = "peek";
    else if (intent === "dismiss") onDismiss?.();
  }

  function onSheetPointerCancel() {
    dragStartY = null;
    dragMoved = false;
    dragFromHandle = false;
    dragOffset = 0;
  }

  // Keyboard activation (Enter/Space) still arrives as a click; a pointer
  // tap was already handled in onSheetPointerUp, so swallow its echo.
  let pointerToggledAt = 0;
  function onHandleClick() {
    if (performance.now() - pointerToggledAt < 400) return;
    if (dragMoved) {
      dragMoved = false;
      return;
    }
    cycleSnap();
  }

  /** Handle tap: up one stop, and from the top back down to peek. */
  function cycleSnap() {
    snap = neighbourSnap(snap, 1, heights) ?? "peek";
  }

  const transitionMs = $derived(reducedMotion.current ? 0 : 320);

  // Publish where the sheet's top edge rests so map controls can sit just
  // above it (Entry's locate button at peek). The resting snap, not the live
  // drag: controls should not chase the finger.
  $effect(() => {
    if (!open || !rootEl || availableH === 0) return;
    const top = rootEl.getBoundingClientRect().top + baseTranslate;
    const root = document.documentElement;
    root.style.setProperty("--bottom-sheet-top", `${Math.round(top)}px`);
    sidePanelStore.setMobileSheetTop(Math.round(top));
    return () => {
      root.style.removeProperty("--bottom-sheet-top");
      sidePanelStore.setMobileSheetTop(0);
    };
  });
</script>

{#if open}
  <div
    class="bottom-sheet-root"
    class:bottom-sheet-root--side={sidePanel.current}
    bind:this={rootEl}
    style:--bs-top={topInset}
    style:--bs-bottom={bottomInset}
    style:--bs-duration="{transitionMs}ms"
  >
    <!-- No scrim: the map strip above the sheet stays live, so panning,
         pinching and tapping pins keep working while details are open (GMaps).
         Dismissal is the drag-down past peek plus the search bar's
         "Close details" button. -->

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="bottom-sheet"
      class:bottom-sheet--dragging={isDragging}
      bind:this={sheetEl}
      style:transform={sidePanel.current
        ? undefined
        : `translate3d(0, ${liveTranslate}px, 0)`}
      style:height={sidePanel.current ? undefined : `${availableH || 0}px`}
      onpointerdown={onSheetPointerDown}
      onpointermove={onSheetPointerMove}
      onpointerup={onSheetPointerUp}
      onpointercancel={onSheetPointerCancel}
      onlostpointercapture={onSheetPointerCancel}
    >
      {#if !sidePanel.current}
      <button
        type="button"
        class="bottom-sheet__handle"
        aria-label={snap === "expanded" ? "Collapse details" : "Expand details"}
        aria-expanded={snap !== "peek"}
        onclick={onHandleClick}
        onpointerdown={onHandlePointerDown}
      >
        <span class="bottom-sheet__grab" aria-hidden="true"></span>
      </button>
      {/if}

      <div class="bottom-sheet__body" bind:this={contentEl}>
        {@render children()}
      </div>
    </div>
  </div>
{/if}

<style>
  .bottom-sheet-root {
    /* Full width, no side gutter. The bottom is the caller's bottomInset:
       place sheets stop above the bottom nav so Map, Planner, Today and You
       stay reachable. */
    position: fixed;
    top: var(--bs-top, 0px);
    right: 0;
    bottom: var(--bs-bottom, 0px);
    left: 0;
    /* Above map-tools + bottom nav so locate/3D/zoom never paint over it. */
    z-index: var(--z-mobile-sheet, 16);
    pointer-events: none;
    /* The sheet is full height and translated down to its snap; with a
       bottom inset (browse lists stop above the bottom nav) the translated
       part must not paint over what sits below. Top stays open for the
       shadow. */
    clip-path: inset(-2rem 0 0 0);
  }

  .bottom-sheet {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    border: 1px solid var(--map-chrome-border, var(--theme-border-strong, hsl(5 10% 68%)));
    border-bottom: none;
    /* Grounded: round only the top; flush to the screen bottom edge. */
    border-radius: 1.25rem 1.25rem 0 0;
    background: var(--theme-surface, #fff);
    /* An upward shadow so the sheet's top edge reads as a surface lifted over
       the map, not a line cut through it. */
    box-shadow:
      0 -4px 16px rgb(0 0 0 / 0.22),
      var(--shadow-results, 0 2px 6px rgb(36 37 46 / 0.2));
    pointer-events: auto;
    touch-action: none;
    will-change: transform;
    transition: transform var(--bs-duration, 320ms)
      var(--motion-ease-out, cubic-bezier(0.22, 1, 0.36, 1));
  }

  .bottom-sheet--dragging {
    transition: none;
  }

  .bottom-sheet__handle {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 1.75rem;
    margin: 0;
    padding: 0.5rem 0 0.25rem;
    border: none;
    background: transparent;
    cursor: grab;
    touch-action: none;
  }

  .bottom-sheet__handle:active {
    cursor: grabbing;
  }

  /* A grabber you can see on both themes: the old surface-3 fill was within
     1.2:1 of the sheet in dark mode. */
  .bottom-sheet__grab {
    display: block;
    width: 2.5rem;
    height: 0.3125rem;
    border-radius: 999px;
    background: var(--theme-border-strong, #8e8e93);
  }

  .bottom-sheet__handle:hover .bottom-sheet__grab,
  .bottom-sheet__handle:focus-visible .bottom-sheet__grab {
    background: var(--theme-text-2, #52525b);
  }

  .bottom-sheet__handle:focus-visible {
    outline: 2px solid var(--theme-accent-text, #7b1113);
    outline-offset: -2px;
    border-radius: 1rem 1rem 0 0;
  }

  .bottom-sheet__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: clip;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0
      max(
        var(--map-search-inline-pad, 0.625rem),
        env(safe-area-inset-right, 0px)
      )
      max(1rem, env(safe-area-inset-bottom, 0px))
      max(
        var(--map-search-inline-pad, 0.625rem),
        env(safe-area-inset-left, 0px)
      );
    -webkit-overflow-scrolling: touch;
  }

  /* Keep "1–12 of 13" pinned to the visible sheet bottom while scrolling. */
  .bottom-sheet__body :global(.entity-pagination) {
    position: sticky;
    bottom: 0;
    z-index: 3;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    border-top: 1px solid var(--theme-border, #ececec);
    background: var(--theme-surface, #fff);
  }

  @media (prefers-reduced-motion: reduce) {
    .bottom-sheet {
      transition: none;
    }
  }

  /* Phone landscape: left side panel from under the search bar, sized to its
     content and never past the (icon-only) bottom nav, so the nav never
     covers route cards or the navigation ETA, and the map stays visible to
     the right. The width is repeated by DirectionsRouteChips. */
  .bottom-sheet-root--side {
    right: auto;
    bottom: var(--mobile-bottom-nav-height, 2.75rem);
    left: max(0.375rem, env(safe-area-inset-left, 0px));
    width: min(24rem, 52vw);
    clip-path: none;
  }

  .bottom-sheet-root--side .bottom-sheet {
    top: 0;
    bottom: auto;
    height: auto;
    max-height: calc(100% - 0.375rem);
    padding-top: 0.5rem;
    border-bottom: 1px solid
      var(--map-chrome-border, var(--theme-border-strong, hsl(5 10% 68%)));
    border-radius: var(--map-chrome-radius, 1rem);
    touch-action: auto;
    transition: none;
  }
</style>
