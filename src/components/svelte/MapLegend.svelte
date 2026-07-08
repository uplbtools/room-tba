<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  import X from "@lucide/svelte/icons/x";
  import { getAppData } from "@lib/context";
  import {
    floatingControlPanelStore,
    mapViewStore,
    queryStore,
  } from "@lib/store.svelte";

  type Props = {
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  const panelId = "legend";
  const open = $derived(floatingControlPanelStore.openPanel === panelId);
  const showPanel = $derived(embedded || open);

  const appData = getAppData();
  const { events, loaded } = $derived(appData());

  const showEventSection = $derived(
    loaded &&
      (events.length > 0 ||
        mapViewStore.eventsOnly ||
        queryStore.category === "event" ||
        queryStore.category === "events"),
  );

  const eventsEmpty = $derived(loaded && events.length === 0);

  const placeItems = [
    {
      key: "building",
      label: "Building",
      description: "Academic or campus building.",
    },
    {
      key: "dorm",
      label: "Dorm",
      description: "UP-managed or private dorm.",
    },
    {
      key: "location",
      label: "Your location",
      description: "Device location when enabled.",
    },
  ] as const;

  const routeItems = [
    {
      key: "jeepney-stop",
      label: "Jeepney stop",
      description: "Stop on a jeepney route.",
    },
    {
      key: "schedule-stop",
      label: "Schedule stop",
      description: "Class stop from a routed schedule.",
    },
  ] as const;

  const eventItems = [
    {
      key: "event-active",
      label: "Active event",
      description: "Happening now.",
    },
    {
      key: "event-upcoming",
      label: "Upcoming event",
      description: "Scheduled soon.",
    },
    {
      key: "event-past",
      label: "Past event",
      description: "Already ended.",
    },
    {
      key: "event-route-stop",
      label: "Event route stop",
      description: "Numbered stop on an event path.",
    },
    {
      key: "event-linked",
      label: "Event-linked place",
      description: "Building or dorm tied to a live event.",
    },
  ] as const;
</script>

<div class="map-legend" class:embedded>
  {#if showPanel}
    <div
      id="map-icon-legend"
      class="legend-panel"
      class:embedded
      aria-label="Map icon legend"
    >
      {#if !embedded}
        <div class="legend-panel-header">
          <span>Map legend</span>
          <button
            type="button"
            class="close-btn"
            onclick={() => floatingControlPanelStore.close(panelId)}
            aria-label="Close map legend"
          >
            <X size={16} />
          </button>
        </div>
      {/if}

      <div class="legend-sections">
        <section class="legend-section" aria-labelledby="legend-places">
          <h3 id="legend-places" class="legend-section-title">Places</h3>
          <div class="legend-list">
            {#each placeItems as item (item.key)}
              <div class="legend-item">
                <span class={`legend-swatch ${item.key}`} aria-hidden="true"
                ></span>
                <span class="legend-copy">
                  <span class="legend-label">{item.label}</span>
                  <span class="legend-description">{item.description}</span>
                </span>
              </div>
            {/each}
          </div>
        </section>

        {#if showEventSection}
          <section class="legend-section" aria-labelledby="legend-events">
            <h3 id="legend-events" class="legend-section-title">Events</h3>
            {#if eventsEmpty}
              <p class="legend-empty-note">No events on the map yet.</p>
            {:else}
              <div class="legend-list">
                {#each eventItems as item (item.key)}
                  <div class="legend-item">
                    <span
                      class={`legend-swatch ${item.key}`}
                      aria-hidden="true"
                    >
                      {#if item.key === "event-route-stop"}
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
            {/if}
          </section>
        {/if}

        <section class="legend-section" aria-labelledby="legend-routes">
          <h3 id="legend-routes" class="legend-section-title">Routes</h3>
          <div class="legend-list">
            {#each routeItems as item (item.key)}
              <div class="legend-item">
                <span class={`legend-swatch ${item.key}`} aria-hidden="true">
                  1
                </span>
                <span class="legend-copy">
                  <span class="legend-label">{item.label}</span>
                  <span class="legend-description">{item.description}</span>
                </span>
              </div>
            {/each}
          </div>
        </section>

        <section class="legend-section" aria-labelledby="legend-layers">
          <h3 id="legend-layers" class="legend-section-title">Layers</h3>
          <div class="legend-list">
            <button
              type="button"
              class="legend-item legend-toggle"
              class:legend-toggle--off={!mapViewStore.showOrgs}
              aria-pressed={mapViewStore.showOrgs}
              onclick={() => mapViewStore.toggleOrgs()}
            >
              <span class="legend-swatch organization" aria-hidden="true"></span>
              <span class="legend-copy">
                <span class="legend-label">Orgs &amp; offices</span>
                <span class="legend-description">
                  {mapViewStore.showOrgs ? "Shown" : "Hidden"} — tap to toggle.
                </span>
              </span>
            </button>
            <button
              type="button"
              class="legend-item legend-toggle"
              class:legend-toggle--off={!mapViewStore.showPlaces}
              aria-pressed={mapViewStore.showPlaces}
              onclick={() => mapViewStore.togglePlaces()}
            >
              <span class="legend-swatch place" aria-hidden="true"></span>
              <span class="legend-copy">
                <span class="legend-label">Places</span>
                <span class="legend-description">
                  {mapViewStore.showPlaces ? "Shown" : "Hidden"} — tap to toggle.
                </span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  {/if}

  {#if !embedded}
    <button
      class="legend-btn"
      class:active={open}
      type="button"
      onclick={() => floatingControlPanelStore.toggle(panelId)}
      title="Map legend"
      aria-label="Map legend"
      aria-expanded={open}
      aria-controls="map-icon-legend"
    >
      <Info />
    </button>
  {/if}
</div>

<style>
  .map-legend.embedded {
    pointer-events: auto;
    width: 100%;
  }

  .legend-panel.embedded {
    width: 100%;
    max-width: 100%;
    max-height: none;
    padding: 0;
    box-shadow: none;
    overflow-x: clip;
    overflow-y: visible;
    gap: 0.375rem;
  }

  .map-legend.embedded .legend-sections {
    gap: 0.5rem;
  }

  .map-legend.embedded .legend-section {
    gap: 0.25rem;
  }

  .map-legend.embedded .legend-list {
    gap: 0.25rem;
  }

  .map-legend.embedded .legend-item {
    gap: 0.5rem;
    padding: 0.3125rem 0.5rem;
  }

  .map-legend.embedded .legend-swatch {
    width: 1.125rem;
    height: 1.125rem;
    font-size: 0.625rem;
  }

  .map-legend.embedded .legend-label {
    font-size: 0.75rem;
  }

  .map-legend.embedded .legend-description {
    font-size: 0.625rem;
    line-height: 1.2;
  }

  .legend-empty-note {
    margin: 0;
    padding: 0 0.25rem;
    color: hsl(0, 0%, 45%);
    font-size: 0.75rem;
    line-height: 1.35;
  }

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
    max-height: min(70vh, 22rem);
    flex-direction: column;
    gap: 0.625rem;
    border-radius: 0.875rem;
    background-color: white;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .legend-panel-header {
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
    padding: 0.125rem;
  }

  .close-btn:hover {
    background-color: hsl(0, 0%, 95%);
  }

  .legend-sections {
    display: flex;
    min-height: 0;
    min-width: 0;
    flex-direction: column;
    gap: 0.75rem;
    overflow-x: clip;
    overflow-y: visible;
    padding-right: 0;
  }

  .legend-section {
    display: grid;
    gap: 0.35rem;
  }

  .legend-section-title {
    margin: 0;
    padding: 0 0.25rem;
    color: hsl(0, 0%, 45%);
    font-size: 0.6875rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .legend-list {
    display: grid;
    gap: 0.35rem;
  }

  .legend-item {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    max-width: 100%;
    border-radius: 0.625rem;
    background-color: hsl(0, 0%, 98%);
    padding: 0.45rem 0.625rem;
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

  .legend-swatch.location {
    background-color: #4285f4;
  }

  .legend-swatch.organization {
    background-color: hsl(262, 52%, 47%);
  }

  .legend-swatch.place {
    background-color: hsl(28, 80%, 45%);
  }

  .legend-toggle {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    max-width: 100%;
    border-radius: 0.625rem;
    background-color: hsl(0, 0%, 98%);
    padding: 0.45rem 0.625rem;
    cursor: pointer;
  }

  .legend-toggle:hover,
  .legend-toggle:focus-visible {
    background-color: hsl(5, 30%, 95%);
  }

  .legend-toggle--off {
    opacity: 0.55;
  }

  .legend-toggle--off .legend-swatch {
    filter: grayscale(1);
  }

  .legend-swatch.jeepney-stop {
    background-color: #dc2626;
  }

  .legend-swatch.schedule-stop {
    background-color: #2563eb;
  }

  .legend-swatch.event-active {
    background-color: #7b1113;
  }

  .legend-swatch.event-upcoming {
    border-color: #d8b9ba;
    background-color: #f8fafc;
    color: #7b1113;
  }

  .legend-swatch.event-past {
    border-color: #d4d4d8;
    background-color: #f4f4f5;
    color: #71717a;
  }

  .legend-swatch.event-route-stop {
    background-color: #7b1113;
  }

  .legend-swatch.event-linked {
    background-color: hsl(5, 53%, 32%);
    box-shadow:
      0 0 0 0.14rem rgba(250, 204, 21, 0.88),
      0 2px 0.25rem rgba(0, 0, 0, 0.28);
  }

  .legend-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.05rem;
  }

  .legend-label {
    color: hsl(0, 0%, 15%);
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.2;
  }

  .legend-description {
    color: hsl(0, 0%, 45%);
    font-size: 0.6875rem;
    line-height: 1.25;
  }

  @media (max-width: 30rem) {
    .legend-panel {
      width: min(17rem, calc(100vw - 1rem));
      max-height: min(55vh, 18rem);
    }

    .legend-description {
      display: none;
    }
  }
</style>
