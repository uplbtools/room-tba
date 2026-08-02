<script lang="ts">
  import Ruler from "@lucide/svelte/icons/ruler";
  import Timer from "@lucide/svelte/icons/timer";
  import Wrench from "@lucide/svelte/icons/wrench";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import {
    mapToolsStore,
    measureRouteStore,
    travelTimeStore,
  } from "@lib/store.svelte";
  import { panelFadeIn, panelFadeOut } from "@lib/motion";
  import { registerEphemeralOverlayDismisser } from "@lib/overlay-stack";
  import { trapFocus } from "@lib/focus-trap";
  import MapChromePanel from "@ui/map-chrome/MapChromePanel.svelte";
  import "./map-chrome/map-chrome.css";

  let panelEl = $state<HTMLDivElement | null>(null);
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  onMount(() => registerEphemeralOverlayDismisser(() => mapToolsStore.close()));

  $effect(() => {
    if (!mapToolsStore.open || !panelEl) return;
    return trapFocus(panelEl, { onEscape: () => mapToolsStore.close() });
  });

  function toggleTravelTime() {
    travelTimeStore.toggle();
    // Hand the map back so the user can tap an origin right away.
    if (travelTimeStore.active) mapToolsStore.close();
  }

  function toggleMeasureRoute() {
    measureRouteStore.toggle();
    if (measureRouteStore.active) mapToolsStore.close();
  }
</script>

<div class="map-tools-flyout">
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
      </MapChromePanel>
    </div>
  {/if}

  <button
    class="map-chrome-control-btn map-chrome-control-btn--compact"
    class:active={mapToolsStore.open ||
      travelTimeStore.active ||
      measureRouteStore.active}
    type="button"
    onclick={() => mapToolsStore.toggle()}
    title="Map tools"
    aria-label="Map tools"
    aria-expanded={mapToolsStore.open}
    aria-controls="map-tools-panel"
  >
    <Wrench size={18} aria-hidden="true" />
  </button>
</div>

<style>
  .map-tools-flyout {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .map-tools-panel-shell {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-width: 0;
  }

  .map-tools-flyout :global(.map-tools-panel) {
    width: 16rem;
    max-width: calc(100vw - 1rem);
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
