<script lang="ts">
  import { onMount } from "svelte";
  import Mountain from "@lucide/svelte/icons/mountain";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import X from "@lucide/svelte/icons/x";
  import {
    TERRAIN_EXAGGERATION_OPTIONS,
    TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE,
  } from "../../constants/map-terrain";
  import { terrainStore } from "../../lib/store.svelte";

  type NetworkInformation = EventTarget & {
    effectiveType?: string;
    saveData?: boolean;
  };

  let isOnline = $state(true);
  let lowDataConnection = $state(false);

  const statusText = $derived.by(() => {
    if (!isOnline) return TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE;
    if (terrainStore.status === "loading") {
      return "Loading hosted elevation tiles...";
    }
    if (terrainStore.status === "active") {
      return "Terrain is contextual, not survey-grade elevation data.";
    }
    if (terrainStore.status === "unavailable") {
      return terrainStore.message ?? "Terrain is unavailable right now.";
    }
    if (lowDataConnection) {
      return "Terrain uses online elevation tiles. Keep it off on low-data connections.";
    }
    return "Terrain loads hosted elevation tiles only when enabled.";
  });

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

<div class="terrain-control">
  {#if terrainStore.menuOpen}
    <div class="terrain-panel" role="menu">
      <div class="terrain-panel-header">
        <span>Makiling Terrain</span>
        <button
          type="button"
          class="close-btn"
          onclick={() => terrainStore.closeMenu()}
          aria-label="Close terrain menu"
        >
          <X size="16" />
        </button>
      </div>

      <p class="terrain-copy">
        Explore Mt. Makiling in 3D context. This layer is online-only for now
        and stays off until you enable it.
      </p>

      <button
        type="button"
        class="terrain-toggle"
        class:active={terrainStore.enabled}
        onclick={handleToggle}
        aria-pressed={terrainStore.enabled}
      >
        {terrainStore.enabled ? "Turn terrain off" : "Turn terrain on"}
      </button>

      <div class="terrain-options" aria-label="Terrain exaggeration">
        <span>Exaggeration</span>
        <div class="terrain-option-buttons">
          {#each TERRAIN_EXAGGERATION_OPTIONS as option (option)}
            <button
              type="button"
              class="terrain-option"
              class:active={terrainStore.exaggeration === option}
              onclick={() => terrainStore.setExaggeration(option)}
            >
              {option}x
            </button>
          {/each}
        </div>
      </div>

      <button
        type="button"
        class="reset-btn"
        disabled={!terrainStore.enabled}
        onclick={() => terrainStore.requestReset()}
      >
        <RotateCcw size="14" />
        Reset Makiling view
      </button>

      <p
        class="terrain-status"
        class:warning={!isOnline ||
          lowDataConnection ||
          terrainStore.status === "unavailable"}
        aria-live="polite"
      >
        {statusText}
      </p>

      <p class="terrain-attribution">
        Elevation tiles by
        <a href="https://www.maptiler.com/" target="_blank" rel="noreferrer">
          MapTiler
        </a>
        .
      </p>
    </div>
  {/if}

  <button
    class="terrain-btn"
    class:active={terrainStore.enabled}
    onclick={() => terrainStore.toggleMenu()}
    title="Makiling Terrain"
    aria-label="Makiling Terrain"
    aria-expanded={terrainStore.menuOpen}
  >
    <Mountain />
  </button>
</div>

<style>
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
    transition:
      background-color 0.2s,
      transform 0.2s;
  }

  .terrain-btn:hover {
    background-color: hsl(5, 53%, 98%);
    transform: scale(1.05);
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
    gap: 0.625rem;
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

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(0, 0%, 40%);
    cursor: pointer;
    padding: 0.125rem;
  }

  .close-btn:hover {
    background-color: hsl(0, 0%, 95%);
  }

  .terrain-copy,
  .terrain-status,
  .terrain-attribution {
    margin: 0;
    color: hsl(0, 0%, 38%);
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .terrain-toggle,
  .reset-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.625rem;
    background-color: white;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.55rem 0.625rem;
  }

  .terrain-toggle:hover,
  .reset-btn:hover:not(:disabled) {
    background-color: hsl(5, 53%, 98%);
  }

  .terrain-toggle.active {
    border-color: hsl(160, 84%, 26%);
    background-color: hsl(160, 84%, 26%);
    color: white;
  }

  .terrain-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    color: hsl(0, 0%, 30%);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .terrain-option-buttons {
    display: flex;
    gap: 0.25rem;
  }

  .terrain-option {
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 999px;
    background-color: white;
    color: hsl(0, 0%, 30%);
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
  }

  .terrain-option.active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 32%);
  }

  .reset-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .terrain-status.warning {
    color: hsl(25, 80%, 35%);
    font-weight: 600;
  }

  .terrain-attribution a {
    color: hsl(5, 53%, 32%);
    font-weight: 700;
  }
</style>
