<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import { openCampusBrowse, type CampusBrowseTab } from "@lib/browse-campus";
  import { queryStore, sidePanelStore } from "@lib/store.svelte";

  type Props = {
    /** Which campus browse list to reopen. */
    tab: CampusBrowseTab;
    /** Human label, e.g. "Back to landmarks". */
    label: string;
  };

  const { tab, label }: Props = $props();
</script>

<button
  type="button"
  class="entity-back-to-list"
  onclick={() => openCampusBrowse(queryStore, sidePanelStore, tab)}
>
  <ChevronLeft size={15} aria-hidden="true" />
  {label}
</button>

<style>
  .entity-back-to-list {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    align-self: flex-start;
    padding: 0.125rem 0.375rem 0.125rem 0.125rem;
    margin-bottom: 0.125rem;
    border: none;
    background: none;
    border-radius: 0.375rem;
    color: hsl(5, 53%, 32%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .entity-back-to-list:hover,
  .entity-back-to-list:focus-visible {
    background-color: hsl(5, 53%, 96%);
  }
</style>
