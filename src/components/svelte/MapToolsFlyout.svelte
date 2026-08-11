<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Ruler from "@lucide/svelte/icons/ruler";
  import Timer from "@lucide/svelte/icons/timer";
  // Wrench, not layers: this trigger opens a toolbox (travel time, measure
  // route, legend), and `layers` is the legend chip sitting right beside it.
  import Wrench from "@lucide/svelte/icons/wrench";
  import { fade } from "svelte/transition";
  import {
    mapToolsStore,
    measureRouteStore,
    travelTimeStore,
    type MapToolsSection,
  } from "@lib/store.svelte";
  import { panelFadeIn, panelFadeOut } from "@lib/motion";
  import MapViewControls from "@ui/MapViewControls.svelte";
  import WaybackImageryControl from "@ui/WaybackImageryControl.svelte";
  import MapLegend from "@ui/MapLegend.svelte";
  import TerrainControl from "@ui/TerrainControl.svelte";
  import { TERRAIN_ENABLED } from "@constants/map-terrain";
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
    ...(TERRAIN_ENABLED
      ? [{ id: "terrain" as const, label: "Terrain" }]
      : []),
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

  function toggleTravelTime() {
    travelTimeStore.toggle();
    // Hand the map back so the user can tap an origin right away.
    if (travelTimeStore.active) mapToolsStore.close();
  }

  function toggleMeasureRoute() {
    measureRouteStore.toggle();
    if (measureRouteStore.active) mapToolsStore.close();
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
    <Wrench size={18} aria-hidden="true" />
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
        <button
          type="button"
          class="map-tools-flyout__tool"
          class:map-tools-flyout__tool--active={travelTimeStore.active}
          aria-pressed={travelTimeStore.active}
          onclick={toggleTravelTime}
        >
          <Timer size={18} aria-hidden="true" />
          <span class="map-tools-flyout__tool-copy">
            <span class="map-tools-flyout__tool-label">Travel time</span>
            <span class="map-tools-flyout__tool-description">
              {travelTimeStore.active
                ? "On — tap the map to pick a start point"
                : "Color paths by walking minutes from a point"}
            </span>
          </span>
        </button>
        <button
          type="button"
          class="map-tools-flyout__tool"
          class:map-tools-flyout__tool--active={measureRouteStore.active}
          aria-pressed={measureRouteStore.active}
          onclick={toggleMeasureRoute}
        >
          <Ruler size={18} aria-hidden="true" />
          <span class="map-tools-flyout__tool-copy">
            <span class="map-tools-flyout__tool-label">Measure route</span>
            <span class="map-tools-flyout__tool-description">
              {measureRouteStore.active
                ? "On — tap the map to drop waypoints"
                : "Drop waypoints, get walk / cycle / car times"}
            </span>
          </span>
        </button>

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
                  <WaybackImageryControl />
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

  .map-tools-flyout__tool {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.5rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    background: none;
    padding: 0.375rem 0.5rem;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .map-tools-flyout__tool:hover {
    background-color: hsl(5, 20%, 95%);
  }

  .map-tools-flyout__tool:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  .map-tools-flyout__tool--active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 30%, 95%);
  }

  .map-tools-flyout__tool-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.125rem;
  }

  .map-tools-flyout__tool-label {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .map-tools-flyout__tool-description {
    font-size: 0.6875rem;
    line-height: 1.25;
    color: hsl(0, 0%, 40%);
  }
</style>
