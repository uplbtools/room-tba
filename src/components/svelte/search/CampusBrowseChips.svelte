<script lang="ts">
  import BookText from "@lucide/svelte/icons/book-text";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Landmark from "@lucide/svelte/icons/landmark";
  import University from "@lucide/svelte/icons/university";
  import {
    openBrowseClasses,
    openCampusBrowse,
    type CampusBrowseTab,
  } from "@lib/browse-campus";
  import {
    plannerStore,
    queryStore,
    sidePanelStore,
  } from "@lib/store.svelte";
  import "../map-chrome/map-chrome.css";

  type ChipId = CampusBrowseTab | "classes" | "planner";

  const tabs: {
    id: ChipId;
    label: string;
    icon: typeof University;
  }[] = [
    { id: "buildings", label: "Buildings", icon: University },
    { id: "colleges", label: "Colleges", icon: GraduationCap },
    { id: "divisions", label: "Divisions", icon: Landmark },
    { id: "classes", label: "Classes", icon: BookText },
    // Planner is pinned as a standalone always-visible chip in Search.svelte.
  ];

  const activeTab = $derived.by((): ChipId | null => {
    if (plannerStore.open) return "planner";
    if (queryStore.category === "classes") return "classes";
    if (queryStore.category !== "browse") return null;
    if (
      queryStore.queryValue === "colleges" ||
      queryStore.queryValue === "divisions"
    ) {
      return queryStore.queryValue;
    }
    return "buildings";
  });

  function handleBrowse(id: ChipId) {
    if (id === "planner") {
      plannerStore.openPlanner();
      return;
    }
    if (id === "classes") {
      openBrowseClasses(queryStore, sidePanelStore);
      return;
    }
    openCampusBrowse(queryStore, sidePanelStore, id);
  }
</script>

<div class="campus-browse-chips" role="toolbar" aria-label="Browse campus">
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class="map-chrome-chip campus-browse-chip"
      class:map-chrome-chip--toggle-active={activeTab === tab.id}
      aria-pressed={activeTab === tab.id}
      aria-label={tab.id === "classes"
        ? "Browse all classes"
        : tab.id === "planner"
          ? "Open course planner"
          : `Browse ${tab.label.toLowerCase()}`}
      onclick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleBrowse(tab.id);
      }}
    >
      <span class="map-chrome-chip__icon" aria-hidden="true">
        <tab.icon size={14} />
      </span>
      <span>{tab.label}</span>
    </button>
  {/each}
</div>

<style>
  .campus-browse-chips {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
  }
</style>
