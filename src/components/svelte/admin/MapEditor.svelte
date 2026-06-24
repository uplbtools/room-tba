<script lang="ts">
  import { onMount } from "svelte";
  import { MapLibre, Marker } from "svelte-maplibre";
  import maplibregl from "maplibre-gl";
  import University from "@lucide/svelte/icons/university";
  import House from "@lucide/svelte/icons/house";

  type Building = {
    id: number;
    buildingName: string;
    lat: number;
    lon: number;
    buildingType: "admin" | "non-admin";
    directions: string;
  };

  type Dorm = {
    id: number;
    dormName: string;
    lat: number | null;
    lon: number | null;
    isUpManaged: boolean;
  };

  let buildings = $state<Building[]>([]);
  let dorms = $state<Dorm[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let savedId = $state<number | null>(null);
  let layer = $state<"buildings" | "dorms">("buildings");

  let mapInstance: maplibregl.Map | undefined = $state();

  async function loadData() {
    loading = true;
    error = null;
    try {
      const [bRes, dRes] = await Promise.all([
        fetch("/api/buildings"),
        fetch("/api/dorms"),
      ]);
      if (!bRes.ok) throw new Error("Failed to load buildings");
      buildings = (await bRes.json()) as Building[];
      if (dRes.ok) dorms = (await dRes.json()) as Dorm[];
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  }

  onMount(loadData);

  function flashSaved(id: number) {
    savedId = id;
    setTimeout(() => { if (savedId === id) savedId = null; }, 2000);
  }

  async function updateBuildingPosition(id: number, lat: number, lon: number) {
    try {
      const res = await fetch(`/api/admin/buildings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      if (res.ok) flashSaved(id);
    } catch {
      // silently fail — user can retry
    }
  }

  async function updateDormPosition(id: number, lat: number, lon: number) {
    try {
      const res = await fetch(`/api/admin/dorms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon }),
      });
      if (res.ok) flashSaved(id);
    } catch {
      // silently fail
    }
  }

  function onBuildingDragEnd(e: { marker: maplibregl.Marker }, b: Building) {
    const lngLat = e.marker.getLngLat();
    b.lat = lngLat.lat;
    b.lon = lngLat.lng;
    updateBuildingPosition(b.id, lngLat.lat, lngLat.lng);
  }

  function onDormDragEnd(e: { marker: maplibregl.Marker }, d: Dorm) {
    const lngLat = e.marker.getLngLat();
    d.lat = lngLat.lat;
    d.lon = lngLat.lng;
    updateDormPosition(d.id, lngLat.lat, lngLat.lng);
  }
</script>

<div class="map-editor-wrapper">
  <div class="map-editor-toolbar">
    <button class="tool-btn" class:active={layer === "buildings"} onclick={() => layer = "buildings"}>
      Buildings ({buildings.length})
    </button>
    <button class="tool-btn" class:active={layer === "dorms"} onclick={() => layer = "dorms"}>
      Dorms ({dorms.length})
    </button>
    <span class="tool-hint">Drag any pin to reposition. Saves automatically.</span>
    {#if savedId !== null}
      <span class="save-indicator">✓ Saved</span>
    {/if}
  </div>

  {#if loading}
    <div class="map-loading">Loading map data...</div>
  {:else if error}
    <div class="map-error">Failed to load: {error}</div>
  {:else}
    <div class="map-container">
      <MapLibre
        bind:map={mapInstance}
        style="/liberty-customized.json"
        center={[121.24224620509085, 14.16283754850545]}
        zoom={16}
        pitch={60}
        bearing={-154.48}
        minZoom={14}
        maxBounds={[
          [121.22951431520816, 14.143739048514412],
          [121.28117994803134, 14.18059150108623],
        ]}
        class="map"
      >
        {#if layer === "buildings"}
          {#each buildings as b (b.id)}
            {#if b.lat && b.lon}
              <Marker
                lngLat={[b.lon, b.lat]}
                draggable={true}
                ondragend={(e) => onBuildingDragEnd(e, b)}
              >
                <div
                  class="admin-pin"
                  class:saved={savedId === b.id}
                  class:admin-type={b.buildingType === "admin"}
                  title={b.buildingName}
                  onclick={() => window.open(`/admin/buildings/${b.id}`, "_blank")}
                >
                  <University size="20" />
                </div>
              </Marker>
            {/if}
          {/each}
        {:else}
          {#each dorms as d (d.id)}
            {#if d.lat && d.lon}
              <Marker
                lngLat={[d.lon, d.lat]}
                draggable={true}
                ondragend={(e) => onDormDragEnd(e, d)}
              >
                <div
                  class="admin-pin dorm-pin"
                  class:saved={savedId === d.id}
                  class:private={!d.isUpManaged}
                  title={d.dormName}
                  onclick={() => window.open(`/admin/dorms/${d.id}`, "_blank")}
                >
                  <House size="18" />
                </div>
              </Marker>
            {/if}
          {/each}
        {/if}
      </MapLibre>
    </div>
  {/if}
</div>

<style>
  .map-editor-wrapper {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 120px);
  }

  .map-editor-toolbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .tool-btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.8125rem;
    cursor: pointer;
    background: #fff;
    color: #333;
  }

  .tool-btn.active {
    background: #a30e00;
    color: #fff;
    border-color: #a30e00;
  }

  .tool-hint {
    font-size: 0.75rem;
    color: #999;
  }

  .save-indicator {
    font-size: 0.75rem;
    color: #2e7d32;
    font-weight: 600;
    margin-left: auto;
  }

  .map-container {
    flex: 1;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }

  .map {
    width: 100%;
    height: 100%;
  }

  .map-loading, .map-error {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #999;
    font-size: 0.875rem;
  }

  .map-error { color: #c62828; }

  .admin-pin {
    line-height: 0;
    padding: 0.25rem;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border: 2px solid white;
    border-radius: 50%;
    cursor: grab;
    position: relative;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.3);
    transition: box-shadow 0.2s;
  }

  .admin-pin:active {
    cursor: grabbing;
  }

  .admin-pin.admin-type {
    background-color: hsl(210, 60%, 40%);
  }

  .admin-pin.dorm-pin {
    background-color: hsl(170, 50%, 35%);
  }

  .admin-pin.private {
    background-color: hsl(25, 70%, 50%);
  }

  .admin-pin.saved {
    box-shadow: 0 0 0 3px #4caf50, 0 2px 0.25rem rgba(0, 0, 0, 0.3);
  }
</style>
