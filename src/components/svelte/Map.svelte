<script lang="ts">
  import { MapLibre, Marker } from "svelte-maplibre";
  import { getAppActions, getAppData } from "../../lib/context";
  import {
    queryStore,
    locationStore,
    mapStore,
    mapViewStore,
    mapEditStore,
    eventPlacementStore,
    sidePanelStore,
    jeepneyStore,
    currentRoom,
    adminAuthStore,
    toastStore,
    buildingTypeFilter,
    terrainStore,
  } from "../../lib/store.svelte";
  import { untrack } from "svelte";
  import { fade } from "svelte/transition";
  import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import X from "@lucide/svelte/icons/x";
  import House from "@lucide/svelte/icons/house";
  import Move from "@lucide/svelte/icons/move";
  import Undo2 from "@lucide/svelte/icons/undo-2";
  import Redo2 from "@lucide/svelte/icons/redo-2";
  import University from "@lucide/svelte/icons/university";
  import EventMapPin from "./map/EventMapPin.svelte";
  import MapEntityPin from "./map/MapEntityPin.svelte";
  import { MediaQuery } from "svelte/reactivity";
  import * as mapGl from "maplibre-gl";
  import type { FeatureCollection, LineString } from "geojson";
  import type { EventData } from "../../lib/types";
  import {
    JEEPNEY_ROUTES,
    type JeepneyRoute,
    type JeepneyStop,
  } from "../../constants/jeepney-routes";
  import {
    CAMPUS_DEFAULT_CAMERA,
    CAMPUS_MAX_BOUNDS,
    MAKILING_TERRAIN_CAMERA,
    MAKILING_TERRAIN_MAX_BOUNDS,
    MAKILING_TERRAIN_SOURCE_BOUNDS,
    TERRAIN_HILLSHADE_BEFORE_LAYER_ID,
    TERRAIN_HILLSHADE_LAYER_ID,
    TERRAIN_SOURCE_ID,
    TERRAIN_TILE_FAILURE_MESSAGE,
    TERRAIN_TILEJSON_URL,
    TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE,
  } from "../../constants/map-terrain";
  import {
    buildingMatchesTypeFilter,
    dormMatchesTypeFilter,
  } from "../../constants/building-types";
  import { getEventImage } from "../../lib/event-images";
  import {
    formatCampusDateShort,
    formatCampusTime,
  } from "../../lib/event-time";
  import {
    completeMapMoveRedo,
    completeMapMoveUndo,
    getMapEditShortcutAction,
    recordMapMove,
    type MapMoveCoordinates,
    type VersionedMapMove,
  } from "../../lib/map-move-history";
  const data = getAppData();
  const appActions = getAppActions();
  const { buildings, dorms, events, loaded } = $derived(data());
  const filteredBuildings = $derived.by(() => {
    if (!loaded) return [];
    return buildings.filter((building) =>
      buildingMatchesTypeFilter(building, buildingTypeFilter.value),
    );
  });
  const filteredDorms = $derived.by(() => {
    if (!loaded) return [];
    return dorms.filter((dorm) =>
      dormMatchesTypeFilter(dorm, buildingTypeFilter.value),
    );
  });

  // Event titles are not unique, so resolve the selected event by its slug when
  // one is available, falling back to the title only for legacy/partial state.
  function findSelectedEvent(eventList: EventData[]): EventData | null {
    const slug = queryStore.selectedEventSlug;
    if (slug) return eventList.find((event) => event.slug === slug) ?? null;
    return (
      eventList.find((event) => event.title === queryStore.inputValue) ?? null
    );
  }
  let directions: MapLibreGlDirections | undefined = $state.raw();

  const JEEPNEY_ROUTE_SOURCE_ID = "jeepney-route-line";
  const JEEPNEY_ROUTE_LAYER_ID = "jeepney-route-line";
  const JEEPNEY_ROUTE_LAYER_CASING_ID = "jeepney-route-line-casing";
  const EVENT_ROUTE_SOURCE_ID = "event-route-line";
  const EVENT_ROUTE_LAYER_ID = "event-route-line";
  const EVENT_ROUTE_LAYER_CASING_ID = "event-route-line-casing";
  const BUILDING_3D_LAYER_ID = "building-3d";

  let activeRouteId = $state<string | null>(null);
  let activeRouteStops = $state<DisplayJeepneyRoute["stops"]>([]);
  let activeRouteColor = $state<string>("#dc2626");
  let terrainModeWasEnabled = false;
  let selectedEditKey = $state<string | null>(null);
  let savingEditKey = $state<string | null>(null);
  let savedEditKey = $state<string | null>(null);
  let failedEditKey = $state<string | null>(null);
  let hoveredEditKey = $state<string | null>(null);
  let expandedEventGroupKey = $state<string | null>(null);
  let undoingEditKey = $state<string | null>(null);
  let undoShortcutLabel = $state("Ctrl+Z");
  let editStatusMessage = $state<string | null>(null);
  type EditableEntityType = "building" | "dorm";
  type EditableCoords = MapMoveCoordinates;
  type EditableVersionedPosition = EditableCoords & { version: number };
  type EditableUpdateResponse = {
    building?: EditableVersionedPosition;
    dorm?: EditableVersionedPosition;
  };
  type EventLocationWriteValue = Partial<{
    id: number;
    anchorType: EventData["locations"][number]["anchorType"];
    buildingId: number | null;
    dormId: number | null;
    label: string;
    lat: number | null;
    lon: number | null;
    highlightPriority: number;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  type EventLocationsPatchResponse = {
    event?: EventData;
    latest?: EventData | null;
    error?: string;
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
  class ClientEventConflictError extends Error {
    latest: EventData | null;

    constructor(message: string, latest: EventData | null) {
      super(message);
      this.name = "ClientEventConflictError";
      this.latest = latest;
    }
  }
  type EntityEditMove = VersionedMapMove & {
    kind: "entity";
    entityType: EditableEntityType;
    id: number;
  };
  type EventLocationEditMove = VersionedMapMove & {
    kind: "eventLocation";
    eventId: number;
    locationId: number;
    previousLocations: EventLocationWriteValue[];
    currentLocations: EventLocationWriteValue[];
  };
  type EditMove = EntityEditMove | EventLocationEditMove;
  let positionOverrides = $state<Record<string, EditableVersionedPosition>>({});
  // `events` is `$state.raw`, so in-place updates do not invalidate derived
  // marker positions. Mirror the building/dorm `positionOverrides` pattern with
  // a reactive override so the editable event marker reflects saves and, on a
  // failed save, rolls back to the previous/server position.
  let eventLocationOverrides = $state<Record<string, EditableCoords>>({});
  let undoStack = $state<EditMove[]>([]);
  let redoStack = $state<EditMove[]>([]);
  const undoMove = $derived(undoStack.at(-1) ?? null);
  const redoMove = $derived(redoStack.at(-1) ?? null);

  async function fetchRouteGeometry(
    route: JeepneyRoute,
  ): Promise<LineString | null> {
    if (route.stops.length < 2) return null;
    const coordsParam = route.stops
      .map((stop) => `${stop.lon},${stop.lat}`)
      .join(";");
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        routes?: { geometry?: LineString }[];
      };
      const geometry = data.routes?.[0]?.geometry;
      if (!geometry || geometry.type !== "LineString") return null;
      return geometry;
    } catch {
      return null;
    }
  }

  function buildStraightLineGeometry(route: JeepneyRoute): LineString {
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

  function ensureEventRouteLayers(map: mapGl.MapLibreMap) {
    if (!map.getSource(EVENT_ROUTE_SOURCE_ID)) {
      map.addSource(EVENT_ROUTE_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    }

    if (!map.getLayer(EVENT_ROUTE_LAYER_CASING_ID)) {
      map.addLayer({
        id: EVENT_ROUTE_LAYER_CASING_ID,
        type: "line",
        source: EVENT_ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 7,
          "line-opacity": 0.9,
        },
      });
    }

    if (!map.getLayer(EVENT_ROUTE_LAYER_ID)) {
      map.addLayer({
        id: EVENT_ROUTE_LAYER_ID,
        type: "line",
        source: EVENT_ROUTE_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#7b1113",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });
    }
  }

  function clearEventRouteLayers(map: mapGl.MapLibreMap) {
    if (map.getLayer(EVENT_ROUTE_LAYER_ID))
      map.removeLayer(EVENT_ROUTE_LAYER_ID);
    if (map.getLayer(EVENT_ROUTE_LAYER_CASING_ID)) {
      map.removeLayer(EVENT_ROUTE_LAYER_CASING_ID);
    }
    if (map.getSource(EVENT_ROUTE_SOURCE_ID))
      map.removeSource(EVENT_ROUTE_SOURCE_ID);
  }

  function buildEventRouteGeometry(
    route: EventData["routes"][number],
  ): LineString | null {
    const coordinates = route.stops
      .filter((stop) => stop.resolvedLon !== null && stop.resolvedLat !== null)
      .map((stop) => [stop.resolvedLon as number, stop.resolvedLat as number]);
    if (coordinates.length < 2) return null;
    return { type: "LineString", coordinates };
  }

  function buildSelectedEventRouteFeatures(
    event: EventData,
  ): FeatureCollection<LineString>["features"] {
    return event.routes.flatMap((route) => {
      const geometry = buildEventRouteGeometry(route);
      if (!geometry) return [];
      return [
        {
          type: "Feature" as const,
          geometry,
          properties: { eventId: event.id, routeId: route.id },
        },
      ];
    });
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

  function getEventMapLocations(event: EventData) {
    return event.locations.filter(
      (location) =>
        location.resolvedLon !== null && location.resolvedLat !== null,
    );
  }

  function focusMapOnEvent(map: mapGl.MapLibreMap, event: EventData) {
    const points: [number, number][] = [];
    for (const location of getEventMapLocations(event)) {
      points.push([
        location.resolvedLon as number,
        location.resolvedLat as number,
      ]);
    }
    // Include route geometry so events whose route stops extend beyond their
    // primary locations still fit fully within the viewport.
    for (const route of event.routes) {
      for (const stop of route.stops) {
        if (stop.resolvedLon !== null && stop.resolvedLat !== null) {
          points.push([stop.resolvedLon, stop.resolvedLat]);
        }
      }
    }
    if (points.length === 0) return false;

    if (points.length === 1) {
      map.flyTo({
        center: points[0],
        zoom: 17,
        pitch: 50,
        padding: calculatePadding(md.current),
        duration: 1200,
      });
      return true;
    }

    const bounds = new mapGl.LngLatBounds();
    for (const point of points) {
      bounds.extend(point);
    }
    map.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      duration: 1000,
      pitch: 30,
      maxZoom: 17,
    });
    return true;
  }

  async function createEventAtMapPoint(coords: EditableCoords) {
    if (
      !adminAuthStore.isAdmin ||
      !eventPlacementStore.draft ||
      eventPlacementStore.creating
    )
      return;

    const draft = eventPlacementStore.draft;
    eventPlacementStore.beginCreate();
    stopRotation();

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          recurrence: "none",
          isActive: true,
          includeInSeo: true,
          locations: [
            {
              anchorType: "custom",
              buildingId: null,
              dormId: null,
              label: "Event marker",
              lat: coords.lat,
              lon: coords.lon,
              isPrimary: true,
              sortOrder: 0,
            },
          ],
          routes: [],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        event?: EventData;
      };

      if (!res.ok || !data.event) {
        throw new Error(data.error ?? `Create failed (${res.status})`);
      }

      appActions.replaceEvent(data.event);
      queryStore.updateQuery({
        category: "event",
        type: "result",
        value: data.event.title,
        eventSlug: data.event.slug,
      });
      queryStore.inputValue = data.event.title;
      sidePanelStore.expand();
      if (!mapEditStore.enabled) mapEditStore.toggle();
      eventPlacementStore.finishCreate(data.event.id);
      mapStore.mapInstance?.flyTo({
        center: [coords.lon, coords.lat],
        zoom: 17,
        pitch: 50,
        padding: calculatePadding(md.current),
        duration: 800,
      });
      toastStore.show(
        `${data.event.title} created. Drag its marker on the map to refine the location.`,
        "success",
      );
    } catch (error) {
      eventPlacementStore.failCreate();
      toastStore.show(
        error instanceof Error ? error.message : "Failed to create event.",
        "error",
      );
    }
  }

  function ensureTerrainRendering(map: mapGl.MapLibreMap) {
    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: "raster-dem",
        url: TERRAIN_TILEJSON_URL,
        bounds: MAKILING_TERRAIN_SOURCE_BOUNDS,
        maxzoom: 14,
        tileSize: 512,
      });
    }

    if (!map.getLayer(TERRAIN_HILLSHADE_LAYER_ID)) {
      map.addLayer(
        {
          id: TERRAIN_HILLSHADE_LAYER_ID,
          type: "hillshade",
          source: TERRAIN_SOURCE_ID,
          layout: { visibility: "none" },
          paint: {
            "hillshade-accent-color": "rgba(112, 79, 40, 0.28)",
            "hillshade-exaggeration": 0.85,
            "hillshade-highlight-color": "rgba(255, 244, 214, 0.35)",
            "hillshade-illumination-anchor": "viewport",
            "hillshade-illumination-direction": 315,
            "hillshade-shadow-color": "rgba(34, 25, 14, 0.55)",
          },
        },
        map.getLayer(TERRAIN_HILLSHADE_BEFORE_LAYER_ID)
          ? TERRAIN_HILLSHADE_BEFORE_LAYER_ID
          : undefined,
      );
    }
  }

  function setTerrainHillshadeVisible(
    map: mapGl.MapLibreMap,
    visible: boolean,
  ) {
    if (!map.getLayer(TERRAIN_HILLSHADE_LAYER_ID)) return;
    map.setLayoutProperty(
      TERRAIN_HILLSHADE_LAYER_ID,
      "visibility",
      visible ? "visible" : "none",
    );
  }

  function setBuildingExtrusionsVisible(
    map: mapGl.MapLibreMap,
    visible: boolean,
  ) {
    if (!map.getLayer(BUILDING_3D_LAYER_ID)) return;
    map.setLayoutProperty(
      BUILDING_3D_LAYER_ID,
      "visibility",
      visible ? "visible" : "none",
    );
  }

  function flyToCamera(
    map: mapGl.MapLibreMap,
    camera: typeof CAMPUS_DEFAULT_CAMERA,
  ) {
    map.easeTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      duration: 1500,
      padding: calculatePadding(untrack(() => md.current)),
    });
  }

  function disableTerrain(map: mapGl.MapLibreMap) {
    map.setTerrain(null);
    setTerrainHillshadeVisible(map, false);
    setBuildingExtrusionsVisible(map, true);
  }

  function restoreFlatMapCamera(map: mapGl.MapLibreMap) {
    untrack(() => {
      const category = queryStore.category;
      const type = queryStore.type;
      const value = queryStore.inputValue;

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
        flyToCamera(map, CAMPUS_DEFAULT_CAMERA);
        if (directions) directions.clear();
      } else if (category === "room") {
        currentRoom.getRoomByCode(value).then(() => {
          if (
            currentRoom.value &&
            currentRoom.value.building &&
            currentRoom.value.building.lat &&
            currentRoom.value.building.lon &&
            !terrainStore.enabled
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
      } else if (category === "event") {
        if (!loaded) return;
        const currentEvent = findSelectedEvent(events);
        if (currentEvent && focusMapOnEvent(map, currentEvent)) {
          map.once("moveend", startRotation);
        }
      }
    });
  }

  function failTerrain(map: mapGl.MapLibreMap, message: string) {
    disableTerrain(map);
    terrainStore.markUnavailable(message);
  }

  function sourceErrorMatchesTerrain(event: mapGl.ErrorEvent) {
    const sourceId = (event as mapGl.ErrorEvent & { sourceId?: string })
      .sourceId;
    const message = event.error?.message ?? "";
    return (
      sourceId === TERRAIN_SOURCE_ID || message.includes(TERRAIN_SOURCE_ID)
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
    if (!mapStore.mapInstance || terrainStore.enabled) return;
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

  function eventLocationEditKey(id: number) {
    return `event:${id}:location`;
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
      "failed to save event location",
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

  async function patchEventLocations(
    event: EventData,
    locations: EventLocationWriteValue[],
    version = event.version,
  ): Promise<EventData> {
    const res = await fetch(`/api/admin/events/${event.id}/locations`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ version, locations }),
    });
    const data = (await res.json().catch(() => ({}))) as
      | EventLocationsPatchResponse
      | { error?: string };

    if (!res.ok) {
      if (res.status === 409) {
        const conflict = data as EventLocationsPatchResponse;
        throw new ClientEventConflictError(
          conflict.error ?? "This event was changed by another editor.",
          conflict.latest ?? null,
        );
      }
      throw new Error(data.error ?? `Save failed (${res.status})`);
    }

    const updated = (data as EventLocationsPatchResponse).event;
    if (!updated)
      throw new Error("Save response did not include updated event.");
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

  function clearEventLocationOverride(eventId: number) {
    const key = eventLocationEditKey(eventId);
    if (!(key in eventLocationOverrides)) return;
    const next = { ...eventLocationOverrides };
    delete next[key];
    eventLocationOverrides = next;
  }

  function setLocalEvent(updated: EventData) {
    appActions.replaceEvent(updated);

    const key = eventLocationEditKey(updated.id);
    const editable = getEditableEventLocation(updated);
    if (editable && isAnchoredEventLocation(editable)) {
      clearEventLocationOverride(updated.id);
      return;
    }

    const coords = editable ? getResolvedEventLocationCoords(editable) : null;
    if (coords) {
      eventLocationOverrides = { ...eventLocationOverrides, [key]: coords };
    } else {
      clearEventLocationOverride(updated.id);
    }
  }

  function getResolvedEventLocationCoords(
    location: EventData["locations"][number],
  ): EditableCoords | null {
    if (location.resolvedLat === null || location.resolvedLon === null) {
      return null;
    }
    return {
      lat: location.resolvedLat,
      lon: location.resolvedLon,
    };
  }

  function serializeEventLocation(
    location: EventData["locations"][number],
    overrides: Partial<EventData["locations"][number]> = {},
  ): EventLocationWriteValue {
    return {
      id: location.id,
      anchorType: overrides.anchorType ?? location.anchorType,
      buildingId:
        overrides.buildingId !== undefined
          ? overrides.buildingId
          : location.buildingId,
      dormId:
        overrides.dormId !== undefined ? overrides.dormId : location.dormId,
      label: overrides.label ?? location.label,
      lat: overrides.lat !== undefined ? overrides.lat : location.lat,
      lon: overrides.lon !== undefined ? overrides.lon : location.lon,
      highlightPriority:
        overrides.highlightPriority ?? location.highlightPriority,
      sortOrder: overrides.sortOrder ?? location.sortOrder,
      isPrimary: overrides.isPrimary ?? location.isPrimary,
    };
  }

  function buildEventLocationDragUpdate(
    event: EventData,
    targetLocation: EventData["locations"][number],
    coords: EditableCoords,
  ): EventLocationWriteValue[] {
    return event.locations.map((location) =>
      location.id === targetLocation.id
        ? serializeEventLocation(location, {
            anchorType: "custom",
            buildingId: null,
            dormId: null,
            label: location.label || "Event marker",
            lat: coords.lat,
            lon: coords.lon,
            isPrimary: true,
          })
        : serializeEventLocation(location, { isPrimary: false }),
    );
  }

  function recordMove(move: EditMove) {
    const next = recordMapMove(undoStack, move);
    undoStack = next.undoStack;
    redoStack = next.redoStack;
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
      recordMove({
        kind: "entity",
        entityType: "building",
        id,
        name,
        key,
        previous,
        current,
        version: updated.version,
      });
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
      recordMove({
        kind: "entity",
        entityType: "dorm",
        id,
        name,
        key,
        previous,
        current,
        version: updated.version,
      });
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

  async function saveEventLocationPosition(
    event: EventData,
    location: EventData["locations"][number],
    current: EditableCoords,
  ): Promise<void> {
    const key = eventLocationEditKey(event.id);
    const previous = getResolvedEventLocationCoords(location);
    if (!previous) return;
    const previousEvent = {
      ...event,
      locations: event.locations.map((eventLocation) => ({
        ...eventLocation,
      })),
    };
    const previousLocations = event.locations.map((eventLocation) =>
      serializeEventLocation(eventLocation),
    );
    const currentLocations = buildEventLocationDragUpdate(
      event,
      location,
      current,
    );
    savingEditKey = key;
    failedEditKey = null;

    try {
      const updated = await patchEventLocations(event, currentLocations);
      setLocalEvent(updated);
      recordMove({
        kind: "eventLocation",
        eventId: event.id,
        locationId: location.id,
        name: updated.title,
        key,
        previous,
        current,
        previousLocations,
        currentLocations,
        version: updated.version,
      });
      markSaved(key);
      setEditStatus(`${updated.title} location saved. You can undo this move.`);
    } catch (error) {
      failedEditKey = key;
      if (error instanceof ClientEventConflictError) {
        if (error.latest) setLocalEvent(error.latest);
        else setLocalEvent(previousEvent);
        toastStore.show(
          editErrorMessage(event.title, error.message, error),
          "error",
        );
        return;
      }
      setLocalEvent(previousEvent);
      toastStore.show(
        editErrorMessage(event.title, "Failed to save event location.", error),
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

  async function handleEventLocationDragEnd(
    e: { marker: mapGl.Marker },
    event: EventData,
    location: EventData["locations"][number],
  ) {
    if (!isMapEditEnabled()) return;
    const lngLat = e.marker.getLngLat();
    await saveEventLocationPosition(event, location, {
      lat: lngLat.lat,
      lon: lngLat.lng,
    });
  }

  async function applyRecordedMove(
    move: EditMove,
    direction: "undo" | "redo",
  ): Promise<number> {
    if (move.kind === "entity") {
      const updated = await patchPosition(
        move.entityType,
        move.id,
        direction === "undo" ? move.previous : move.current,
        move.version,
      );
      setLocalPosition(move.entityType, move.id, updated);
      return updated.version;
    }

    const event = events.find((event) => event.id === move.eventId);
    if (!event) throw new Error(`${move.name} is no longer loaded.`);

    const updated = await patchEventLocations(
      event,
      direction === "undo" ? move.previousLocations : move.currentLocations,
      move.version,
    );
    setLocalEvent(updated);
    return updated.version;
  }

  function handleRecordedMoveError(
    move: EditMove,
    error: unknown,
    fallback: string,
  ) {
    failedEditKey = move.key;
    if (move.kind === "entity" && error instanceof ClientEditConflictError) {
      if (error.latest) {
        setLocalPosition(move.entityType, move.id, error.latest);
      }
      toastStore.show(error.message, "error");
      return;
    }

    if (
      move.kind === "eventLocation" &&
      error instanceof ClientEventConflictError
    ) {
      if (error.latest) setLocalEvent(error.latest);
      toastStore.show(error.message, "error");
      return;
    }

    toastStore.show(error instanceof Error ? error.message : fallback, "error");
  }

  async function undoLastMove() {
    if (!undoMove || !isMapEditEnabled()) return;

    const move = undoMove;
    undoingEditKey = move.key;
    savingEditKey = move.key;
    failedEditKey = null;

    try {
      const version = await applyRecordedMove(move, "undo");
      markSaved(move.key);
      setEditStatus(`Undid move for ${move.name}.`);
      const next = completeMapMoveUndo(undoStack, redoStack, move, version);
      undoStack = next.undoStack;
      redoStack = next.redoStack;
    } catch (error) {
      handleRecordedMoveError(move, error, "Failed to undo last move.");
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
      const version = await applyRecordedMove(move, "redo");
      markSaved(move.key);
      setEditStatus(`Redid move for ${move.name}.`);
      const next = completeMapMoveRedo(undoStack, redoStack, move, version);
      undoStack = next.undoStack;
      redoStack = next.redoStack;
    } catch (error) {
      handleRecordedMoveError(move, error, "Failed to redo move.");
    } finally {
      if (savingEditKey === move.key) savingEditKey = null;
      if (undoingEditKey === move.key) undoingEditKey = null;
    }
  }

  function handleMapEditKeydown(e: KeyboardEvent) {
    if (!isMapEditEnabled()) return;
    const action = getMapEditShortcutAction(e);
    if (!action) return;

    e.preventDefault();
    if (action === "undo") undoLastMove();
    else redoMoveBranch();
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
      const handleMapError = (event: mapGl.ErrorEvent) => {
        if (!terrainStore.enabled || !sourceErrorMatchesTerrain(event)) return;
        failTerrain(map, TERRAIN_TILE_FAILURE_MESSAGE);
      };
      map.on("mousedown", stopRotation);
      map.on("touchstart", stopRotation);
      map.on("wheel", stopRotation);
      map.on("zoom", handleZoom);
      map.on("error", handleMapError);
      return () => {
        map.off("mousedown", stopRotation);
        map.off("touchstart", stopRotation);
        map.off("wheel", stopRotation);
        map.off("zoom", handleZoom);
        map.off("error", handleMapError);
      };
    }
  });

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    mapStore.stopAutoRotate = () => {
      stopRotation();
      map.off("moveend", startRotation);
    };
    return () => {
      mapStore.stopAutoRotate = null;
    };
  });

  $effect(() => {
    const map = mapStore.mapInstance;
    const enabled = terrainStore.enabled;
    const exaggeration = terrainStore.exaggeration;
    if (!map) return;

    let cancelled = false;
    const apply = () => {
      if (cancelled) return;

      if (!enabled) {
        const shouldRestoreFlatCamera = terrainModeWasEnabled;
        disableTerrain(map);
        map.off("moveend", startRotation);
        terrainModeWasEnabled = false;
        if (shouldRestoreFlatCamera) restoreFlatMapCamera(map);
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        failTerrain(map, TERRAIN_UNAVAILABLE_OFFLINE_MESSAGE);
        return;
      }

      try {
        terrainStore.markLoading();
        ensureTerrainRendering(map);
        map.setTerrain({ source: TERRAIN_SOURCE_ID, exaggeration });
        setTerrainHillshadeVisible(map, true);
        setBuildingExtrusionsVisible(map, false);
        if (!terrainModeWasEnabled) {
          map.off("moveend", startRotation);
          stopRotation();
          flyToCamera(map, MAKILING_TERRAIN_CAMERA);
        }
        terrainModeWasEnabled = true;
        terrainStore.markActive();
      } catch (error) {
        console.warn("Terrain setup failed", error);
        failTerrain(map, TERRAIN_TILE_FAILURE_MESSAGE);
      }
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }

    return () => {
      cancelled = true;
    };
  });

  // svelte-maplibre only passes maxBounds at map construction; keep the live
  // instance in sync when bounds constants change (HMR) or terrain toggles.
  $effect(() => {
    const map = mapStore.mapInstance;
    const terrainEnabled = terrainStore.enabled;
    if (!map) return;

    const bounds = terrainEnabled
      ? MAKILING_TERRAIN_MAX_BOUNDS
      : CAMPUS_MAX_BOUNDS;

    const applyBounds = () => {
      map.setMaxBounds(bounds);
    };

    if (map.isStyleLoaded()) {
      applyBounds();
    } else {
      map.once("load", applyBounds);
    }
  });

  $effect(() => {
    const map = mapStore.mapInstance;
    const resetNonce = terrainStore.resetNonce;
    if (!map || !terrainStore.enabled || resetNonce === 0) return;

    stopRotation();
    flyToCamera(map, MAKILING_TERRAIN_CAMERA);
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
    if (!adminAuthStore.isAdmin && eventPlacementStore.active) {
      eventPlacementStore.cancel();
    }
    if (!mapEditStore.enabled) {
      hoveredEditKey = null;
      selectedEditKey = null;
    }
  });

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map || !eventPlacementStore.active) return;

    const canvas = map.getCanvas();
    const previousCursor = canvas.style.cursor;
    canvas.style.cursor = "crosshair";
    stopRotation();

    const handlePlacementClick = (event: mapGl.MapMouseEvent) => {
      void createEventAtMapPoint({
        lat: event.lngLat.lat,
        lon: event.lngLat.lng,
      });
    };

    map.on("click", handlePlacementClick);
    return () => {
      map.off("click", handlePlacementClick);
      if (canvas.style.cursor === "crosshair") {
        canvas.style.cursor = previousCursor;
      }
    };
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

      const ensureLayersAndPaint = (geometry: LineString) => {
        if (cancelled) return;
        ensureJeepneyRouteLayers(map, route.color);
        const source = map.getSource(JEEPNEY_ROUTE_SOURCE_ID) as
          | mapGl.GeoJSONSource
          | undefined;
        const featureCollection: FeatureCollection<LineString> = {
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
    const map = mapStore.mapInstance;
    const selectedEvent =
      loaded && queryStore.category === "event" && queryStore.type === "result"
        ? findSelectedEvent(events)
        : null;
    if (!map) return;

    const routeFeatures = selectedEvent
      ? buildSelectedEventRouteFeatures(selectedEvent)
      : [];
    if (routeFeatures.length === 0) {
      clearEventRouteLayers(map);
      return;
    }

    const draw = () => {
      ensureEventRouteLayers(map);
      const source = map.getSource(EVENT_ROUTE_SOURCE_ID) as
        | mapGl.GeoJSONSource
        | undefined;
      const featureCollection: FeatureCollection<LineString> = {
        type: "FeatureCollection",
        features: routeFeatures,
      };
      source?.setData(featureCollection);
    };

    if (map.isStyleLoaded()) {
      draw();
      return;
    }

    // Style isn't ready yet: defer the draw until load, but remove the handler
    // on re-run/teardown so rapid selection changes don't stack listeners and
    // draw a stale route once the style finally loads.
    map.once("load", draw);
    return () => {
      map.off("load", draw);
    };
  });

  $effect(() => {
    const category = queryStore.category;
    const type = queryStore.type;
    const value = queryStore.inputValue;
    const map = mapStore.mapInstance;

    if (!map) return;

    untrack(() => {
      const isTerrainEnabled = terrainStore.enabled;
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
          if (!isTerrainEnabled) map.once("moveend", startRotation);
        }
      } else if (category === null) {
        flyToCamera(
          map,
          isTerrainEnabled ? MAKILING_TERRAIN_CAMERA : CAMPUS_DEFAULT_CAMERA,
        );
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
            if (!isTerrainEnabled) map.once("moveend", startRotation);
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
          if (!isTerrainEnabled) map.once("moveend", startRotation);
        }
      } else if (category === "event") {
        if (!loaded) return;
        const currentEvent = findSelectedEvent(events);
        if (currentEvent && focusMapOnEvent(map, currentEvent)) {
          if (!isTerrainEnabled) map.once("moveend", startRotation);
        }
      }
    });
  });

  function handleMarkerClick(buildingName: string) {
    if (eventPlacementStore.active) return;
    if (isMapEditEnabled() && selectedEditKey !== null) return;
    if (buildingName === queryStore.inputValue) return;
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: buildingName,
    });
    queryStore.inputValue = buildingName;
  }

  function handleDormMarkerClick(dormName: string) {
    if (eventPlacementStore.active) return;
    if (isMapEditEnabled() && selectedEditKey !== null) return;
    if (dormName === queryStore.inputValue) return;
    queryStore.updateQuery({
      category: "dorm",
      type: "result",
      value: dormName,
    });
    queryStore.inputValue = dormName;
  }

  function handleEventMarkerClick(event: EventData) {
    if (eventPlacementStore.active) return;
    if (isMapEditEnabled() && selectedEditKey !== null) return;
    if (queryStore.selectedEventSlug === event.slug) return;
    queryStore.updateQuery({
      category: "event",
      type: "result",
      value: event.title,
      eventSlug: event.slug,
    });
    queryStore.inputValue = event.title;
  }

  function toggleEventMarkerGroup(groupKey: string) {
    if (eventPlacementStore.active) return;
    expandedEventGroupKey =
      expandedEventGroupKey === groupKey ? null : groupKey;
  }

  function collapseEventMarkerGroup() {
    if (eventPlacementStore.active) return;
    expandedEventGroupKey = null;
  }

  function isSelectedEvent(event: EventData) {
    if (queryStore.category !== "event") return false;
    if (queryStore.selectedEventSlug) {
      return queryStore.selectedEventSlug === event.slug;
    }
    return queryStore.inputValue === event.title;
  }

  function formatEventMarkerDate(value: string) {
    return formatCampusDateShort(value);
  }

  function formatEventMarkerTime(value: string) {
    return formatCampusTime(value);
  }

  function getEventStatusLabel(event: EventData) {
    if (event.status === "active") return "Active now";
    if (event.status === "past") return "Past";
    return "Upcoming";
  }

  $effect(() => {
    if (!loaded || !isMapEditEnabled()) return;
    const event = findSelectedEvent(events);
    if (!event) return;
    const location = getEditableEventLocation(event);
    if (!location || !isAnchoredEventLocation(location)) return;
    untrack(() => clearEventLocationOverride(event.id));
  });

  type EventMarkerEntry = {
    event: EventData;
    location: EventData["locations"][number];
  };

  function isAnchoredEventLocation(
    location: EventData["locations"][number],
  ): boolean {
    return location.anchorType === "building" || location.anchorType === "dorm";
  }

  function getEventMarkerLngLat(editable: {
    event: EventData;
    location: EventData["locations"][number];
  }): [number, number] {
    if (!isAnchoredEventLocation(editable.location)) {
      const override =
        eventLocationOverrides[eventLocationEditKey(editable.event.id)];
      if (override) return [override.lon, override.lat];
    }
    return [
      Number(editable.location.resolvedLon),
      Number(editable.location.resolvedLat),
    ];
  }

  function getEditableEventLocation(event: EventData) {
    return (
      event.locations.find(
        (location) =>
          location.isPrimary &&
          location.resolvedLon !== null &&
          location.resolvedLat !== null,
      ) ??
      event.locations.find(
        (location) =>
          location.resolvedLon !== null && location.resolvedLat !== null,
      ) ??
      null
    );
  }

  function isSelectedEditableEventLocation(
    event: EventData,
    location: EventData["locations"][number],
  ) {
    if (
      !isMapEditEnabled() ||
      queryStore.category !== "event" ||
      queryStore.type !== "result"
    ) {
      return false;
    }

    const slug = queryStore.selectedEventSlug;
    if (slug) {
      if (slug !== event.slug) return false;
    } else if (queryStore.inputValue !== event.title) {
      return false;
    }

    return getEditableEventLocation(event)?.id === location.id;
  }

  function getEventLocationKey(location: EventMarkerEntry["location"]) {
    if (location.resolvedLon === null || location.resolvedLat === null) {
      return null;
    }
    return `${location.resolvedLon.toFixed(6)}:${location.resolvedLat.toFixed(6)}`;
  }

  let eventMarkerGroups = $derived.by(() => {
    if (!loaded) return [];
    const groups = new Map<
      string,
      {
        key: string;
        lngLat: [number, number];
        label: string;
        anchored: boolean;
        entries: EventMarkerEntry[];
      }
    >();

    for (const event of events) {
      if (
        event.status !== "active" &&
        event.status !== "upcoming" &&
        event.status !== "past"
      ) {
        continue;
      }
      for (const location of event.locations) {
        if (isSelectedEditableEventLocation(event, location)) continue;
        const key = getEventLocationKey(location);
        if (
          key === null ||
          location.resolvedLon === null ||
          location.resolvedLat === null
        ) {
          continue;
        }

        const group = groups.get(key);
        const entry = { event, location };
        if (group) {
          group.anchored =
            group.anchored ||
            location.anchorType === "building" ||
            location.anchorType === "dorm";
          group.entries.push(entry);
          continue;
        }

        groups.set(key, {
          key,
          lngLat: [location.resolvedLon, location.resolvedLat],
          label: location.resolvedLabel,
          anchored:
            location.anchorType === "building" ||
            location.anchorType === "dorm",
          entries: [entry],
        });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      entries: group.entries.sort((a, b) => {
        const statusDelta =
          Number(b.event.status === "active") -
          Number(a.event.status === "active");
        if (statusDelta !== 0) return statusDelta;
        return a.event.occurrenceStartsAt.localeCompare(
          b.event.occurrenceStartsAt,
        );
      }),
    }));
  });

  let editableEventLocation = $derived.by(() => {
    if (
      !loaded ||
      !isMapEditEnabled() ||
      queryStore.category !== "event" ||
      queryStore.type !== "result"
    ) {
      return null;
    }

    const event = findSelectedEvent(events);
    if (!event) return null;

    const location = getEditableEventLocation(event);
    if (
      !location ||
      location.resolvedLon === null ||
      location.resolvedLat === null
    ) {
      return null;
    }

    return { event, location };
  });

  $effect(() => {
    if (
      !loaded ||
      queryStore.category !== "event" ||
      queryStore.type !== "result"
    )
      return;
    const group = eventMarkerGroups.find((group) =>
      group.entries.some((entry) => isSelectedEvent(entry.event)),
    );
    if (!group) return;
    untrack(() => {
      expandedEventGroupKey = group.key;
    });
  });

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

  let selectedEventFocus = $derived.by(() => {
    if (
      !loaded ||
      isMapEditEnabled() ||
      queryStore.category !== "event" ||
      queryStore.type !== "result"
    ) {
      return null;
    }
    return findSelectedEvent(events);
  });

  let selectedEventBuildingIds = $derived.by(() => {
    const event = selectedEventFocus;
    if (!event) return null;
    return new Set(
      event.locations
        .filter(
          (location) =>
            location.anchorType === "building" && location.buildingId !== null,
        )
        .map((location) => location.buildingId as number),
    );
  });

  let selectedEventDormIds = $derived.by(() => {
    const event = selectedEventFocus;
    if (!event) return null;
    return new Set(
      event.locations
        .filter(
          (location) =>
            location.anchorType === "dorm" && location.dormId !== null,
        )
        .map((location) => location.dormId as number),
    );
  });

  const eventPlaceFocusActive = $derived(selectedEventFocus !== null);

  function isBuildingDimmedForEventFocus(buildingId: number): boolean {
    if (!eventPlaceFocusActive || selectedEventBuildingIds === null)
      return false;
    if (selectedEventBuildingIds.size === 0) return true;
    return !selectedEventBuildingIds.has(buildingId);
  }

  function isDormDimmedForEventFocus(dormId: number): boolean {
    if (!eventPlaceFocusActive || selectedEventDormIds === null) return false;
    if (selectedEventDormIds.size === 0) return true;
    return !selectedEventDormIds.has(dormId);
  }

  function isBuildingEventLinked(buildingId: number): boolean {
    if (selectedEventBuildingIds !== null) {
      return selectedEventBuildingIds.has(buildingId);
    }
    return linkedActiveEventBuildingIds.has(buildingId);
  }

  function isDormEventLinked(dormId: number): boolean {
    if (selectedEventDormIds !== null) {
      return selectedEventDormIds.has(dormId);
    }
    return linkedActiveEventDormIds.has(dormId);
  }

  let linkedActiveEventBuildingIds = $derived.by(() => {
    if (!loaded) return new Set<number>();
    return new Set(
      events
        .filter((event) => event.status === "active")
        .flatMap((event) => event.locations)
        .filter(
          (location) =>
            location.anchorType === "building" && location.buildingId !== null,
        )
        .map((location) => location.buildingId as number),
    );
  });

  let activeDormName = $derived.by(() => {
    if (queryStore.category === "dorm" && queryStore.type === "result") {
      return queryStore.inputValue;
    }
    return null;
  });

  let linkedActiveEventDormIds = $derived.by(() => {
    if (!loaded) return new Set<number>();
    return new Set(
      events
        .filter((event) => event.status === "active")
        .flatMap((event) => event.locations)
        .filter(
          (location) =>
            location.anchorType === "dorm" && location.dormId !== null,
        )
        .map((location) => location.dormId as number),
    );
  });

  let selectedEventRouteStops = $derived.by(() => {
    if (!loaded || queryStore.category !== "event") return [];
    const selectedEvent = findSelectedEvent(events);
    if (!selectedEvent) return [];
    return selectedEvent.routes.flatMap((route) =>
      route.stops.filter(
        (stop) => stop.resolvedLon !== null && stop.resolvedLat !== null,
      ),
    );
  });
</script>

<svelte:window onkeydown={handleMapEditKeydown} />

<div class="map-container">
  {#if eventPlacementStore.active}
    {#if md.current}
      <div
        class="edit-dock event-placement-dock"
        role="status"
        aria-live="polite"
      >
        <p class="edit-dock-status">
          {eventPlacementStore.creating
            ? "Creating event…"
            : "Tap the map to place the event"}
        </p>
        <button
          class="edit-dock-action cancel"
          type="button"
          disabled={eventPlacementStore.creating}
          onclick={() => eventPlacementStore.cancel()}
        >
          Cancel
        </button>
      </div>
    {:else}
      <div class="event-placement-toolbar" role="status" aria-live="polite">
        <div class="event-placement-copy">
          <strong>Choose event location on the map</strong>
          <span>
            {eventPlacementStore.creating
              ? "Creating the event at the selected map point..."
              : "Click or tap the map point where this event should appear."}
          </span>
        </div>
        <button
          class="event-placement-cancel"
          type="button"
          disabled={eventPlacementStore.creating}
          onclick={() => eventPlacementStore.cancel()}
        >
          Cancel
        </button>
      </div>
    {/if}
  {:else if isMapEditEnabled()}
    {#if md.current}
      <div class="edit-dock map-edit-dock" role="status" aria-live="polite">
        {#if editStatusMessage}
          <p class="edit-dock-status">{editStatusMessage}</p>
        {/if}
        <div class="edit-dock-actions">
          <button
            class="edit-dock-action"
            disabled={!undoMove || undoingEditKey !== null}
            onclick={undoLastMove}
            title={undoMove
              ? `Undo move for ${undoMove.name}`
              : "No move to undo yet"}
            aria-label="Undo last pin move"
          >
            <Undo2 size={18} />
            <span>Undo</span>
          </button>
          <button
            class="edit-dock-action"
            disabled={!redoMove || undoingEditKey !== null}
            onclick={redoMoveBranch}
            title={redoMove
              ? `Redo move for ${redoMove.name}`
              : "No move to redo yet"}
            aria-label="Redo last pin move"
          >
            <Redo2 size={18} />
            <span>Redo</span>
          </button>
        </div>
      </div>
    {:else}
      <div class="map-edit-toolbar" role="status" aria-live="polite">
        <div class="map-edit-summary">
          <div class="map-edit-copy">
            <strong>Editing map</strong>
            <span>
              {editStatusMessage ??
                `Click pins for details or drag to move. ${undoShortcutLabel} undo, ${undoShortcutLabel.replace("Z", "Y")} redo.`}
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
  {/if}
  <MapLibre
    bind:map={mapStore.mapInstance}
    style="/liberty-customized.json"
    maxBounds={CAMPUS_MAX_BOUNDS}
    center={CAMPUS_DEFAULT_CAMERA.center}
    zoom={17}
    pitch={CAMPUS_DEFAULT_CAMERA.pitch}
    bearing={CAMPUS_DEFAULT_CAMERA.bearing}
    minZoom={13}
    class="map"
  >
    {#if locationStore.coords}
      <Marker lngLat={locationStore.coords}>
        <div class="user-location-pin"></div>
      </Marker>
    {/if}
    {#if loaded}
      {#if editableEventLocation}
        {@const editKey = eventLocationEditKey(editableEventLocation.event.id)}
        <Marker
          lngLat={getEventMarkerLngLat(editableEventLocation)}
          draggable={isMapEditEnabled()}
          onclick={() => handleEventMarkerClick(editableEventLocation.event)}
          ondragstart={() => beginMarkerDrag(editKey)}
          ondragend={(e) =>
            handleEventLocationDragEnd(
              e,
              editableEventLocation.event,
              editableEventLocation.location,
            )}
        >
          <div class="event-marker-anchor event-edit-anchor">
            <span class="event-anchor-dot event-edit-dot" aria-hidden="true"
            ></span>
            <div
              class="event-edit-pin"
              class:editing={selectedEditKey === editKey}
              class:hovered={hoveredEditKey === editKey}
              class:saving={savingEditKey === editKey}
              class:saved={savedEditKey === editKey}
              class:failed={failedEditKey === editKey}
              title={`Drag to move ${editableEventLocation.event.title}`}
              onpointerenter={() => handleEditablePinEnter(editKey)}
              onpointerleave={() => handleEditablePinLeave(editKey)}
            >
              <span class="event-edit-icon" aria-hidden="true">
                <CalendarDays size={18} />
              </span>
              <span class="event-edit-copy">
                <span>{editableEventLocation.event.title}</span>
                {#if savingEditKey === editKey}
                  <strong>Saving</strong>
                {:else if savedEditKey === editKey}
                  <strong>Saved</strong>
                {:else if failedEditKey === editKey}
                  <strong>Failed</strong>
                {:else}
                  <strong>Drag location</strong>
                {/if}
              </span>
              <span class="event-edit-handle" aria-hidden="true">
                <Move size={16} />
              </span>
            </div>
          </div>
        </Marker>
      {/if}
      {#each eventMarkerGroups as group (`event-group:${group.key}`)}
        <Marker lngLat={group.lngLat}>
          <div class="event-marker-anchor" class:anchored={group.anchored}>
            <span class="event-anchor-connector" aria-hidden="true"></span>
            <span class="event-anchor-dot" aria-hidden="true"></span>
            <div class="event-callout" class:anchored={group.anchored}>
              {#if group.entries.length === 1}
                {@const entry = group.entries[0]}
                {#if entry}
                  {@const image = getEventImage(entry.event.slug)}
                  {@const active = isSelectedEvent(entry.event)}
                  <EventMapPin
                    {active}
                    anchored={group.anchored}
                    imageSrc={image?.src ?? null}
                    dateLabel={formatEventMarkerDate(
                      entry.event.occurrenceStartsAt,
                    )}
                    status={entry.event.status}
                    title={`${entry.event.title}: ${entry.location.resolvedLabel}`}
                    ariaLabel={`Open event ${entry.event.title} at ${entry.location.resolvedLabel}`}
                    labelTitle={entry.event.title}
                    labelMeta={`${getEventStatusLabel(entry.event)} - ${formatEventMarkerTime(
                      entry.event.occurrenceStartsAt,
                    )}`}
                    onclick={() => handleEventMarkerClick(entry.event)}
                  />
                {/if}
              {:else}
                {@const primaryEntry = group.entries[0]}
                {@const isExpanded = expandedEventGroupKey === group.key}
                {#if primaryEntry}
                  {@const primaryImage = getEventImage(primaryEntry.event.slug)}
                  <EventMapPin
                    variant="group"
                    anchored={group.anchored}
                    expanded={isExpanded}
                    ariaExpanded={isExpanded}
                    count={group.entries.length}
                    imageSrc={primaryImage?.src ?? null}
                    dateLabel={formatEventMarkerDate(
                      primaryEntry.event.occurrenceStartsAt,
                    )}
                    status={primaryEntry.event.status}
                    title={`${group.entries.length} events at ${group.label}`}
                    ariaLabel={`${isExpanded ? "Collapse" : "Expand"} ${group.entries.length} events at ${group.label}`}
                    onclick={() => toggleEventMarkerGroup(group.key)}
                  />
                  {#if isExpanded}
                    <div
                      class="event-pin-stack"
                      role="group"
                      aria-label={`${group.entries.length} events at ${group.label}`}
                      transition:fade
                    >
                      <div class="event-stack-header">
                        <span class="event-stack-heading">
                          <strong>{group.entries.length} events</strong>
                          <span>{group.label}</span>
                        </span>
                        <button
                          class="event-stack-close"
                          type="button"
                          aria-label={`Collapse events at ${group.label}`}
                          onclick={collapseEventMarkerGroup}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div class="event-stack-list">
                        {#each group.entries as entry (`event-stack:${entry.event.id}:${entry.location.id}`)}
                          {@const image = getEventImage(entry.event.slug)}
                          <button
                            type="button"
                            class="event-stack-item"
                            class:active={isSelectedEvent(entry.event)}
                            class:upcoming={entry.event.status === "upcoming"}
                            title={`${entry.event.title}: ${entry.location.resolvedLabel}`}
                            aria-label={`Open event ${entry.event.title} at ${entry.location.resolvedLabel}`}
                            onclick={() => handleEventMarkerClick(entry.event)}
                          >
                            {#if image}
                              <img
                                class="event-stack-thumb"
                                src={image.src}
                                alt=""
                              />
                            {:else}
                              <span class="event-stack-icon" aria-hidden="true">
                                <CalendarDays size={14} />
                              </span>
                            {/if}
                            <span class="event-stack-copy">
                              <span class="event-stack-title"
                                >{entry.event.title}</span
                              >
                              <span class="event-stack-meta">
                                {formatEventMarkerDate(
                                  entry.event.occurrenceStartsAt,
                                )}
                                at {formatEventMarkerTime(
                                  entry.event.occurrenceStartsAt,
                                )}
                                - {getEventStatusLabel(entry.event)}
                              </span>
                            </span>
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/if}
                {/if}
              {/if}
            </div>
          </div>
        </Marker>
      {/each}
      {#each selectedEventRouteStops as stop (`event-stop:${stop.id}`)}
        <Marker lngLat={[Number(stop.resolvedLon), Number(stop.resolvedLat)]}>
          <div class="event-route-stop-pin" title={stop.resolvedLabel}>
            <span>{stop.sortOrder + 1}</span>
            <span class="event-route-stop-label" transition:fade>
              {stop.resolvedLabel}
            </span>
          </div>
        </Marker>
      {/each}
    {/if}
    {#if !mapViewStore.eventsOnly}
      {#each filteredBuildings as building (`building:${building.id}:${isMapEditEnabled()}`)}
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
              handleBuildingDragEnd(
                e,
                building.id,
                building.buildingName,
                position,
              )}
          >
            <MapEntityPin
              label={building.buildingName}
              active={activeBuildingName === building.buildingName}
              editable={isMapEditEnabled()}
              editing={selectedEditKey === editKey}
              dimmed={isBuildingDimmedForEventFocus(building.id)}
              eventLinked={isBuildingEventLinked(building.id)}
              hovered={hoveredEditKey === editKey}
              saveState={savingEditKey === editKey
                ? "saving"
                : savedEditKey === editKey
                  ? "saved"
                  : failedEditKey === editKey
                    ? "failed"
                    : "idle"}
              title={building.buildingName}
              labelVisible={zoomLevel >= 17 || hoveredEditKey === editKey}
              onpointerenter={() => handleEditablePinEnter(editKey)}
              onpointerleave={() => handleEditablePinLeave(editKey)}
            >
              <University size="20" />
            </MapEntityPin>
          </Marker>
        {/if}
      {/each}
    {/if}
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

    {#if !mapViewStore.eventsOnly}
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
              handleDormDragEnd(e, dorm.id, dorm.dormName, position)}
          >
            <MapEntityPin
              label={dorm.dormName}
              tone={dorm.isUpManaged ? "dorm" : "privateDorm"}
              active={activeDormName === dorm.dormName}
              dimmed={isDormDimmedForEventFocus(dorm.id)}
              eventLinked={isDormEventLinked(dorm.id)}
              editable={isMapEditEnabled()}
              editing={selectedEditKey === editKey}
              hovered={hoveredEditKey === editKey}
              saveState={savingEditKey === editKey
                ? "saving"
                : savedEditKey === editKey
                  ? "saved"
                  : failedEditKey === editKey
                    ? "failed"
                    : "idle"}
              title={dorm.dormName}
              labelVisible={zoomLevel >= 17 || hoveredEditKey === editKey}
              onpointerenter={() => handleEditablePinEnter(editKey)}
              onpointerleave={() => handleEditablePinLeave(editKey)}
            >
              <House size="18" />
            </MapEntityPin>
          </Marker>
        {/if}
      {/each}
    {/if}
  </MapLibre>
  {#if terrainStore.enabled}
    <a
      class="maptiler-logo"
      href="https://www.maptiler.com/"
      target="_blank"
      rel="noreferrer"
      aria-label="MapTiler"
    >
      <img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
      />
    </a>
  {/if}
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

  .maptiler-logo {
    position: absolute;
    bottom: 0.75rem;
    left: calc(25.75rem + 1rem);
    z-index: 5;
    display: inline-flex;
    align-items: center;
    border-radius: 0.375rem;
    background-color: rgba(255, 255, 255, 0.92);
    padding: 0.25rem 0.375rem;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
    pointer-events: auto;
  }

  .maptiler-logo img {
    display: block;
    width: auto;
    height: 1.25rem;
  }

  /* #207: keep the required basemap attribution above the bottom map chrome
     (status bar + FAB row) so it is never covered by app UI. Uses the shared
     layout anchors on .app-layout instead of magic offsets. */
  :global(.app-layout .maplibregl-ctrl-bottom-right) {
    z-index: 11;
    bottom: calc(
      var(--status-bar-block-height, 2.75rem) +
        var(--map-tools-block-height, 3.25rem) + var(--map-ui-padding, 0.5rem) +
        env(safe-area-inset-bottom, 0px)
    );
  }
  :global(.app-layout .maplibregl-ctrl-attrib) {
    background-color: rgba(255, 255, 255, 0.85);
  }

  .map-edit-toolbar {
    position: absolute;
    bottom: 4.75rem;
    left: calc(50% + 12.875rem);
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100% - 26.75rem);
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

  .event-placement-toolbar {
    position: absolute;
    bottom: 4.75rem;
    left: calc(50% + 12.875rem);
    z-index: 22;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100% - 26.75rem);
    min-height: 3.25rem;
    padding: 0.4rem 0.4rem 0.4rem 0.85rem;
    border: 1px solid hsla(5, 53%, 32%, 0.35);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    color: hsl(0, 0%, 12%);
    font-size: 0.8125rem;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    pointer-events: auto;
  }

  .event-placement-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.05rem;
  }

  .event-placement-copy strong {
    color: #7b1113;
    font-size: 0.78rem;
    line-height: 1.15;
  }

  .event-placement-copy span {
    display: block;
    max-width: 19rem;
    overflow: hidden;
    color: hsl(0, 0%, 24%);
    font-size: 0.75rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-placement-cancel {
    min-width: 4.75rem;
    padding: 0.48rem 0.75rem;
    border: none;
    border-radius: 999px;
    background: #7b1113;
    color: white;
    cursor: pointer;
    font: inherit;
    font-weight: 800;
  }

  .event-placement-cancel:hover:not(:disabled) {
    background: #5f0d0f;
  }

  .event-placement-cancel:disabled {
    cursor: progress;
    opacity: 0.55;
  }

  .edit-dock {
    position: absolute;
    right: var(--map-ui-padding, 0.5rem);
    bottom: calc(
      var(--status-bar-block-height, 2.75rem) + var(--map-ui-padding, 0.5rem) +
        env(safe-area-inset-bottom)
    );
    left: var(--map-ui-padding, 0.5rem);
    z-index: 21;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 3rem;
    padding: 0.375rem 0.5rem;
    border: 1px solid hsla(160, 52%, 32%, 0.35);
    border-radius: 0.875rem;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    pointer-events: auto;
  }

  .event-placement-dock {
    border-color: hsla(5, 53%, 32%, 0.35);
  }

  .edit-dock-status {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: hsl(0, 0%, 24%);
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .edit-dock-actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.375rem;
  }

  .edit-dock-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.5rem 0.875rem;
    border: none;
    border-radius: 0.75rem;
    background: hsl(160, 84%, 26%);
    color: white;
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .edit-dock-action:hover:not(:disabled) {
    background: hsl(160, 84%, 20%);
  }

  .edit-dock-action:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .edit-dock-action.cancel {
    background: #7b1113;
  }

  .edit-dock-action.cancel:hover:not(:disabled) {
    background: #5f0d0f;
  }

  @media (max-width: 48rem) {
    .maptiler-logo {
      bottom: calc(50vh + 0.75rem);
      left: 0.75rem;
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

  .event-marker-anchor {
    position: relative;
    z-index: 80;
    display: block;
    width: 0;
    height: 0;
    pointer-events: none;
  }

  .event-anchor-dot {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    width: 0.7rem;
    height: 0.7rem;
    border: 2px solid white;
    border-radius: 999px;
    background: #7b1113;
    box-shadow:
      0 0 0 0.14rem rgba(123, 17, 19, 0.22),
      0 0.15rem 0.35rem rgba(0, 0, 0, 0.24);
    translate: -50% -50%;
    pointer-events: none;
  }

  .event-anchor-connector {
    position: absolute;
    top: -0.05rem;
    left: 0.05rem;
    z-index: 1;
    display: none;
    width: 2rem;
    height: 0.2rem;
    border-radius: 999px;
    background: rgba(123, 17, 19, 0.72);
    box-shadow: 0 0 0 2px white;
    transform: rotate(-38deg);
    transform-origin: left center;
    pointer-events: none;
  }

  .event-marker-anchor.anchored .event-anchor-connector {
    display: block;
  }

  .event-callout {
    position: absolute;
    bottom: 0.68rem;
    left: 0;
    z-index: 3;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    translate: -50% 0;
    pointer-events: auto;
  }

  .event-callout.anchored {
    bottom: 1.08rem;
    left: 1.32rem;
    translate: 0 0;
  }

  .event-edit-pin {
    all: unset;
    position: absolute;
    bottom: 0.68rem;
    left: 0;
    z-index: 90;
    display: inline-flex;
    min-width: 4.75rem;
    min-height: 3rem;
    align-items: center;
    gap: 0.35rem;
    padding: 0.22rem 0.35rem 0.22rem 0.22rem;
    border: 2px solid white;
    border-radius: 999px;
    background: #7b1113;
    color: white;
    cursor: grab;
    line-height: 1;
    pointer-events: auto;
    touch-action: none;
    box-shadow:
      0 0 0 0.2rem rgba(250, 204, 21, 0.92),
      0 0.55rem 1.1rem rgba(0, 0, 0, 0.34);
    transform-origin: bottom center;
    translate: -50% 0;
  }

  .event-edit-pin::after {
    content: "";
    position: absolute;
    top: calc(100% - 0.2rem);
    left: 50%;
    width: 0.55rem;
    height: 0.55rem;
    border-right: 2px solid white;
    border-bottom: 2px solid white;
    background: inherit;
    pointer-events: none;
    rotate: 45deg;
    translate: -50% 0;
  }

  .event-edit-pin.hovered,
  .event-edit-pin.editing {
    transform: scale(1.05);
  }

  .event-edit-pin.editing {
    cursor: grabbing;
  }

  .event-edit-icon,
  .event-edit-handle {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
  }

  .event-edit-icon {
    width: 2.2rem;
    height: 2.2rem;
    background: rgba(255, 255, 255, 0.18);
  }

  .event-edit-handle {
    width: 2.25rem;
    height: 2.25rem;
    margin-left: 0.1rem;
    background: rgba(255, 255, 255, 0.16);
  }

  .event-edit-copy {
    display: grid;
    min-width: 0;
    gap: 0.12rem;
    pointer-events: none;
  }

  .event-edit-copy span,
  .event-edit-copy strong {
    overflow: hidden;
    max-width: 9rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-edit-copy span {
    font-size: 0.72rem;
    font-weight: 900;
    line-height: 1.05;
  }

  .event-edit-copy strong {
    font-size: 0.62rem;
    line-height: 1;
    text-transform: uppercase;
  }

  .event-edit-pin.saving {
    box-shadow:
      0 0 0 0.22rem hsl(45, 94%, 47%),
      0 0.55rem 1.1rem rgba(0, 0, 0, 0.34);
  }

  .event-edit-pin.saved {
    box-shadow:
      0 0 0 0.22rem hsl(145, 63%, 42%),
      0 0.55rem 1.1rem rgba(0, 0, 0, 0.34);
  }

  .event-edit-pin.failed {
    box-shadow:
      0 0 0 0.22rem hsl(0, 72%, 51%),
      0 0.55rem 1.1rem rgba(0, 0, 0, 0.34);
  }

  .event-pin-stack {
    position: relative;
    margin-top: 0.5rem;
    display: grid;
    width: min(15rem, calc(100vw - 2rem));
    overflow: hidden;
    border: 2px solid white;
    border-radius: 1rem;
    background: white;
    box-shadow:
      0 0 0 0.16rem rgba(123, 17, 19, 0.28),
      0 0.55rem 1.15rem rgba(0, 0, 0, 0.34);
  }

  .event-stack-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.45rem;
    padding: 0.42rem 0.45rem 0.42rem 0.6rem;
    background: #7b1113;
    color: white;
  }

  .event-stack-heading {
    display: grid;
    min-width: 0;
    gap: 0.1rem;
  }

  .event-stack-heading strong {
    font-size: 0.72rem;
    line-height: 1;
    text-transform: uppercase;
  }

  .event-stack-heading span {
    overflow: hidden;
    font-size: 0.72rem;
    font-weight: 800;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-stack-close {
    all: unset;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    height: 1.35rem;
    flex: 0 0 auto;
    border: 1px solid rgba(255, 255, 255, 0.42);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    cursor: pointer;
    color: white;
  }

  .event-stack-close:hover,
  .event-stack-close:focus-visible {
    background: rgba(255, 255, 255, 0.28);
  }

  .event-stack-close:focus-visible {
    outline: 2px solid white;
    outline-offset: 1px;
  }

  .event-stack-list {
    display: grid;
    gap: 1px;
    background: #eee1e1;
  }

  .event-stack-item {
    all: unset;
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr);
    align-items: center;
    gap: 0.45rem;
    padding: 0.42rem 0.5rem;
    background: white;
    color: #18181b;
    cursor: pointer;
  }

  .event-stack-item:hover,
  .event-stack-item:focus-visible,
  .event-stack-item.active {
    background: #fdf3f3;
  }

  .event-stack-item:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: -2px;
  }

  .event-stack-thumb,
  .event-stack-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 0.5rem;
  }

  .event-stack-thumb {
    object-fit: contain;
    background: hsl(0, 0%, 96%);
  }

  .event-stack-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #fdf3f3;
    color: #7b1113;
  }

  .event-stack-copy {
    display: grid;
    min-width: 0;
    gap: 0.16rem;
  }

  .event-stack-title {
    overflow: hidden;
    color: #7b1113;
    font-size: 0.76rem;
    font-weight: 900;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-stack-meta {
    color: #71717a;
    font-size: 0.62rem;
    font-weight: 800;
    line-height: 1;
    text-transform: uppercase;
  }

  @media (max-width: 48rem) {
    .event-edit-pin {
      min-height: 3.35rem;
      padding-right: 0.42rem;
    }

    .event-edit-icon,
    .event-edit-handle {
      width: 2.55rem;
      height: 2.55rem;
    }

    .event-edit-copy span,
    .event-edit-copy strong {
      max-width: 7rem;
    }

    .event-pin-stack {
      width: min(13rem, calc(100vw - 1rem));
    }
  }

  .event-route-stop-pin {
    position: relative;
    z-index: 64;
    display: flex;
    width: 1.35rem;
    height: 1.35rem;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    border-radius: 50%;
    background: #7b1113;
    color: white;
    font-size: 0.72rem;
    font-weight: 800;
    box-shadow: 0 2px 0.5rem rgba(0, 0, 0, 0.32);
  }

  .event-route-stop-label {
    position: absolute;
    bottom: calc(100% + 0.35rem);
    left: 50%;
    translate: -50% 0;
    width: max-content;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    background: white;
    color: #18181b;
    font-size: 0.72rem;
    font-weight: 700;
    opacity: 0;
    pointer-events: none;
    box-shadow: 0 2px 0.5rem rgba(0, 0, 0, 0.2);
  }

  .event-route-stop-pin:hover .event-route-stop-label {
    opacity: 1;
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
</style>
