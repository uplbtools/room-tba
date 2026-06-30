<script lang="ts">
  import BookText from "@lucide/svelte/icons/book-text";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Landmark from "@lucide/svelte/icons/landmark";
  import University from "@lucide/svelte/icons/university";
  import {
    openBrowseClasses,
    openCampusBrowseModal,
    type CampusBrowseTab,
  } from "@lib/browse-campus";
  import { modalStore, queryStore, sidePanelStore } from "@lib/store.svelte";

  type Props = {
    /** Compact chips for the search chip row; default fits the suggestions panel. */
    variant?: "inline" | "panel";
  };

  const { variant = "panel" }: Props = $props();

  const tabs: {
    id: CampusBrowseTab | "classes";
    label: string;
    icon: typeof University;
  }[] = [
    { id: "buildings", label: "Buildings", icon: University },
    { id: "colleges", label: "Colleges", icon: GraduationCap },
    { id: "divisions", label: "Divisions", icon: Landmark },
    { id: "classes", label: "Classes", icon: BookText },
  ];

  function handleBrowse(id: CampusBrowseTab | "classes") {
    if (id === "classes") {
      openBrowseClasses(queryStore, sidePanelStore);
      return;
    }
    openCampusBrowseModal(modalStore, id);
  }
</script>

<div
  class="campus-browse-chips"
  class:campus-browse-chips--inline={variant === "inline"}
  role="toolbar"
  aria-label="Browse campus"
>
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class="campus-browse-chip"
      onclick={() => handleBrowse(tab.id)}
    >
      <tab.icon size={14} aria-hidden="true" />
      <span>{tab.label}</span>
    </button>
  {/each}
</div>

<style>
  .campus-browse-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0 0.5rem 0.375rem;
  }

  .campus-browse-chips--inline {
    flex-wrap: nowrap;
    padding: 0;
  }

  .campus-browse-chip {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 0.3125rem;
    min-height: 2rem;
    padding: 0.3125rem 0.625rem;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: 999px;
    background: var(--map-chrome-surface, hsl(5 20% 97%));
    color: hsl(5, 53%, 28%);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.2;
    cursor: pointer;
    white-space: nowrap;
  }

  .campus-browse-chips--inline .campus-browse-chip {
    flex: 0 0 auto;
  }

  .campus-browse-chip:hover,
  .campus-browse-chip:focus-visible {
    border-color: hsl(5, 53%, 32%);
    background: hsl(5, 53%, 96%);
  }

  .campus-browse-chip:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }
</style>
