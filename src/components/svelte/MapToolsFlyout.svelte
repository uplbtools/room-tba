<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Layers from "@lucide/svelte/icons/layers";
  import { fade } from "svelte/transition";
  import { mapToolsStore, type MapToolsSection } from "@lib/store.svelte";
  import { panelFadeIn, panelFadeOut } from "@lib/motion";
  import MapViewControls from "@ui/MapViewControls.svelte";
  import MapLegend from "@ui/MapLegend.svelte";
  import TerrainControl from "@ui/TerrainControl.svelte";
  import TrailControl from "@ui/TrailControl.svelte";
  import JeepneyMenu from "@ui/JeepneyMenu.svelte";
  import ScheduleImportPanel from "@ui/ScheduleImportPanel.svelte";
  import { trapFocus } from "@lib/focus-trap";
  import MapChromeFabTrigger from "@ui/map-chrome/MapChromeFabTrigger.svelte";
  import MapChromePanel from "@ui/map-chrome/MapChromePanel.svelte";
  import "./map-chrome/map-chrome.css";
  import { MediaQuery } from "svelte/reactivity";

  let panelEl = $state<HTMLDivElement | null>(null);
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = new MediaQuery("max-width:48rem");
  // Transit moved to the sidebar's Jeepney routes browse panel; Map tools now
  // mirrors the Settings modal sections.
  const sections: { id: MapToolsSection; label: string }[] = [
    { id: "view", label: "View" },
    { id: "legend", label: "Legend" },
    { id: "terrain", label: "Terrain" },
    { id: "trail", label: "Makiling Trail" },
    { id: "schedule", label: "Schedule" },
  ];

  function toggleSection(id: MapToolsSection) {
    if (mobile.current) {
      const isOpen = mapToolsStore.expandedSections.has(id);
      mapToolsStore.expandedSections = isOpen ? new Set() : new Set([id]);
      mapToolsStore.activeSection = isOpen ? null : id;
      return;
    }
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
    <Layers size={16} aria-hidden="true" />
  </MapChromeFabTrigger>

  {#if mapToolsStore.open}
    <div
      class="map-tools-panel-shell"
      in:fade={panelFadeIn(reducedMotion.current)}
      out:fade={panelFadeOut(reducedMotion.current)}
    >
      <MapChromePanel
        bind:element={panelEl}
        id="map-tools-panel"
        panelClass="map-chrome-panel map-tools-panel"
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
                <ChevronDown size={18} aria-hidden="true" />
              {:else}
                <ChevronRight size={18} aria-hidden="true" />
              {/if}
              <span>{section.label}</span>
            </button>
            {#if isExpanded(section.id)}
              <div
                id={`map-tools-section-${section.id}`}
                class="map-chrome-accordion-body map-chrome-accordion-body--enter"
              >
                {#if section.id === "view"}
                  <MapViewControls embedded variant="modes" />
                {:else if section.id === "legend"}
                  <MapLegend embedded />
                {:else if section.id === "terrain"}
                  <TerrainControl embedded />
                {:else if section.id === "trail"}
                  <TrailControl embedded />
                {:else if section.id === "jeepney"}
                  <JeepneyMenu embedded />
                {:else if section.id === "schedule"}
                  <ScheduleImportPanel embedded />
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </MapChromePanel>
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

  .map-tools-panel-shell {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    width: 100%;
    min-width: 0;
  }

  /* Desktop: panel overlays below the Layers FAB without growing the stack
     (camera controls stay fixed under the trigger).
     #716: was @media (min-width: 48.0625rem), now gated by .desktop class */
  :global(.desktop) .map-tools-flyout {
    z-index: 1;
  }

  :global(.desktop) .map-tools-panel-shell {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    width: min(24rem, calc(100vw - 1rem));
    z-index: 2;
  }

  .accordion-section {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }
</style>
