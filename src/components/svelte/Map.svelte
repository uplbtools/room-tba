<script lang="ts">
  import { MapLibre, Marker } from "svelte-maplibre";
  import { getAppData } from "../../lib/context";
  import {
    queryStore,
    locationStore,
    mapStore,
    jeepneyStore,
    dormFilter,
    currentRoom,
  } from "../../lib/store.svelte";
  import { untrack } from "svelte";
  import { fade } from "svelte/transition";
  import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
  import House from "@lucide/svelte/icons/house";
  import University from "@lucide/svelte/icons/university";
  import { MediaQuery } from "svelte/reactivity";
  import * as mapGl from "maplibre-gl";
  import {
    JEEPNEY_ROUTES,
    type JeepneyRoute,
    type JeepneyStop,
  } from "../../constants/jeepney-routes";
  const data = getAppData();
  const { buildings, dorms, loaded } = $derived(data());
  const filteredDorms = $derived.by(() => {
    if (!loaded) return;
    if (dormFilter.value === "all") return dorms;
    if (dormFilter.value === "up") return dorms.filter((d) => d.isUpManaged);
    return dorms.filter((d) => !d.isUpManaged);
  });
  let directions: MapLibreGlDirections | undefined = $state.raw();

  const JEEPNEY_ROUTE_SOURCE_ID = "jeepney-route-line";
  const JEEPNEY_ROUTE_LAYER_ID = "jeepney-route-line";
  const JEEPNEY_ROUTE_LAYER_CASING_ID = "jeepney-route-line-casing";

  let activeRouteId = $state<string | null>(null);
  let activeRouteStops = $state<JeepneyStop[]>([]);
  let activeRouteColor = $state<string>("#dc2626");

  async function fetchRouteGeometry(
    route: JeepneyRoute,
  ): Promise<GeoJSON.LineString | null> {
    if (route.stops.length < 2) return null;
    const coordsParam = route.stops
      .map((stop) => `${stop.lon},${stop.lat}`)
      .join(";");
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        routes?: { geometry?: GeoJSON.LineString }[];
      };
      const geometry = data.routes?.[0]?.geometry;
      if (!geometry || geometry.type !== "LineString") return null;
      return geometry;
    } catch {
      return null;
    }
  }

  function buildStraightLineGeometry(route: JeepneyRoute): GeoJSON.LineString {
    return {
      type: "LineString",
      coordinates: route.stops.map((stop) => [stop.lon, stop.lat]),
    };
  }

  function ensureJeepneyRouteLayers(map: mapGl.MapLibreMap, color: string) {
    if (!map.getSource(JEEPNEY_ROUTE_SOURCE_ID)) {
      map.addSource(JEEPNEY_ROUTE_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    }

    if (!map.getLayer(JEEPNEY_ROUTE_LAYER_CASING_ID)) {
      map.addLayer({
        id: JEEPNEY_ROUTE_LAYER_CASING_ID,
        type: "line",
        source: JEEPNEY_ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.95,
        },
      });
    }

    if (!map.getLayer(JEEPNEY_ROUTE_LAYER_ID)) {
      map.addLayer({
        id: JEEPNEY_ROUTE_LAYER_ID,
        type: "line",
        source: JEEPNEY_ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": color,
          "line-width": 5,
          "line-opacity": 0.95,
        },
      });
    } else {
      map.setPaintProperty(JEEPNEY_ROUTE_LAYER_ID, "line-color", color);
    }
  }

  function clearJeepneyRouteLayers(map: mapGl.MapLibreMap) {
    if (map.getLayer(JEEPNEY_ROUTE_LAYER_ID)) {
      map.removeLayer(JEEPNEY_ROUTE_LAYER_ID);
    }
    if (map.getLayer(JEEPNEY_ROUTE_LAYER_CASING_ID)) {
      map.removeLayer(JEEPNEY_ROUTE_LAYER_CASING_ID);
    }
    if (map.getSource(JEEPNEY_ROUTE_SOURCE_ID)) {
      map.removeSource(JEEPNEY_ROUTE_SOURCE_ID);
    }
  }

  function fitMapToRoute(map: mapGl.MapLibreMap, route: JeepneyRoute) {
    if (route.stops.length === 0) return;
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const stop of route.stops) {
      if (stop.lon < minLng) minLng = stop.lon;
      if (stop.lon > maxLng) maxLng = stop.lon;
      if (stop.lat < minLat) minLat = stop.lat;
      if (stop.lat > maxLat) maxLat = stop.lat;
    }
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 1200,
        pitch: 30,
      },
    );
  }

  let animationFrameId: number | null = $state(null);

  let isRotating = $state(false);
  let lastTimestamp = $state(0);
  let currentRotation = $state(0);
  let zoomLevel = $state(0);
  const SIDEPANEL_WIDTH = 25.75 * 16;
  const md = new MediaQuery("max-width:48rem");

  const calculatePadding = (md: boolean): mapGl.PaddingOptions => {
    if (md) {
      return {
        bottom: window.innerWidth / 2,
        left: 0,
      };
    }
    return {
      left: SIDEPANEL_WIDTH,
      bottom: 0,
    };
  };

  function rotateCamera(timestamp: number) {
    if (!mapStore.mapInstance || !isRotating) return;

    if (!lastTimestamp) lastTimestamp = timestamp;
    const delta = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    currentRotation = (currentRotation + delta / 150) % 360;
    mapStore.mapInstance.rotateTo(currentRotation, {
      duration: 0,
      padding: calculatePadding(untrack(() => md.current)),
    });

    animationFrameId = requestAnimationFrame(rotateCamera);
  }

  function startRotation() {
    stopRotation();
    if (!mapStore.mapInstance) return;
    isRotating = true;
    lastTimestamp = 0;
    currentRotation = mapStore.mapInstance.getBearing();
    animationFrameId = requestAnimationFrame(rotateCamera);
  }

  function stopRotation() {
    isRotating = false;
    lastTimestamp = 0;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function handleZoom() {
    if (!mapStore.mapInstance) return;
    zoomLevel = mapStore.mapInstance.getZoom();
  }

  $effect(() => {
    if (mapStore.mapInstance) {
      const map = mapStore.mapInstance;
      map.on("mousedown", stopRotation);
      map.on("touchstart", stopRotation);
      map.on("wheel", stopRotation);
      map.on("zoom", handleZoom);
      return () => {
        map.off("mousedown", stopRotation);
        map.off("touchstart", stopRotation);
        map.off("wheel", stopRotation);
        map.off("zoom", handleZoom);
      };
    }
  });

  $effect(() => {
    if (mapStore.mapInstance && !directions) {
      const initDirections = () => {
        if (!directions && mapStore.mapInstance) {
          directions = new MapLibreGlDirections(mapStore.mapInstance, {
            api: "https://routing.openstreetmap.de/routed-foot/route/v1",
            profile: "foot",
          });
        }
      };

      if (mapStore.mapInstance.isStyleLoaded()) {
        initDirections();
      } else {
        mapStore.mapInstance.once("load", initDirections);
      }
    }
  });

  $effect(() => {
    if (!directions) return;

    if (locationStore.routeOrigin && locationStore.destination) {
      directions.setWaypoints([
        locationStore.routeOrigin,
        locationStore.destination,
      ]);
    } else {
      directions.clear();
    }
  });

  $effect(() => {
    const selectedId = jeepneyStore.selectedRouteId;
    const map = mapStore.mapInstance;
    if (!map) return;

    let cancelled = false;

    const apply = async () => {
      const route = selectedId
        ? (JEEPNEY_ROUTES.find((r) => r.id === selectedId) ?? null)
        : null;

      if (!route) {
        clearJeepneyRouteLayers(map);
        activeRouteId = null;
        activeRouteStops = [];
        return;
      }

      activeRouteId = route.id;
      activeRouteStops = route.stops;
      activeRouteColor = route.color;

      const ensureLayersAndPaint = (geometry: GeoJSON.LineString) => {
        if (cancelled) return;
        ensureJeepneyRouteLayers(map, route.color);
        const source = map.getSource(JEEPNEY_ROUTE_SOURCE_ID) as
          | mapGl.GeoJSONSource
          | undefined;
        const featureCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> =
          {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry,
                properties: { routeId: route.id },
              },
            ],
          };
        source?.setData(featureCollection);
      };

      const drawWhenReady = (action: () => void) => {
        if (map.isStyleLoaded()) action();
        else map.once("load", action);
      };

      drawWhenReady(() => {
        ensureJeepneyRouteLayers(map, route.color);
        ensureLayersAndPaint(buildStraightLineGeometry(route));
        fitMapToRoute(map, route);
      });

      const snapped = await fetchRouteGeometry(route);
      if (!cancelled && snapped) {
        drawWhenReady(() => ensureLayersAndPaint(snapped));
      }
    };

    apply();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const category = queryStore.category;
    const type = queryStore.type;
    const value = queryStore.inputValue;
    const map = mapStore.mapInstance;

    if (!map) return;

    untrack(() => {
      stopRotation();
      map.off("moveend", startRotation);
      if (category === "building" && type === "result") {
        if (!loaded) return;
        const currentBuilding = buildings.find(
          (building) => building.buildingName === value,
        );

        if (currentBuilding && currentBuilding.lon && currentBuilding.lat) {
          map.flyTo({
            center: [currentBuilding.lon, currentBuilding.lat],
            zoom: 18,
            pitch: 60,
            padding: calculatePadding(md.current),
            duration: 1500,
          });
          map.once("moveend", startRotation);
        }
      } else if (category === null) {
        map.flyTo({
          center: [121.24125948460573, 14.16323736946326],
          zoom: 15.81,
          pitch: 60,
          bearing: -154.48,
          duration: 1500,
        });
        if (directions) directions.clear();
      } else if (category === "room") {
        currentRoom.getRoomByCode(value).then(() => {
          if (
            currentRoom.value &&
            currentRoom.value.building &&
            currentRoom.value.building.lat &&
            currentRoom.value.building.lon
          ) {
            map.flyTo({
              center: [
                currentRoom.value.building.lon,
                currentRoom.value.building.lat,
              ],
              zoom: 18,
              pitch: 60,
              padding: calculatePadding(md.current),
              duration: 1500,
            });
            map.once("moveend", startRotation);
          }
        });
      } else if (category === "dorm") {
        if (!loaded) return;

        const currentDorm = dorms.find((dorm) => dorm.dormName === value);
        if (currentDorm && currentDorm.lon && currentDorm.lat) {
          map.flyTo({
            center: [currentDorm.lon, currentDorm.lat],
            zoom: 18,
            pitch: 60,
            padding: calculatePadding(md.current),
            duration: 1500,
          });
          map.once("moveend", startRotation);
        }
      }
    });
  });

  function handleMarkerClick(buildingName: string) {
    if (buildingName === queryStore.inputValue) return;
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: buildingName,
    });
    queryStore.inputValue = buildingName;
  }

  function handleDormMarkerClick(dormName: string) {
    if (dormName === queryStore.inputValue) return;
    queryStore.updateQuery({
      category: "dorm",
      type: "result",
      value: dormName,
    });
    queryStore.inputValue = dormName;
  }

  let activeBuildingName = $derived.by(() => {
    if (!queryStore.category || queryStore.type !== "result") return null;
    switch (queryStore.category) {
      case "building":
        return queryStore.inputValue;
      case "room": {
        return null;
        // const currentRoom = rooms.find(
        //   (room) => room.code === queryStore.inputValue,
        // );
        // return currentRoom && currentRoom.building
        //   ? currentRoom.building.name
        //   : null;
      }
      default:
        return null;
    }
  });

  let activeDormName = $derived.by(() => {
    if (queryStore.category === "dorm" && queryStore.type === "result") {
      return queryStore.inputValue;
    }
    return null;
  });
</script>

<div class="map-container">
  <MapLibre
    bind:map={mapStore.mapInstance}
    style="/liberty-customized.json"
    maxBounds={[
      [121.22951431520816, 14.143739048514412],
      [121.28117994803134, 14.18059150108623],
    ]}
    center={[121.24224620509085, 14.16283754850545]}
    zoom={17}
    pitch={60}
    bearing={-154.48}
    minZoom={13}
    class="map"
  >
    {#if locationStore.coords}
      <Marker lngLat={locationStore.coords}>
        <div class="user-location-pin"></div>
      </Marker>
    {/if}
    {#each buildings as building}
      {#if building.lat && building.lon}
        <Marker
          lngLat={[building.lon, building.lat]}
          onclick={() => handleMarkerClick(building.buildingName)}
        >
          <div
            class="pin"
            class:active={activeBuildingName === building.buildingName}
            title={building.buildingName}
          >
            <University size="20" />
            <div
              class="pin-label"
              class:active={zoomLevel >= 17}
              transition:fade
            >
              {building.buildingName}
            </div>
          </div>
        </Marker>
      {/if}
    {/each}
    {#if activeRouteId}
      {#each activeRouteStops as stop, i (`${activeRouteId}-${i}-${stop.name}`)}
        <Marker lngLat={[stop.lon, stop.lat]}>
          <div
            class="jeepney-stop-pin"
            style:--stop-color={activeRouteColor}
            title={stop.name}
          >
            <span class="stop-index">{i + 1}</span>
            <span class="stop-label" transition:fade>{stop.name}</span>
          </div>
        </Marker>
      {/each}
    {/if}

    {#each filteredDorms as dorm}
      {#if dorm.lat && dorm.lon}
        <Marker
          lngLat={[dorm.lon, dorm.lat]}
          onclick={() => handleDormMarkerClick(dorm.dormName)}
        >
          <div
            class="dorm-pin"
            class:active={activeDormName === dorm.dormName}
            class:private={!dorm.isUpManaged}
            title={dorm.dormName}
          >
            <House size="18" />
            <div
              class="pin-label"
              class:active={zoomLevel >= 17}
              transition:fade
            >
              {dorm.dormName}
            </div>
          </div>
        </Marker>
      {/if}
    {/each}
  </MapLibre>
</div>

<style>
  .map-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .user-location-pin {
    width: 1rem;
    height: 1rem;
    background-color: #4285f4;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 70;
  }
  .user-location-pin::after {
    content: "";
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    border: 2px solid #4285f4;
    animation: pulsate 2s ease-out infinite;
    opacity: 0;
  }
  @keyframes pulsate {
    0% {
      transform: scale(0.5);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  .pin {
    line-height: 0;
    padding: 0.25rem;
    color: white;
    background-color: hsl(5, 53%, 32%);
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.3);
    transition:
      transform 0.2s,
      scale 1.5s;

    &.active {
      z-index: 60;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        outline: 0.125rem solid hsl(5, 53%, 40%);
        outline-offset: 0.125rem;
      }
      .pin-label {
        background-color: hsl(5, 53%, 32%);
        color: white;
        opacity: 1;
      }
    }
    .pin-label {
      line-height: initial;
      color: black;
      position: absolute;
      bottom: calc(100% + 0.5rem);
      left: 50%;
      translate: -50% 0;
      background-color: white;
      border-radius: 0.5rem;
      padding: 0.25rem 0.75rem;
      width: max-content;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      &.active {
        opacity: 1;
      }
    }
  }

  .pin:hover {
    background-color: hsl(5, 53%, 40%);

    .pin-label {
      opacity: 1;
    }
  }

  .jeepney-stop-pin {
    --stop-color: #dc2626;
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    background-color: var(--stop-color);
    border: 2px solid white;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
    cursor: default;
    position: relative;
    z-index: 50;
  }
  .jeepney-stop-pin .stop-index {
    pointer-events: none;
  }
  .jeepney-stop-pin .stop-label {
    position: absolute;
    bottom: calc(100% + 0.4rem);
    left: 50%;
    translate: -50% 0;
    background-color: white;
    color: hsl(0, 0%, 15%);
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }
  .jeepney-stop-pin:hover .stop-label {
    opacity: 1;
  }

  .dorm-pin {
    line-height: 0;
    padding: 0.25rem;
    color: white;
    background-color: hsl(170, 50%, 35%);
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.3);
    transition:
      transform 0.2s,
      scale 1.5s;

    &.active {
      z-index: 60;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        outline: 0.125rem solid hsl(170, 50%, 45%);
        outline-offset: 0.125rem;
      }
      .pin-label {
        background-color: hsl(170, 50%, 35%);
        color: white;
        opacity: 1;
      }
    }
    .pin-label {
      line-height: initial;
      color: black;
      position: absolute;
      bottom: calc(100% + 0.5rem);
      left: 50%;
      translate: -50% 0;
      background-color: white;
      border-radius: 0.5rem;
      padding: 0.25rem 0.75rem;
      width: max-content;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      &.active {
        opacity: 1;
      }
    }
  }

  .dorm-pin:hover {
    background-color: hsl(170, 50%, 45%);

    .pin-label {
      opacity: 1;
    }
  }

  .dorm-pin.private {
    background-color: hsl(25, 70%, 50%);

    &.active {
      &::before {
        outline-color: hsl(25, 70%, 60%);
      }
      .pin-label {
        background-color: hsl(25, 70%, 50%);
      }
    }
  }

  .dorm-pin.private:hover {
    background-color: hsl(25, 70%, 60%);
  }
</style>
