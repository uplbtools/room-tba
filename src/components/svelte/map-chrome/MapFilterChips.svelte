<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { onMount } from "svelte";
  import { openCampusBrowse } from "@lib/browse-campus";
  import type { CampusBrowseTab } from "@lib/browse-campus";
  import { portal } from "@lib/portal";
  import { registerEphemeralOverlayDismisser } from "@lib/overlay-stack";
  import { campusTransit } from "../../../campus.config";
  import { jeepneyStore, queryStore, sidePanelStore } from "@lib/store.svelte";

  import classBuildingsIcon from "../../../assets/icons/class-buildings.svg?url";
  import dormsIcon from "../../../assets/icons/dorms.svg?url";
  import unitsOfficesIcon from "../../../assets/icons/units-offices.svg?url";
  import jeepneyIcon from "../../../assets/icons/jeepney.svg?url";
  import storeIcon from "../../../assets/icons/store.svg?url";
  import eventIcon from "../../../assets/icons/event.svg?url";

  /** Top-row chips from the map chrome design. Classes / Colleges / Student Orgs
   * stay in the sidebar — they duplicated icons or did not match this row. */
  type ChipId = CampusBrowseTab | "events";

  type Chip =
    | { id: ChipId; label: string; iconUrl: string }
    | { id: ChipId; label: string; LucideIcon: typeof GraduationCap };

  // Ordered by how often a student needs them, like Google Maps' category
  // row: where class is, where people live, where to eat or shop, how to get
  // there. A phone shows the first three or four without scrolling.
  const chips: Chip[] = [
    { id: "buildings", label: "Class Buildings", iconUrl: classBuildingsIcon },
    { id: "dorms", label: "Dorms", iconUrl: dormsIcon },
    { id: "services", label: "Food & stores", iconUrl: storeIcon },
    ...(campusTransit.enabled
      ? [
          {
            id: "jeepney" as const,
            label: campusTransit.label,
            iconUrl: jeepneyIcon,
          },
        ]
      : []),
    { id: "events", label: "Events", iconUrl: eventIcon },
    { id: "landmarks", label: "Landmarks", LucideIcon: MapPin },
  ];

  /** The org chart: useful, but rarely the first thing anyone looks for. */
  const moreChips: Chip[] = [
    { id: "divisions", label: "Divisions", LucideIcon: GraduationCap },
    { id: "offices", label: "Units and offices", iconUrl: unitsOfficesIcon },
  ];

  let moreOpen = $state(false);
  let moreButton = $state<HTMLButtonElement | null>(null);
  let moreMenu = $state<HTMLDivElement | null>(null);
  let morePosition = $state({ top: 0, left: 0 });

  onMount(() => registerEphemeralOverlayDismisser(() => (moreOpen = false)));

  function toggleMore() {
    if (moreOpen) {
      moreOpen = false;
      return;
    }
    const rect = moreButton?.getBoundingClientRect();
    if (rect) {
      morePosition = {
        top: rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 208)),
      };
    }
    moreOpen = true;
  }

  $effect(() => {
    if (moreOpen) moreMenu?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
  });

  function onWindowPointerDown(event: PointerEvent) {
    if (!moreOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (moreMenu?.contains(target) || moreButton?.contains(target)) return;
    moreOpen = false;
  }

  function onMenuKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      moreOpen = false;
      moreButton?.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [
      ...(moreMenu?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []),
    ];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
      items.length;
    items[next]?.focus();
  }

  const activeMore = $derived(moreChips.find((chip) => chip.id === activeId));

  let scroller = $state<HTMLDivElement | null>(null);
  let canScrollMore = $state(false);
  let canScrollBack = $state(false);

  const activeId = $derived.by((): ChipId | null => {
    if (queryStore.category === "events") return "events";
    if (queryStore.category !== "browse") return null;
    const v = queryStore.queryValue;
    if (
      v === "buildings" ||
      v === "dorms" ||
      v === "divisions" ||
      v === "offices" ||
      v === "jeepney" ||
      v === "landmarks" ||
      v === "services"
    ) {
      return v;
    }
    return null;
  });

  /** Visible width of the chip cut off at the left edge (0 if none). */
  let leftCutPx = $state(0);

  function syncScrollMore() {
    const el = scroller;
    if (!el) {
      canScrollMore = false;
      canScrollBack = false;
      return;
    }
    const overflow = el.scrollWidth > el.clientWidth + 4;
    const remaining = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    canScrollMore = overflow && remaining;
    canScrollBack = overflow && el.scrollLeft > 4;
    // Fade out exactly the chip cut off on the left, so no sliver of it
    // shows (at the end of a short row it can stick out past a fixed fade).
    const cut = ([...el.children] as HTMLElement[]).find(
      (c) =>
        c.offsetLeft < el.scrollLeft &&
        c.offsetLeft + c.offsetWidth > el.scrollLeft,
    );
    leftCutPx = cut ? cut.offsetLeft + cut.offsetWidth - el.scrollLeft : 0;
  }

  $effect(() => {
    const el = scroller;
    if (!el) return;
    syncScrollMore();
    const ro = new ResizeObserver(syncScrollMore);
    ro.observe(el);
    el.addEventListener("scroll", syncScrollMore, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", syncScrollMore);
    };
  });

  function handleChip(chip: Chip) {
    const { id, label } = chip;
    moreOpen = false;
    jeepneyStore.closeStop();
    if (id === "events") {
      queryStore.updateQuery({
        category: "events",
        type: "result",
        value: "Campus events",
      });
      queryStore.inputValue = label;
      sidePanelStore.expand();
      return;
    }
    if (id === "jeepney") {
      jeepneyStore.enableLayer();
      openCampusBrowse(queryStore, sidePanelStore, "jeepney", label);
      return;
    }
    openCampusBrowse(queryStore, sidePanelStore, id, label);
  }

  /** Width of the faded edge (matches --fade-start / --fade-end). */
  const EDGE_PX = 24;

  /**
   * Page by whole chips: forward brings the first chip cut off on the right
   * to just inside the left fade; back brings the chip cut off on the left
   * to just inside the right fade. A fixed pixel step used to stop mid-chip,
   * leaving a sliver ("s" of "Dorms") beside the arrow.
   */
  function scrollChips(direction: 1 | -1 = 1) {
    const el = scroller;
    if (!el) return;
    const chipsEls = [...el.children] as HTMLElement[];
    const viewStart = el.scrollLeft;
    const viewEnd = viewStart + el.clientWidth;
    let target: number;
    if (direction === 1) {
      const next = chipsEls.find(
        (c) => c.offsetLeft + c.offsetWidth > viewEnd - EDGE_PX + 1,
      );
      target = next ? next.offsetLeft - EDGE_PX : el.scrollWidth;
    } else {
      const prev = [...chipsEls]
        .reverse()
        .find((c) => c.offsetLeft < viewStart + EDGE_PX - 1);
      target = prev
        ? prev.offsetLeft + prev.offsetWidth - el.clientWidth + EDGE_PX
        : 0;
    }
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }

  /** Trackpads / mice scroll vertically by default; convert to pan-x here. */
  function onWheel(event: WheelEvent) {
    const el = scroller;
    if (!el || el.scrollWidth <= el.clientWidth + 4) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
    syncScrollMore();
  }
</script>

{#snippet chipIcon(chip: Chip)}
  {#if "LucideIcon" in chip}
    <span class="map-filter-chips__icon" aria-hidden="true">
      <chip.LucideIcon size={16} />
    </span>
  {:else}
    <img
      src={chip.iconUrl}
      alt=""
      width="16"
      height="16"
      class="map-filter-chips__icon"
      decoding="async"
    />
  {/if}
{/snippet}

<svelte:window onpointerdown={onWindowPointerDown} />

<div class="map-filter-chips" role="toolbar" aria-label="Map pin filters">
  {#if canScrollBack}
    <button
      type="button"
      class="map-filter-chips__more"
      aria-label="Show previous filters"
      onclick={() => scrollChips(-1)}
    >
      <ChevronLeft size={14} aria-hidden="true" />
    </button>
  {/if}
  <!-- Edges fade where more chips are hidden, instead of cutting a chip off
       square (it read as a stray white box on phones). -->
  <div
    bind:this={scroller}
    class="map-filter-chips__scroll"
    class:map-filter-chips__scroll--fade-start={canScrollBack}
    class:map-filter-chips__scroll--fade-end={canScrollMore}
    style:--fade-clear={canScrollBack ? `${Math.max(14, leftCutPx)}px` : null}
    onwheel={onWheel}
  >
    {#each chips as chip (chip.id)}
      <button
        type="button"
        class="map-filter-chips__chip"
        class:map-filter-chips__chip--active={activeId === chip.id}
        aria-pressed={activeId === chip.id}
        onclick={() => handleChip(chip)}
      >
        {@render chipIcon(chip)}
        <span>{chip.label}</span>
      </button>
    {/each}
    <button
      type="button"
      bind:this={moreButton}
      class="map-filter-chips__chip"
      class:map-filter-chips__chip--active={activeMore !== undefined}
      aria-haspopup="menu"
      aria-expanded={moreOpen}
      aria-controls="map-filter-more-menu"
      onclick={toggleMore}
    >
      {#if activeMore}
        {@render chipIcon(activeMore)}
      {/if}
      <span>{activeMore?.label ?? "More"}</span>
      <ChevronDown size={14} aria-hidden="true" />
    </button>
  </div>

  {#if canScrollMore}
    <button
      type="button"
      class="map-filter-chips__more"
      aria-label="Show more filters"
      onclick={() => scrollChips(1)}
    >
      <ChevronRight size={14} aria-hidden="true" />
    </button>
  {/if}
</div>

{#if moreOpen}
  <!-- Portaled: the chip row scrolls sideways, and overflow clipping would cut
       a menu drawn inside it. -->
  <div
    bind:this={moreMenu}
    id="map-filter-more-menu"
    class="map-filter-more map-chrome-popover"
    role="menu"
    aria-label="More categories"
    tabindex="-1"
    style:top="{morePosition.top}px"
    style:left="{morePosition.left}px"
    use:portal
    onkeydown={onMenuKeydown}
  >
    {#each moreChips as chip (chip.id)}
      <button
        type="button"
        role="menuitem"
        class="map-filter-more__item"
        class:map-filter-more__item--active={activeId === chip.id}
        onclick={() => handleChip(chip)}
      >
        {@render chipIcon(chip)}
        {chip.label}
      </button>
    {/each}
  </div>
{/if}

<style>
  .map-filter-more {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    display: grid;
    width: 12.5rem;
    padding: 0.375rem;
  }

  .map-filter-more__item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 0.5rem;
    background: none;
    color: hsl(0, 0%, 13%);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }

  .map-filter-more__item:hover,
  .map-filter-more__item:focus-visible {
    background-color: hsl(5, 20%, 95%);
    outline: none;
  }

  .map-filter-more__item--active {
    color: #8d1437;
  }

  .map-filter-chips {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: var(--map-filter-gap, 0.375rem);
    min-width: 0;
    max-width: 100%;
    height: var(--map-search-pill-height, 2.25rem);
  }

  .map-filter-chips__scroll {
    /* Chips measure offsetLeft against the scroller (see scrollChips). */
    position: relative;
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: var(--map-filter-gap, 0.375rem);
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    touch-action: pan-x;
    scrollbar-width: none;
    /* Swipes settle on a chip edge, clear of the faded margin. */
    scroll-snap-type: x proximity;
    scroll-padding-inline: 1.5rem;
    /* overflow-x clips the other axis too: pad (and pull back) so the chip
       shadows are not shaved off at the top, bottom and ends. */
    padding: 0.25rem;
    margin: -0.25rem;
  }

  .map-filter-chips__chip {
    scroll-snap-align: start;
  }

  .map-filter-chips__scroll::-webkit-scrollbar {
    display: none;
  }

  .map-filter-chips__scroll--fade-start,
  .map-filter-chips__scroll--fade-end {
    --fade-start: 0px;
    --fade-end: 0px;
    /* Fully clear for most of the edge, then a short ramp: a chip scrolled
       half past the arrow disappears instead of showing a sliver. */
    mask-image: linear-gradient(
      to right,
      transparent 0,
      transparent var(--fade-clear, calc(var(--fade-start) * 0.6)),
      #000 calc(var(--fade-clear, calc(var(--fade-start) * 0.6)) + 0.625rem),
      #000 calc(100% - var(--fade-end)),
      transparent calc(100% - var(--fade-end) * 0.6),
      transparent 100%
    );
  }

  .map-filter-chips__scroll--fade-start {
    --fade-start: 1.5rem;
  }

  .map-filter-chips__scroll--fade-end {
    --fade-end: 1.5rem;
  }

  .map-filter-chips__chip {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.375rem;
    height: var(--map-chip-height, 1.875rem);
    margin: 0;
    padding: 0 0.625rem;
    border: none;
    border-radius: 0.5rem;
    background: var(--theme-surface, #fff);
    color: var(--theme-text, #332529);
    font: inherit;
    font-size: 0.75rem;
    line-height: 1;
    white-space: nowrap;
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
    cursor: pointer;
  }

  .map-filter-chips__chip--active {
    box-shadow:
      var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2)),
      0 0 0 1px #8d1437;
  }

  .map-filter-chips__icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
  }

  .map-filter-chips__icon :global(svg) {
    width: 1rem;
    height: 1rem;
  }

  .map-filter-chips__more {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: var(--map-chip-height, 1.875rem);
    height: var(--map-chip-height, 1.875rem);
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: var(--theme-surface, #fff);
    color: var(--theme-text-muted, #8a8284);
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
    cursor: pointer;
  }
</style>
