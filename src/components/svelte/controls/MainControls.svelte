<script lang="ts">
  import Search from "@ui/search/Search.svelte";
  import SidePanel from "./SidePanel.svelte";
</script>

<div class="side-panel-wrapper">
  <Search />
  <div class="side-panel-controls">
    <SidePanel />
  </div>
</div>

<style>
  .side-panel-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow: visible;
    pointer-events: none;
  }

  .side-panel-controls {
    display: flex;
    flex: 1;
    align-items: flex-end;
    min-height: 0;
  }

  @media screen and (max-width: 48rem) {
    .side-panel-wrapper {
      gap: 0;
      margin-inline: var(--map-ui-padding, 0.375rem);
      width: auto;
      max-width: none;
    }

    .side-panel-controls {
      flex: 0 0 auto;
      min-height: 0;
      pointer-events: none;
    }
  }
</style>
