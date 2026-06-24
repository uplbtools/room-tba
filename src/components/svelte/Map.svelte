<script lang="ts">
  import { MapLibre, Marker } from "svelte-maplibre";
  import { getAppData } from "../../lib/context";
  import {
    queryStore,
    locationStore,
    mapStore,
    mapEditStore,
    jeepneyStore,
    dormFilter,
    currentRoom,
    adminAuthStore,
    toastStore,
  } from "../../lib/store.svelte";
  import { untrack } from "svelte";
  import { fade } from "svelte/transition";
  import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
  import House from "@lucide/svelte/icons/house";
  import Move from "@lucide/svelte/icons/move";
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
  let selectedEditKey = $state<string | null>(null);
  let savingEditKey = $state<string | null>(null);
  let savedEditKey = $state<string | null>(null);
  let failedEditKey = $state<string | null>(null);
  let hoveredEditKey = $state<string | null>(null);
  let undoingEditKey = $state<string | null>(null);
  let undoShortcutLabel = $state("Ctrl+Z");
  let editStatusMessage = $state<string | null>(null);
  type EditableEntityType = "building" | "dorm";
  type EditableCoords = { lat: number; lon: number };
  type EditableVersionedPosition = EditableCoords & { version: number };
  type EditableUpdateResponse = {
    building?: EditableVersionedPosition;
    dorm?: EditableVersionedPosition;
  };
  type EditableConflictResponse = {
    error?: string;
    latest?: EditableVersionedPosition | null;
  };
  class ClientEditConflictError extends Error {
    latest: EditableVersionedPosition | null;

    constructor(message: string, latest: EditableVersionedPosition | null) {
      super(message);
      this.name = "ClientEditConflictError";
      this.latest = latest;
    }
  }
  type EditMove = {
    type: EditableEntityType;
    id: number;
    name: string;
    key: string;
    previous: EditableCoords;
    current: EditableCoords;
    version: number;
  };
  let positionOverrides = $state<Record<string, EditableVersionedPosition>>({});
  let undoStack = $state<EditMove[]>([]);
  let redoStack = $state<EditMove[]>([]);
  const undoMove = $derived(undoStack.at(-1) ?? null);
  const redoMove = $derived(redoStack.at(-1) ?? null);

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

  function buildingEditKey(id: number) {
    return `building:${id}`;
  }

  function dormEditKey(id: number) {
    return `dorm:${id}`;
  }

  function getEditablePosition(
    key: string,
    fallback: EditableVersionedPosition,
  ): EditableVersionedPosition {
    return positionOverrides[key] ?? fallback;
  }

  function getLoadedVersion(version: number | undefined): number {
    return Number.isInteger(version) ? version : 1;
  }

  function isMapEditEnabled() {
    return adminAuthStore.isAdmin && mapEditStore.enabled;
  }

  function handleEditablePinEnter(key: string) {
    if (!isMapEditEnabled()) return;
    hoveredEditKey = key;
  }

  function handleEditablePinLeave(key: string) {
    if (!isMapEditEnabled()) return;
    if (hoveredEditKey === key) hoveredEditKey = null;
  }

  function beginMarkerDrag(key: string) {
    if (!isMapEditEnabled()) return;
    selectedEditKey = key;
    failedEditKey = null;
    stopRotation();
  }

  function markSaved(key: string) {
    savedEditKey = key;
    setTimeout(() => {
      if (savedEditKey === key) savedEditKey = null;
    }, 1800);
  }

  function setEditStatus(message: string) {
    editStatusMessage = message;
    setTimeout(() => {
      if (editStatusMessage === message) editStatusMessage = null;
    }, 3500);
  }

  function editErrorMessage(name: string, fallback: string, error: unknown) {
    const reason = error instanceof Error ? error.message : fallback;
    const normalizedReason = reason.toLowerCase().replace(/[.?!]+$/, "");
    const genericReasons = new Set([
      fallback.toLowerCase().replace(/[.?!]+$/, ""),
      "failed to save building",
      "failed to save dorm",
      "failed to save building position",
      "failed to save dorm position",
    ]);

    if (genericReasons.has(normalizedReason)) {
      return `${name} failed to save.`;
    }

    return `${name} failed to save: ${reason}`;
  }

  async function patchPosition(
    type: EditableEntityType,
    id: number,
    coords: EditableCoords,
    version: number,
  ): Promise<EditableVersionedPosition> {
    const endpoint =
      type === "building"
        ? `/api/admin/buildings/${id}`
        : `/api/admin/dorms/${id}`;
    const res = await fetch(endpoint, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...coords, version }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as
        | EditableConflictResponse
        | { error?: string };
      if (res.status === 409) {
        const conflict = data as EditableConflictResponse;
        throw new ClientEditConflictError(
          conflict.error ?? "This item was changed by another editor.",
          conflict.latest ?? null,
        );
      }
      throw new Error(data.error ?? `Save failed (${res.status})`);
    }

    const data = (await res.json()) as EditableUpdateResponse;
    const updated = type === "building" ? data.building : data.dorm;
    if (!updated)
      throw new Error("Save response did not include updated data.");
    return updated;
  }

  function setLocalPosition(
    type: EditableEntityType,
    id: number,
    coords: EditableVersionedPosition,
  ) {
    const key = type === "building" ? buildingEditKey(id) : dormEditKey(id);
    positionOverrides = { ...positionOverrides, [key]: coords };

    if (type === "building") {
      const building = buildings.find((b) => b.id === id);
      if (building) {
        building.lat = coords.lat;
        building.lon = coords.lon;
        building.version = coords.version;
      }
      return;
    }

    const dorm = dorms.find((d) => d.id === id);
    if (dorm) {
      dorm.lat = coords.lat;
      dorm.lon = coords.lon;
      dorm.version = coords.version;
    }
  }

  function recordMove(
    type: EditableEntityType,
    id: number,
    name: string,
    key: string,
    previous: EditableCoords,
    current: EditableCoords,
    version: number,
  ) {
    undoStack = [
      ...undoStack,
      { type, id, name, key, previous, current, version },
    ];
    redoStack = [];
  }

  async function saveBuildingPosition(
    id: number,
    name: string,
    previous: EditableVersionedPosition,
    current: { lat: number; lon: number },
    version: number,
  ): Promise<void> {
    const key = buildingEditKey(id);
    savingEditKey = key;
    failedEditKey = null;

    try {
      const updated = await patchPosition("building", id, current, version);
      setLocalPosition("building", id, updated);
      recordMove("building", id, name, key, previous, current, updated.version);
      markSaved(key);
      setEditStatus(`${name} saved. You can undo this move.`);
    } catch (error) {
      failedEditKey = key;
      if (error instanceof ClientEditConflictError) {
        if (error.latest) setLocalPosition("building", id, error.latest);
        toastStore.show(editErrorMessage(name, error.message, error), "error");
        return;
      }
      setLocalPosition("building", id, previous);
      toastStore.show(
        editErrorMessage(name, "Failed to save building position.", error),
        "error",
      );
    } finally {
      if (savingEditKey === key) savingEditKey = null;
      if (selectedEditKey === key) selectedEditKey = null;
    }
  }

  async function saveDormPosition(
    id: number,
    name: string,
    previous: EditableVersionedPosition,
    current: { lat: number; lon: number },
    version: number,
  ): Promise<void> {
    const key = dormEditKey(id);
    savingEditKey = key;
    failedEditKey = null;

    try {
      const updated = await patchPosition("dorm", id, current, version);
      setLocalPosition("dorm", id, updated);
      recordMove("dorm", id, name, key, previous, current, updated.version);
      markSaved(key);
      setEditStatus(`${name} saved. You can undo this move.`);
    } catch (error) {
      failedEditKey = key;
      if (error instanceof ClientEditConflictError) {
        if (error.latest) setLocalPosition("dorm", id, error.latest);
        toastStore.show(editErrorMessage(name, error.message, error), "error");
        return;
      }
      setLocalPosition("dorm", id, previous);
      toastStore.show(
        editErrorMessage(name, "Failed to save dorm position.", error),
        "error",
      );
    } finally {
      if (savingEditKey === key) savingEditKey = null;
      if (selectedEditKey === key) selectedEditKey = null;
    }
  }

  async function handleBuildingDragEnd(
    e: { marker: mapGl.Marker },
    id: number,
    name: string,
    previous: EditableVersionedPosition,
  ) {
    if (!isMapEditEnabled()) return;
    const lngLat = e.marker.getLngLat();
    await saveBuildingPosition(
      id,
      name,
      previous,
      {
        lat: lngLat.lat,
        lon: lngLat.lng,
      },
      previous.version,
    );
  }

  async function handleDormDragEnd(
    e: { marker: mapGl.Marker },
    id: number,
    name: string,
    previous: EditableVersionedPosition,
  ) {
    if (!isMapEditEnabled()) return;
    const lngLat = e.marker.getLngLat();
    await saveDormPosition(
      id,
      name,
      previous,
      {
        lat: lngLat.lat,
        lon: lngLat.lng,
      },
      previous.version,
    );
  }

  async function undoLastMove() {
    if (!undoMove || !isMapEditEnabled()) return;

    const move = undoMove;
    undoingEditKey = move.key;
    savingEditKey = move.key;
    failedEditKey = null;

    try {
      const updated = await patchPosition(
        move.type,
        move.id,
        move.previous,
        move.version,
      );
      setLocalPosition(move.type, move.id, updated);
      markSaved(move.key);
      setEditStatus(`Undid move for ${move.name}.`);
      undoStack = undoStack.slice(0, -1);
      redoStack = [...redoStack, { ...move, version: updated.version }];
    } catch (error) {
      failedEditKey = move.key;
      if (error instanceof ClientEditConflictError) {
        if (error.latest) setLocalPosition(move.type, move.id, error.latest);
        toastStore.show(error.message, "error");
        return;
      }
      toastStore.show(
        error instanceof Error ? error.message : "Failed to undo last move.",
        "error",
      );
    } finally {
      if (savingEditKey === move.key) savingEditKey = null;
      if (undoingEditKey === move.key) undoingEditKey = null;
    }
  }

  async function redoMoveBranch() {
    if (!redoMove || !isMapEditEnabled()) return;

    const move = redoMove;
    undoingEditKey = move.key;
    savingEditKey = move.key;
    failedEditKey = null;

    try {
      const updated = await patchPosition(
        move.type,
        move.id,
        move.current,
        move.version,
      );
      setLocalPosition(move.type, move.id, updated);
      markSaved(move.key);
      setEditStatus(`Redid move for ${move.name}.`);
      redoStack = redoStack.slice(0, -1);
      undoStack = [...undoStack, { ...move, version: updated.version }];
    } catch (error) {
      failedEditKey = move.key;
      if (error instanceof ClientEditConflictError) {
        if (error.latest) setLocalPosition(move.type, move.id, error.latest);
        toastStore.show(error.message, "error");
        return;
      }
      toastStore.show(
        error instanceof Error ? error.message : "Failed to redo move.",
        "error",
      );
    } finally {
      if (savingEditKey === move.key) savingEditKey = null;
      if (undoingEditKey === move.key) undoingEditKey = null;
    }
  }

  function handleMapEditKeydown(e: KeyboardEvent) {
    if (!isMapEditEnabled()) return;
    const isModifierPressed = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (isModifierPressed && key === "z") {
      e.preventDefault();
      if (e.shiftKey) redoMoveBranch();
      else undoLastMove();
    } else if (isModifierPressed && key === "y") {
      e.preventDefault();
      redoMoveBranch();
    }
  }

  $effect(() => {
    if (typeof navigator === "undefined") return;
    undoShortcutLabel = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? "Cmd+Z"
      : "Ctrl+Z";
  });

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
    if (!adminAuthStore.isAdmin && mapEditStore.enabled) {
      mapEditStore.close();
    }
    if (!mapEditStore.enabled) {
      hoveredEditKey = null;
      selectedEditKey = null;
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
    if (isMapEditEnabled()) return;
    if (buildingName === queryStore.inputValue) return;
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: buildingName,
    });
    queryStore.inputValue = buildingName;
  }

  function handleDormMarkerClick(dormName: string) {
    if (isMapEditEnabled()) return;
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

<svelte:window onkeydown={handleMapEditKeydown} />

<div class="map-container">
  {#if isMapEditEnabled()}
    <div class="map-edit-toolbar" role="status" aria-live="polite">
      <div class="map-edit-summary">
        <div class="map-edit-copy">
          <strong>Editing map</strong>
          <span>
            {editStatusMessage ??
              `Drag pins to move them. ${undoShortcutLabel} undo, ${undoShortcutLabel.replace("Z", "Y")} redo.`}
          </span>
        </div>
      </div>
      <div class="map-edit-actions">
        <button
          class="map-edit-action"
          disabled={!undoMove || undoingEditKey !== null}
          onclick={undoLastMove}
          title={undoMove
            ? `Undo move for ${undoMove.name}`
            : "No move to undo yet"}
        >
          {#if undoingEditKey && undoMove}
            Undoing
          {:else}
            Undo
          {/if}
        </button>
        <button
          class="map-edit-action"
          disabled={!redoMove || undoingEditKey !== null}
          onclick={redoMoveBranch}
          title={redoMove
            ? `Redo move for ${redoMove.name}`
            : "No move to redo yet"}
        >
          {#if undoingEditKey && redoMove}
            Redoing
          {:else}
            Redo
          {/if}
        </button>
      </div>
    </div>
  {/if}
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
    {#each buildings as building (`building:${building.id}:${isMapEditEnabled()}`)}
      {#if building.lat && building.lon}
        {@const editKey = buildingEditKey(building.id)}
        {@const position = getEditablePosition(editKey, {
          lat: building.lat,
          lon: building.lon,
          version: getLoadedVersion(building.version),
        })}
        <Marker
          lngLat={[position.lon, position.lat]}
          draggable={isMapEditEnabled()}
          onclick={() => handleMarkerClick(building.buildingName)}
          ondragstart={() => beginMarkerDrag(editKey)}
          ondragend={(e) =>
            handleBuildingDragEnd(e, building.id, building.buildingName, {
              lat: position.lat,
              lon: position.lon,
            })}
        >
          <div
            class="pin"
            class:active={activeBuildingName === building.buildingName}
            class:editable={isMapEditEnabled()}
            class:editing={selectedEditKey === editKey}
            class:hovered={hoveredEditKey === editKey}
            class:saving={savingEditKey === editKey}
            class:saved={savedEditKey === editKey}
            class:failed={failedEditKey === editKey}
            title={building.buildingName}
            onpointerenter={() => handleEditablePinEnter(editKey)}
            onpointerleave={() => handleEditablePinLeave(editKey)}
          >
            <University size="20" />
            {#if isMapEditEnabled()}
              <span class="drag-handle" aria-hidden="true">
                <Move size={13} />
              </span>
            {/if}
            <div
              class="pin-label"
              class:active={zoomLevel >= 17 || hoveredEditKey === editKey}
              transition:fade
            >
              {building.buildingName}
              {#if savingEditKey === editKey}
                <span class="pin-status">Saving</span>
              {:else if savedEditKey === editKey}
                <span class="pin-status">Saved</span>
              {:else if failedEditKey === editKey}
                <span class="pin-status">Failed</span>
              {/if}
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

    {#each filteredDorms as dorm (`dorm:${dorm.id}:${isMapEditEnabled()}`)}
      {#if dorm.lat && dorm.lon}
        {@const editKey = dormEditKey(dorm.id)}
        {@const position = getEditablePosition(editKey, {
          lat: dorm.lat,
          lon: dorm.lon,
          version: getLoadedVersion(dorm.version),
        })}
        <Marker
          lngLat={[position.lon, position.lat]}
          draggable={isMapEditEnabled()}
          onclick={() => handleDormMarkerClick(dorm.dormName)}
          ondragstart={() => beginMarkerDrag(editKey)}
          ondragend={(e) =>
            handleDormDragEnd(e, dorm.id, dorm.dormName, {
              lat: position.lat,
              lon: position.lon,
            })}
        >
          <div
            class="dorm-pin"
            class:active={activeDormName === dorm.dormName}
            class:private={!dorm.isUpManaged}
            class:editable={isMapEditEnabled()}
            class:editing={selectedEditKey === editKey}
            class:hovered={hoveredEditKey === editKey}
            class:saving={savingEditKey === editKey}
            class:saved={savedEditKey === editKey}
            class:failed={failedEditKey === editKey}
            title={dorm.dormName}
            onpointerenter={() => handleEditablePinEnter(editKey)}
            onpointerleave={() => handleEditablePinLeave(editKey)}
          >
            <House size="18" />
            {#if isMapEditEnabled()}
              <span class="drag-handle" aria-hidden="true">
                <Move size={13} />
              </span>
            {/if}
            <div
              class="pin-label"
              class:active={zoomLevel >= 17 || hoveredEditKey === editKey}
              transition:fade
            >
              {dorm.dormName}
              {#if savingEditKey === editKey}
                <span class="pin-status">Saving</span>
              {:else if savedEditKey === editKey}
                <span class="pin-status">Saved</span>
              {:else if failedEditKey === editKey}
                <span class="pin-status">Failed</span>
              {/if}
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

  .map-edit-toolbar {
    position: absolute;
    bottom: 4.75rem;
    left: 50%;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100% - 1rem);
    min-height: 3.25rem;
    padding: 0.375rem 0.375rem 0.375rem 0.75rem;
    border: 1px solid hsla(160, 52%, 32%, 0.35);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(12px);
    color: hsl(0, 0%, 12%);
    font-size: 0.8125rem;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    pointer-events: auto;
  }

  .map-edit-summary {
    display: flex;
    min-width: 0;
    align-items: center;
  }

  .map-edit-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.05rem;
    padding-left: 0.1rem;
  }

  .map-edit-copy strong {
    color: hsl(160, 84%, 18%);
    font-size: 0.75rem;
    line-height: 1.15;
  }

  .map-edit-copy span {
    display: block;
    max-width: 18rem;
    overflow: hidden;
    color: hsl(0, 0%, 24%);
    font-size: 0.75rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .map-edit-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-left: 0.25rem;
  }

  .map-edit-action {
    width: 4.75rem;
    overflow: hidden;
    padding: 0.48rem 0.6rem;
    border: none;
    border-radius: 999px;
    background: hsl(160, 84%, 26%);
    color: white;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .map-edit-action:hover:not(:disabled) {
    background: hsl(160, 84%, 20%);
  }

  .map-edit-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  @media (max-width: 48rem) {
    .map-edit-toolbar {
      right: 0.5rem;
      bottom: 4.25rem;
      left: 0.5rem;
      transform: none;
      width: auto;
      justify-content: space-between;
      border-radius: 1.25rem;
    }

    .map-edit-copy span {
      max-width: 100%;
    }

    .map-edit-actions {
      flex: 0 0 auto;
    }

    .map-edit-action {
      width: 4.2rem;
      padding-inline: 0.55rem;
    }
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

  .pin.editable,
  .dorm-pin.editable {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border-radius: 999px;
    padding-right: 0.5rem;
    cursor: grab;
    touch-action: none;
  }

  .pin.hovered,
  .dorm-pin.hovered {
    transform: scale(1.08);
    box-shadow:
      0 0 0 0.2rem rgba(255, 255, 255, 0.9),
      0 4px 0.75rem rgba(0, 0, 0, 0.28);
  }

  .pin.editing,
  .dorm-pin.editing {
    cursor: grabbing;
    z-index: 70;
    transform: scale(1.14);
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    opacity: 0.92;
    pointer-events: none;
  }

  .pin.saving,
  .dorm-pin.saving {
    outline: 0.16rem solid hsl(45, 94%, 47%);
    outline-offset: 0.15rem;
  }

  .pin.saved,
  .dorm-pin.saved {
    outline: 0.16rem solid hsl(145, 63%, 42%);
    outline-offset: 0.15rem;
  }

  .pin.failed,
  .dorm-pin.failed {
    outline: 0.16rem solid hsl(0, 72%, 51%);
    outline-offset: 0.15rem;
  }

  .pin-status {
    margin-left: 0.5rem;
    padding-left: 0.5rem;
    border-left: 1px solid currentColor;
    font-size: 0.6875rem;
    opacity: 0.85;
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
