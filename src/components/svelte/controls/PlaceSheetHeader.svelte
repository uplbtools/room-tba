<script lang="ts">
  import type { Snippet } from "svelte";
  import EntityPanelClose from "./EntityPanelClose.svelte";

  /**
   * The header every place sheet shares (building, dorm, place, room), shaped
   * like Google Maps' peek: name with the one close X, a plain-text category
   * and a one-line facts row, then Directions plus the sideways action row.
   * Sticky, so name and Directions stay put while the body scrolls.
   */
  type Props = {
    title: string;
    /** Inline after the name (a dorm's short name). */
    titleSuffix?: Snippet;
    /** Category as plain text, never a pill: it is not tappable. */
    label?: string | null;
    labelTone?: "accent" | "green";
    /** One line of facts, "42 rooms, 3 classes now". */
    facts?: string | null;
    /** Longer name or context under the title (a room's full name). */
    context?: string | null;
    closeLabel: string;
    /** Directions pill, then the scrolling pills (EntityActionScroll). */
    children: Snippet;
  };

  let {
    title,
    titleSuffix,
    label = null,
    labelTone = "accent",
    facts = null,
    context = null,
    closeLabel,
    children,
  } = $props();

  // Once the body has scrolled, the header shrinks to name + actions: the
  // category and facts lines already did their job at peek, and the pinned
  // part should not eat a third of a full sheet.
  let headerEl = $state<HTMLElement | null>(null);
  let stuck = $state(false);
  $effect(() => {
    const scroller = headerEl?.closest<HTMLElement>(
      ".bottom-sheet__body, .side-panel-details",
    );
    if (!scroller) return;
    const sync = () => {
      // Hysteresis: shrinking moves content up, which must not unstick it.
      stuck = scroller.scrollTop > (stuck ? 2 : 12);
    };
    sync();
    scroller.addEventListener("scroll", sync, { passive: true });
    return () => scroller.removeEventListener("scroll", sync);
  });
</script>

<header
  class="place-sheet-header"
  class:place-sheet-header--stuck={stuck}
  bind:this={headerEl}
>
  <div class="place-sheet-header__title-row">
    <h2 class="place-sheet-header__title">
      {title}
      {@render titleSuffix?.()}
    </h2>
    <EntityPanelClose ariaLabel={closeLabel} showOnMobile />
  </div>
  {#if label || facts}
    <p class="place-sheet-header__meta">
      {#if label}
        <span
          class="place-sheet-header__label place-sheet-header__label--{labelTone}"
          >{label}</span
        >
      {/if}
      {#if facts}
        <span class="place-sheet-header__facts">{facts}</span>
      {/if}
    </p>
  {/if}
  {#if context}
    <p class="place-sheet-header__context">{context}</p>
  {/if}
  <div class="place-sheet-header__actions">
    {@render children()}
  </div>
</header>

<style>
  .place-sheet-header {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-shrink: 0;
    padding-top: 0.125rem;
    padding-bottom: 0.25rem;
    background: var(--entity-sheet-bg, var(--theme-surface, #fff));
    /* Paint the sheet's side gutters too, so rows scrolling under the header
       do not peek out at its edges (the scroll container clips the rest). */
    box-shadow:
      -1rem 0 0 var(--entity-sheet-bg, var(--theme-surface, #fff)),
      1rem 0 0 var(--entity-sheet-bg, var(--theme-surface, #fff));
  }

  /* Name and X share one row; the X is centred on the name's first line
     (28px line box, 40px target) so the two never drift apart. */
  .place-sheet-header__title-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    min-width: 0;
  }

  .place-sheet-header__title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-size: 1.375rem;
    font-weight: 700;
    line-height: 1.75rem;
    letter-spacing: -0.005em;
    color: var(--theme-text, #18181b);
    overflow-wrap: anywhere;
  }

  .place-sheet-header__title-row :global(.entity-panel-close) {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 2.5rem;
    height: 2.5rem;
    margin: -0.375rem -0.5rem -0.375rem auto;
    padding: 0;
    border-color: transparent;
    border-radius: 50%;
    background: transparent;
    color: var(--theme-text-2, hsl(0, 0%, 30%));
  }

  .place-sheet-header__title-row :global(.entity-panel-close svg) {
    width: 1.375rem;
    height: 1.375rem;
  }

  .place-sheet-header__title-row :global(.entity-panel-close span) {
    display: none;
  }

  .place-sheet-header__title-row :global(.entity-panel-close:hover),
  .place-sheet-header__title-row :global(.entity-panel-close:focus-visible) {
    background: var(--theme-surface-2, hsl(0, 0%, 94%));
    color: var(--theme-text, #18181b);
  }

  /* Plain text, not a chip: the category is a label, so it carries no pill,
     border or fill that would read as a button. */
  .place-sheet-header__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 0.75rem;
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .place-sheet-header__label {
    font-weight: 600;
  }

  .place-sheet-header__label--accent {
    color: var(--theme-accent-text, #7b1113);
  }

  .place-sheet-header__label--green {
    color: var(--theme-green-text, #0d7a5f);
  }

  .place-sheet-header__facts {
    color: var(--theme-text-2, #52525b);
    font-weight: 500;
  }

  .place-sheet-header--stuck .place-sheet-header__meta,
  .place-sheet-header--stuck .place-sheet-header__context {
    display: none;
  }

  .place-sheet-header--stuck .place-sheet-header__title {
    font-size: 1.125rem;
    line-height: 1.5rem;
  }

  .place-sheet-header__context {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.4;
    color: var(--theme-text-2, #52525b);
  }

  /* One filled Directions plus one row of secondary pills; every pill is the
     same 40px tall so the primary is not the only one with presence. */
  .place-sheet-header__actions {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding-top: 0.25rem;
  }

  .place-sheet-header__actions > :global(.map-chrome-action-chip--primary) {
    flex-shrink: 0;
  }

  .place-sheet-header__actions :global(.map-chrome-action-chip),
  .place-sheet-header__actions :global(.editor-toggle--toolbar) {
    box-sizing: border-box;
    min-height: 2.5rem;
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    border-radius: 999px;
  }

  /* A partner link in the row (Kubo) is a pill like the rest, on one line. */
  .place-sheet-header__actions :global(a.entity-footer__link--button) {
    box-sizing: border-box;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.5rem;
    max-width: none;
    padding: 0.5rem 0.875rem;
    border-radius: 999px;
    font-size: 0.875rem;
    white-space: nowrap;
    text-decoration: none;
  }

  .place-sheet-header__actions :global(.map-chrome-action-chip svg),
  .place-sheet-header__actions :global(.editor-toggle--toolbar svg) {
    width: 1rem;
    height: 1rem;
  }

  /* AA on both themes: secondary pills use the full-strength text colour and
     a border that clears 3:1 against the sheet (the old accent border faded
     to ~1.6:1 in dark mode). */
  .place-sheet-header__actions
    :global(.map-chrome-action-chip:not(.map-chrome-action-chip--primary)),
  .place-sheet-header__actions :global(.editor-toggle--toolbar) {
    border-color: var(--theme-border-strong, hsl(0, 0%, 52%));
    color: var(--theme-text, #18181b);
  }

  .place-sheet-header__actions
    :global(
      .map-chrome-action-chip:not(.map-chrome-action-chip--primary):hover:not(
          :disabled
        )
    ),
  .place-sheet-header__actions :global(.editor-toggle--toolbar:hover) {
    border-color: var(--theme-accent-text, #7b1113);
    background: var(--theme-accent-soft, #fdf3f3);
  }
</style>
