<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Layers from "@lucide/svelte/icons/layers";
  import { mapToolsStore, type MapToolsSection } from "../../lib/store.svelte";
  import MapViewControls from "./MapViewControls.svelte";
  import MapLegend from "./MapLegend.svelte";
  import TerrainControl from "./TerrainControl.svelte";
  import JeepneyMenu from "./JeepneyMenu.svelte";
  import { trapFocus } from "../../lib/focus-trap";
  import MapChromeFabTrigger from "./map-chrome/MapChromeFabTrigger.svelte";
  import MapChromePanel from "./map-chrome/MapChromePanel.svelte";
  import "./map-chrome/map-chrome.css";

  let panelEl = $state<HTMLDivElement | null>(null);
  const sections: { id: MapToolsSection; label: string }[] = [
    { id: "view", label: "View" },
    { id: "legend", label: "Legend" },
    { id: "terrain", label: "Terrain" },
    { id: "jeepney", label: "Jeepney" },
  ];

  function toggleSection(id: MapToolsSection) {
    mapToolsStore.toggleSection(id);
  }

  function isExpanded(id: MapToolsSection) {
    return mapToolsStore.expandedSections.has(id);
  }

  $effect(() => {
    if (!mapToolsStore.open || !panelEl) return;
    return trapFocus(panelEl, { onEscape: () => mapToolsStore.close() });
  });
</script>

<div class="map-tools-flyout">
  <MapChromeFabTrigger
    ariaExpanded={mapToolsStore.open}
    ariaControls="map-tools-panel"
    ariaLabel="Map tools"
    onclick={() => mapToolsStore.toggle()}
  >
    <Layers size={20} />
  </MapChromeFabTrigger>

  {#if mapToolsStore.open}
    <MapChromePanel
      bind:element={panelEl}
      id="map-tools-panel"
      title="Map tools"
      onclose={() => mapToolsStore.close()}
    >
      {#each sections as section (section.id)}
        <div class="accordion-section">
          <button
            type="button"
            class="map-chrome-accordion-toggle"
            aria-expanded={isExpanded(section.id)}
            aria-controls={`map-tools-section-${section.id}`}
            onclick={() => toggleSection(section.id)}
          >
            {#if isExpanded(section.id)}
              <ChevronDown size={16} />
            {:else}
              <ChevronRight size={16} />
            {/if}
            <span>{section.label}</span>
          </button>
          {#if isExpanded(section.id)}
            <div
              id={`map-tools-section-${section.id}`}
              class="map-chrome-accordion-body"
            >
              {#if section.id === "view"}
                <MapViewControls embedded />
              {:else if section.id === "legend"}
                <MapLegend embedded />
              {:else if section.id === "terrain"}
                <TerrainControl embedded />
              {:else if section.id === "jeepney"}
                <JeepneyMenu embedded />
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </MapChromePanel>
  {/if}
</div>

<style>
  .map-tools-flyout {
    position: relative;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    overflow: visible;
  }

  .accordion-section {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }
</style>
