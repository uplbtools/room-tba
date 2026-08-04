<script lang="ts">
  import { onMount } from "svelte";
  import Mountain from "@lucide/svelte/icons/mountain";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import X from "@lucide/svelte/icons/x";
  import IconButton from "@ui/IconButton.svelte";
  import {
    TERRAIN_EXAGGERATION_OPTIONS,
    TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE,
  } from "@constants/map-terrain";
  import { floatingControlPanelStore, terrainStore } from "@lib/store.svelte";
  import "./map-chrome/map-chrome.css";

  type Props = {
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  type NetworkInformation = EventTarget & {
    effectiveType?: string;
    saveData?: boolean;
  };

  let isOnline = $state(true);
  let lowDataConnection = $state(false);
  const panelId = "terrain";
  const menuOpen = $derived(floatingControlPanelStore.openPanel === panelId);
  const showPanel = $derived(embedded || menuOpen);

  // Only says something when the state is not the plain "off and fine" one.
  // The what-is-this copy lives on the toggle's title instead of a paragraph.
  const statusText = $derived.by(() => {
    if (!isOnline) return TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE;
    if (terrainStore.status === "loading") return "Loading elevation tiles...";
    if (terrainStore.status === "active") {
      return "Contextual relief, not survey-grade elevation.";
    }
    if (terrainStore.status === "unavailable") {
      return terrainStore.message ?? "Terrain is unavailable right now.";
    }
    if (lowDataConnection) return "Uses online tiles. Keep it off on low data.";
    return "";
  });

  const statusWarns = $derived(
    !isOnline || lowDataConnection || terrainStore.status === "unavailable",
  );

  // Visible label is "Off"/"On", so the accessible name has to contain it
  // (WCAG 2.5.3) while still naming the action.
  const toggleLabel = $derived(
    terrainStore.enabled
      ? "Terrain is on. Turn terrain off."
      : "Terrain is off. Turn terrain on.",
  );

  function getConnection(): NetworkInformation | undefined {
    return (navigator as Navigator & { connection?: NetworkInformation })
      .connection;
  }

  function updateNetworkState() {
    isOnline = navigator.onLine;
    const connection = getConnection();
    lowDataConnection = Boolean(
      connection?.saveData || connection?.effectiveType?.includes("2g"),
    );
    if (!isOnline && terrainStore.enabled) {
      terrainStore.markUnavailable(TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE);
    }
  }

  function handleToggle() {
    if (terrainStore.enabled) {
      terrainStore.disable();
      return;
    }

    if (!isOnline) {
      terrainStore.markUnavailable(TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE);
      return;
    }

    terrainStore.enable();
  }

  onMount(() => {
    updateNetworkState();

    const connection = getConnection();
    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    connection?.addEventListener?.("change", updateNetworkState);

    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
      connection?.removeEventListener?.("change", updateNetworkState);
    };
  });
</script>

<div class="terrain-control" class:embedded>
  {#if showPanel}
    <div class="terrain-panel" class:embedded>
      {#if !embedded}
        <div class="terrain-panel-header">
          <span>Makiling Terrain</span>
          <IconButton
            size="sm"
            shape="rounded"
            label="Close terrain menu"
            onclick={() => floatingControlPanelStore.close(panelId)}
          >
            <X size={16} />
          </IconButton>
        </div>
      {/if}

      <div class="map-chrome-row">
        <span class="map-chrome-row__label">Makiling terrain</span>
        <div class="map-chrome-row__control">
          <button
            type="button"
            class="map-chrome-chip"
            class:map-chrome-chip--toggle-active={terrainStore.enabled}
            onclick={handleToggle}
            aria-pressed={terrainStore.enabled}
            aria-label={toggleLabel}
            title="Mt. Makiling in 3D. Loads elevation tiles over the network."
          >
            {terrainStore.enabled ? "On" : "Off"}
          </button>
        </div>
      </div>

      <div class="map-chrome-row">
        <span class="map-chrome-row__label" id="terrain-exaggeration-label">
          Exaggeration
        </span>
        <div
          class="map-chrome-row__control"
          role="group"
          aria-labelledby="terrain-exaggeration-label"
        >
          {#each TERRAIN_EXAGGERATION_OPTIONS as option (option)}
            <button
              type="button"
              class="map-chrome-chip"
              class:map-chrome-chip--toggle-active={terrainStore.exaggeration ===
                option}
              aria-pressed={terrainStore.exaggeration === option}
              onclick={() => terrainStore.setExaggeration(option)}
            >
              {option}x
            </button>
          {/each}
        </div>
      </div>

      <div class="map-chrome-row">
        <span class="map-chrome-row__label">Camera</span>
        <div class="map-chrome-row__control">
          <button
            type="button"
            class="map-chrome-action-chip"
            disabled={!terrainStore.enabled}
            onclick={() => terrainStore.requestReset()}
            title="Point the camera back at Mt. Makiling."
          >
            <RotateCcw size="14" aria-hidden="true" />
            Reset view
          </button>
        </div>
      </div>

      <div class="terrain-status" aria-live="polite">
        {#if statusText}
          <p class="map-chrome-row-hint" class:map-chrome-row-hint--warn={statusWarns}>
            {statusText}
          </p>
        {/if}
      </div>

      <p class="map-chrome-row-note">
        Elevation tiles by <a
          href="https://www.maptiler.com/"
          target="_blank"
          rel="noreferrer">MapTiler</a
        >.
      </p>
    </div>
  {/if}

  {#if !embedded}
    <button
      class="terrain-btn"
      class:active={terrainStore.enabled}
      onclick={() => floatingControlPanelStore.toggle(panelId)}
      title="Makiling Terrain"
      aria-label="Makiling Terrain"
      aria-expanded={menuOpen}
    >
      <Mountain />
    </button>
  {/if}
</div>

<style>
  .terrain-control.embedded {
    width: 100%;
  }

  .terrain-panel.embedded {
    width: 100%;
    max-width: 100%;
    /* 1px so overflow-x does not shave the left stem off the attribution's
       "E" — same clip the settings scroll body already pads around. */
    padding: 0 0 0 1px;
    box-shadow: none;
    overflow-x: hidden;
  }

  .terrain-control {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .terrain-btn {
    display: flex;
    width: 3rem;
    height: 3rem;
    align-items: center;
    justify-content: center;
    border: 1px solid #ececec;
    border-radius: 50%;
    background-color: white;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: background-color 0.2s;
  }

  .terrain-btn:hover {
    background-color: hsl(5, 53%, 98%);
  }

  .terrain-btn.active {
    border-color: hsl(160, 84%, 26%);
    background-color: hsl(160, 84%, 26%);
    color: white;
  }

  .terrain-panel {
    display: flex;
    width: 18rem;
    max-width: calc(100vw - 1rem);
    flex-direction: column;
    gap: 0.25rem;
    border-radius: 0.875rem;
    background-color: white;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .terrain-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.125rem 0.25rem;
    color: hsl(0, 0%, 20%);
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* Live region, so it stays mounted; :empty keeps it out of the panel's gap
     while the state is the plain "off and fine" one. */
  .terrain-status:empty {
    display: none;
  }

  /* Attribution is required by the basemap terms. Small print, with enough air
     that it does not read as another setting row. */
  .map-chrome-row-note {
    margin-top: 0.25rem;
    padding-left: 3px;
  }
</style>
