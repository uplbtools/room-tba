<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { Snippet } from "svelte";
  import { pageScrollTarget, scrollEdges } from "@lib/h-scroll";

  /**
   * The place sheet's sideways row of secondary pills (Save, Share, 3D view,
   * Google Maps…). Each edge fades only while more pills hide past it; with a
   * mouse, a chevron over that edge pages the row (touch keeps swipe + fade).
   * Same edge logic as the map filter chips (lib/h-scroll).
   */
  let { children }: { children: Snippet } = $props();

  /** Width of the faded edge (2rem), so a page lands clear of it. */
  const EDGE_PX = 32;

  let scroller = $state<HTMLDivElement | null>(null);
  let canBack = $state(false);
  let canMore = $state(false);

  function sync() {
    if (!scroller) return;
    const edges = scrollEdges(scroller);
    canBack = edges.back;
    canMore = edges.more;
  }

  $effect(() => {
    const el = scroller;
    if (!el) return;
    sync();
    // Pills come and go (editor toggle, save state), so watch them too.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    const mo = new MutationObserver(sync);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener("scroll", sync, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("scroll", sync);
    };
  });

  function page(direction: 1 | -1) {
    const el = scroller;
    if (!el) return;
    el.scrollTo({
      left: pageScrollTarget(
        el,
        [...el.children] as HTMLElement[],
        direction,
        EDGE_PX,
      ),
      behavior: "smooth",
    });
  }
</script>

<div class="entity-action-scroll">
  <div
    bind:this={scroller}
    class="entity-actions__scroll"
    class:entity-actions__scroll--fade-start={canBack}
    class:entity-actions__scroll--fade-end={canMore}
  >
    {@render children()}
  </div>
  <!-- Mouse aids only: keyboard focus already scrolls each pill into view,
       so the chevrons stay out of the tab order. -->
  {#if canBack}
    <button
      type="button"
      class="entity-action-scroll__chevron entity-action-scroll__chevron--back"
      aria-label="Scroll actions left"
      tabindex="-1"
      onclick={() => page(-1)}
    >
      <ChevronLeft size={16} aria-hidden="true" />
    </button>
  {/if}
  {#if canMore}
    <button
      type="button"
      class="entity-action-scroll__chevron entity-action-scroll__chevron--more"
      aria-label="Scroll actions right"
      tabindex="-1"
      onclick={() => page(1)}
    >
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  {/if}
</div>

<style>
  .entity-action-scroll {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
  }

  .entity-actions__scroll {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    /* Room for focus rings inside the scroller's clip box. */
    padding: 0.125rem;
    margin: -0.125rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .entity-actions__scroll::-webkit-scrollbar {
    display: none;
  }

  /* Fade only the edge that hides more pills, so a cut-off pill reads as
     "more this way" and a fully visible row is not dimmed for nothing. */
  .entity-actions__scroll--fade-start,
  .entity-actions__scroll--fade-end {
    --fade-start: 0px;
    --fade-end: 0px;
    mask-image: linear-gradient(
      to right,
      transparent 0,
      #000 var(--fade-start),
      #000 calc(100% - var(--fade-end)),
      transparent 100%
    );
  }

  .entity-actions__scroll--fade-start {
    --fade-start: 2rem;
  }

  .entity-actions__scroll--fade-end {
    --fade-end: 2rem;
  }

  .entity-actions__scroll > :global(*) {
    flex-shrink: 0;
  }

  .entity-actions__scroll :global(.map-chrome-action-chip),
  .entity-actions__scroll :global(.editor-toggle--toolbar) {
    border-radius: 999px;
  }

  .entity-action-scroll__chevron {
    position: absolute;
    top: 50%;
    z-index: 1;
    display: none;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    margin: 0;
    padding: 0;
    transform: translateY(-50%);
    border: 1px solid var(--theme-border, #e4e4e7);
    border-radius: 50%;
    background: var(--theme-surface, #fff);
    color: var(--theme-text, #3f3f46);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.18);
    cursor: pointer;
  }

  .entity-action-scroll__chevron--back {
    left: -0.25rem;
  }

  .entity-action-scroll__chevron--more {
    right: -0.25rem;
  }

  .entity-action-scroll__chevron:hover {
    border-color: var(--theme-accent-border, #c58f91);
    background: var(--theme-accent-soft, #fdf3f3);
  }

  /* Touch keeps swipe + fade; a mouse has no swipe, so it gets chevrons. */
  @media (hover: hover) and (pointer: fine) {
    .entity-action-scroll__chevron {
      display: inline-flex;
    }
  }
</style>
