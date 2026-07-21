<script lang="ts">
  import Route from "@lucide/svelte/icons/route";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { trailStore, mapStore } from "@lib/store.svelte";
  import {
    MAKILING_TRAIL_STATIONS,
    MAKILING_TRAIL_CAMERA,
  } from "@constants/makiling-trail";

  type Props = {
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  function flyToTrail() {
    mapStore.mapInstance?.flyTo({
      center: MAKILING_TRAIL_CAMERA.center,
      zoom: MAKILING_TRAIL_CAMERA.zoom,
      pitch: MAKILING_TRAIL_CAMERA.pitch,
      bearing: MAKILING_TRAIL_CAMERA.bearing,
      duration: 2000,
    });
  }
</script>

<div class="trail-control">
  <button
    type="button"
    class="trail-toggle"
    class:active={trailStore.enabled}
    onclick={() => trailStore.toggle()}
    aria-pressed={trailStore.enabled}
  >
    <Route size={16} aria-hidden="true" />
    <span>Makiling Trail</span>
    <span class="trail-toggle-state">{trailStore.enabled ? "On" : "Off"}</span>
  </button>

  {#if trailStore.enabled}
    <button type="button" class="trail-flyto" onclick={flyToTrail}>
      <MapPin size={14} aria-hidden="true" />
      <span>Frame trail on map</span>
    </button>

    <ul class="trail-stations">
      {#each MAKILING_TRAIL_STATIONS as station (station.station)}
        <li class="trail-station">
          <span class="trail-station-num">{station.station}</span>
          <div class="trail-station-info">
            <span class="trail-station-name">{station.name}</span>
            <span class="trail-station-elev">{station.elevationMeters} m</span>
          </div>
        </li>
      {/each}
    </ul>

    <p class="trail-disclaimer">
      Stations are approximate. Do not use for navigation. Guide required —
      register at MCME / Station 1.
    </p>
  {/if}
</div>

<style>
  .trail-control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .trail-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.5rem;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    background: var(--map-chrome-surface, hsl(5 20% 97%));
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0 0% 20%);
    transition: background 0.15s;
  }

  .trail-toggle:hover {
    background: hsl(5 20% 94%);
  }

  .trail-toggle.active {
    border-color: #15803d;
    background: hsl(140 30% 94%);
  }

  .trail-toggle-state {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 700;
    color: hsl(0 0% 40%);
  }

  .trail-toggle.active .trail-toggle-state {
    color: #15803d;
  }

  .trail-flyto {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(0 0% 34%);
    text-decoration: underline;
  }

  .trail-stations {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    max-height: 14rem;
    overflow-y: auto;
  }

  .trail-station {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.375rem;
    border-radius: 0.375rem;
  }

  .trail-station:hover {
    background: hsl(5 20% 94%);
  }

  .trail-station-num {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #15803d;
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .trail-station-info {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
  }

  .trail-station-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0 0% 20%);
    line-height: 1.2;
  }

  .trail-station-elev {
    font-size: 0.6875rem;
    color: hsl(0 0% 40%);
  }

  .trail-disclaimer {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.3;
    color: hsl(0 0% 40%);
  }
</style>
