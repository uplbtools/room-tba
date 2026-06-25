<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  import X from "@lucide/svelte/icons/x";

  let open = $state(false);

  const legendItems = [
    {
      key: "building",
      label: "Building",
      description: "Academic or campus building pin.",
    },
    {
      key: "dorm",
      label: "Dorm",
      description: "UP-managed or private dorm pin.",
    },
    {
      key: "stop",
      label: "Route stop",
      description: "Jeepney route stop.",
    },
    {
      key: "location",
      label: "Your location",
      description: "Current device location when enabled.",
    },
  ];
</script>

<div class="map-legend">
  {#if open}
    <div id="map-icon-legend" class="legend-panel" aria-label="Map icon legend">
      <div class="legend-panel-header">
        <span>Map Legend</span>
        <button
          type="button"
          class="close-btn"
          onclick={() => (open = false)}
          aria-label="Close map legend"
        >
          <X size={16} />
        </button>
      </div>

      <div class="legend-list">
        {#each legendItems as item (item.key)}
          <div class="legend-item">
            <span class={`legend-swatch ${item.key}`} aria-hidden="true">
              {#if item.key === "stop"}
                1
              {/if}
            </span>
            <span class="legend-copy">
              <span class="legend-label">{item.label}</span>
              <span class="legend-description">{item.description}</span>
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <button
    class="legend-btn"
    class:active={open}
    type="button"
    onclick={() => (open = !open)}
    title="Map Legend"
    aria-label="Map Legend"
    aria-expanded={open}
    aria-controls="map-icon-legend"
  >
    <Info />
  </button>
</div>

<style>
  .map-legend {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    pointer-events: auto;
  }

  .legend-btn {
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

  .legend-btn:hover {
    background-color: hsl(5, 53%, 98%);
    transform: scale(1.05);
  }

  .legend-btn.active {
    border-color: hsl(5, 53%, 75%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .legend-panel {
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

  .legend-panel-header {
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

  .legend-list {
    display: grid;
    gap: 0.45rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: 0.625rem;
    background-color: hsl(0, 0%, 98%);
    padding: 0.5rem 0.625rem;
  }

  .legend-swatch {
    display: inline-flex;
    width: 1.35rem;
    height: 1.35rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    border-radius: 999px;
    color: white;
    font-size: 0.7rem;
    font-weight: 800;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.28);
  }

  .legend-swatch.building {
    background-color: hsl(5, 53%, 32%);
  }

  .legend-swatch.dorm {
    background-color: hsl(170, 50%, 35%);
  }

  .legend-swatch.stop {
    background-color: #dc2626;
  }

  .legend-swatch.location {
    background-color: #4285f4;
  }

  .legend-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.125rem;
  }

  .legend-label {
    color: hsl(0, 0%, 15%);
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .legend-description {
    color: hsl(0, 0%, 45%);
    font-size: 0.75rem;
    line-height: 1.25;
  }
</style>
