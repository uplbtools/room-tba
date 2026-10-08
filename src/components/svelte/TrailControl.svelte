<script lang="ts">
  import Route from "@lucide/svelte/icons/route";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { trailStore, mapStore } from "@lib/store.svelte";
  import SettingsRow from "@ui/modal/SettingsRow.svelte";
  import {
    MAKILING_TRAIL_STATIONS,
    MAKILING_TRAIL_CAMERA,
  } from "@constants/makiling-trail";

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
  <SettingsRow
    label="Makiling Trail"
    supporting="Stations from the trailhead to the peak"
    icon={Route}
    checked={trailStore.enabled}
    onclick={() => trailStore.toggle()}
  />

  {#if trailStore.enabled}
    <div class="trail-details">
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
    </div>
  {/if}
</div>

<style>
  .trail-control {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .trail-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    padding: 0 1rem 0.75rem 4rem;
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
    color: var(--theme-text-2, hsl(0 0% 34%));
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
    background: var(--theme-accent-soft, hsl(5 20% 94%));
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
    color: var(--theme-text, hsl(0 0% 20%));
    line-height: 1.2;
  }

  .trail-station-elev {
    font-size: 0.6875rem;
    color: var(--theme-text-2, hsl(0 0% 40%));
  }

  .trail-disclaimer {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.3;
    color: var(--theme-text-2, hsl(0 0% 40%));
  }
</style>
