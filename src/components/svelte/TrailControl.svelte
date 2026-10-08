<script lang="ts">
  import Route from "@lucide/svelte/icons/route";
  import Info from "@lucide/svelte/icons/info";
  import Maximize from "@lucide/svelte/icons/maximize";
  import { mapToolsStore, trailStore } from "@lib/store.svelte";
  import { openTrailSheet } from "@lib/trail-sheet";
  import SettingsRow from "@ui/modal/SettingsRow.svelte";

  /** Layers gets out of the way first, then the trail fills the visible map. */
  function frameTrail() {
    mapToolsStore.close();
    trailStore.requestFrame();
  }
</script>

<SettingsRow
  label="Makiling Trail"
  supporting="Stations from the trailhead to the peak"
  icon={Route}
  checked={trailStore.enabled}
  onclick={() => trailStore.toggle()}
  expanded={trailStore.enabled}
>
  <button type="button" class="trail-link" onclick={frameTrail}>
    <Maximize size={14} aria-hidden="true" />
    <span>Frame trail on map</span>
  </button>
  <button type="button" class="trail-link" onclick={() => openTrailSheet()}>
    <Info size={14} aria-hidden="true" />
    <span>Trail details and stations</span>
  </button>
</SettingsRow>

<style>
  .trail-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.5rem;
    padding: 0 0.625rem;
    border: none;
    background: none;
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-accent-text, hsl(345 75% 31%));
    text-align: left;
  }
</style>
