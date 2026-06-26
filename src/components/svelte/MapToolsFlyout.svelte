<script lang="ts">
  import Layers from "@lucide/svelte/icons/layers";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import X from "@lucide/svelte/icons/x";
  import { mapToolsStore, type MapToolsSection } from "@lib/store.svelte";
  import MapViewControls from "./MapViewControls.svelte";
  import MapLegend from "./MapLegend.svelte";
  import BuildingTypeControl from "./BuildingTypeControl.svelte";
  import TerrainControl from "./TerrainControl.svelte";
  import JeepneyMenu from "./JeepneyMenu.svelte";

  const sections: { id: MapToolsSection; label: string }[] = [
    { id: "view", label: "View" },
    { id: "legend", label: "Legend" },
    { id: "building-type", label: "Building type" },
    { id: "terrain", label: "Terrain" },
    { id: "jeepney", label: "Jeepney" },
  ];

  function toggleSection(id: MapToolsSection) {
    mapToolsStore.toggleSection(id);
  }

  function isExpanded(id: MapToolsSection) {
    return mapToolsStore.expandedSections.has(id);
  }
</script>

<div class="map-tools-flyout">
  <button
    class="map-tools-trigger"
    type="button"
    aria-label="Map tools"
    aria-expanded={mapToolsStore.open}
    aria-controls="map-tools-panel"
    onclick={() => mapToolsStore.toggle()}
  >
    <Layers size={20} />
  </button>

  {#if mapToolsStore.open}
    <div
      id="map-tools-panel"
      class="map-tools-panel"
      role="dialog"
      aria-label="Map tools"
    >
      <div class="panel-header">
        <span>Map tools</span>
        <button
          type="button"
          class="close-btn"
          aria-label="Close map tools"
          onclick={() => mapToolsStore.close()}
        >
          <X size={16} />
        </button>
      </div>

      <div class="panel-sections">
        {#each sections as section (section.id)}
          <div class="accordion-section">
            <button
              type="button"
              class="section-toggle"
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
              <div id={`map-tools-section-${section.id}`} class="section-body">
                {#if section.id === "view"}
                  <MapViewControls embedded />
                {:else if section.id === "legend"}
                  <MapLegend embedded />
                {:else if section.id === "building-type"}
                  <BuildingTypeControl embedded />
                {:else if section.id === "terrain"}
                  <TerrainControl embedded />
                {:else if section.id === "jeepney"}
                  <JeepneyMenu embedded />
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
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

  .map-tools-trigger {
    display: flex;
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    align-items: center;
    justify-content: center;
    border: 1.5px solid var(--map-chrome-border-accent, hsl(5, 40%, 42%));
    border-radius: 50%;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    /* Inset ring avoids outer shadow being clipped at viewport edges */
    box-shadow:
      inset 0 0 0 1px hsla(0, 0%, 100%, 0.85),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 6px 14px hsla(0, 0%, 0%, 0.12);
    transition:
      background-color 0.2s,
      border-color 0.2s;
  }

  .map-tools-trigger:hover {
    background-color: hsl(0, 0%, 99%);
    border-color: hsl(5, 53%, 32%);
  }

  .map-tools-trigger:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  .map-tools-trigger[aria-expanded="true"] {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
    box-shadow:
      inset 0 0 0 1px hsla(0, 0%, 100%, 0.2),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 6px 14px hsla(0, 0%, 0%, 0.12);
  }

  .map-tools-panel {
    display: flex;
    width: min(20rem, calc(100vw - 1rem));
    max-height: min(75vh, 28rem);
    min-width: 0;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.875rem;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    padding: 0.75rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    overflow: visible;
  }

  .panel-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: 0.125rem 0.25rem;
    color: hsl(0, 0%, 20%);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(0, 0%, 40%);
    cursor: pointer;
    padding: 0.25rem;
  }

  .close-btn:hover {
    background-color: hsl(0, 0%, 95%);
  }

  .panel-sections {
    display: flex;
    min-height: 0;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 0.25rem;
    overflow-x: visible;
    overflow-y: auto;
    overscroll-behavior-x: none;
    border-radius: 0.625rem;
  }

  .accordion-section {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .section-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    min-height: 2.25rem;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: 0.625rem;
    background: hsl(0, 0%, 97%);
    color: hsl(0, 0%, 20%);
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    text-align: left;
  }

  .section-toggle:hover {
    background: hsl(0, 0%, 94%);
  }

  .section-body {
    min-width: 0;
    max-width: 100%;
    overflow: visible;
    padding: 0.25rem 0 0.5rem;
  }

  .section-body :global(> *) {
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
</style>
