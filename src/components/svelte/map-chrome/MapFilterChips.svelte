<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { openCampusBrowse } from "@lib/browse-campus";
  import type { CampusBrowseTab } from "@lib/browse-campus";
  import { campusTransit } from "../../../campus.config";
  import { jeepneyStore, queryStore, sidePanelStore } from "@lib/store.svelte";

  import classBuildingsIcon from "../../../assets/icons/class-buildings.svg?url";
  import dormsIcon from "../../../assets/icons/dorms.svg?url";
  import divisionsIcon from "../../../assets/icons/divisions.svg?url";
  import unitsOfficesIcon from "../../../assets/icons/units-offices.svg?url";
  import jeepneyIcon from "../../../assets/icons/jeepney.svg?url";
  import landmarkIcon from "../../../assets/icons/landmark.svg?url";
  import storeIcon from "../../../assets/icons/store.svg?url";
  import eventIcon from "../../../assets/icons/event.svg?url";

  type ChipId =
    | "buildings"
    | "dorms"
    | "divisions"
    | "offices"
    | "jeepney"
    | "landmarks"
    | "services"
    | "events";

  const chips: { id: ChipId; label: string; icon: string }[] = [
    { id: "buildings", label: "Class Buildings", icon: classBuildingsIcon },
    { id: "dorms", label: "Dorms", icon: dormsIcon },
    { id: "divisions", label: "Divisions", icon: divisionsIcon },
    { id: "offices", label: "Units & Offices", icon: unitsOfficesIcon },
    ...(campusTransit.enabled
      ? [
          {
            id: "jeepney" as const,
            label: "Jeepney Routes",
            icon: jeepneyIcon,
          },
        ]
      : []),
    { id: "landmarks", label: "Landmarks", icon: landmarkIcon },
    { id: "services", label: "Stores", icon: storeIcon },
    { id: "events", label: "Events", icon: eventIcon },
  ];

  let scroller = $state<HTMLDivElement | null>(null);
  let canScrollMore = $state(false);

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

  function syncScrollMore() {
    const el = scroller;
    if (!el) {
      canScrollMore = false;
      return;
    }
    // Hide chevron when every chip already fits / is scrolled into view.
    const overflow = el.scrollWidth > el.clientWidth + 4;
    const remaining = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    canScrollMore = overflow && remaining;
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

  function handleChip(id: ChipId) {
    if (id === "events") {
      queryStore.updateQuery({
        category: "events",
        type: "result",
        value: "Campus events",
      });
      queryStore.inputValue = "";
      sidePanelStore.expand();
      return;
    }
    if (id === "jeepney") {
      jeepneyStore.enableLayer();
      openCampusBrowse(queryStore, sidePanelStore, "jeepney");
      return;
    }
    openCampusBrowse(queryStore, sidePanelStore, id as CampusBrowseTab);
  }

  function scrollChips() {
    const step = Math.max(
      160,
      Math.round((scroller?.clientWidth ?? 240) * 0.55),
    );
    scroller?.scrollBy({ left: step, behavior: "smooth" });
  }
</script>

<div class="map-filter-chips" role="toolbar" aria-label="Browse campus">
  <div bind:this={scroller} class="map-filter-chips__scroll">
    {#each chips as chip (chip.id)}
      <button
        type="button"
        class="map-filter-chips__chip"
        class:map-filter-chips__chip--active={activeId === chip.id}
        aria-pressed={activeId === chip.id}
        onclick={() => handleChip(chip.id)}
      >
        <img
          src={chip.icon}
          alt=""
          width="16"
          height="16"
          class="map-filter-chips__icon"
          decoding="async"
        />
        <span>{chip.label}</span>
      </button>
    {/each}
  </div>

  {#if canScrollMore}
    <button
      type="button"
      class="map-filter-chips__more"
      aria-label="Show more filters"
      onclick={scrollChips}
    >
      <ChevronRight size={14} aria-hidden="true" />
    </button>
  {/if}
</div>

<style>
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
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: var(--map-filter-gap, 0.375rem);
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .map-filter-chips__scroll::-webkit-scrollbar {
    display: none;
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
    background: #fff;
    color: #332529;
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
    background: #fff;
    color: #8a8284;
    box-shadow: var(--shadow-search, 0 1px 3.5px rgb(58 58 71 / 0.2));
    cursor: pointer;
  }

</style>
