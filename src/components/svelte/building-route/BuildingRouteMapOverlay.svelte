<script lang="ts">
  import type { FeatureCollection, LineString } from "geojson";
  import {
    LngLatBounds,
    type GeoJSONSource,
    type MapLibreMap,
  } from "maplibre-gl";
  import { buildingRouteStore, mapStore } from "@lib/store.svelte";
  import {
    buildingRouteCameraAnimationOptions,
    buildingRouteFitCoordinates,
    buildingRouteGeoJson,
  } from "@lib/travel-graph/building-route-map";

  const GRAPH_SOURCE = "building-walk-route-graph";
  const GRAPH_CASING_LAYER = "building-walk-route-graph-casing";
  const GRAPH_LAYER = "building-walk-route-graph";
  const CONNECTOR_SOURCE = "building-walk-route-connectors";
  const CONNECTOR_LAYER = "building-walk-route-connectors";

  let lastFitKey: string | null = null;

  function removeRouteLayers(map: MapLibreMap) {
    if (map.getLayer(GRAPH_LAYER)) map.removeLayer(GRAPH_LAYER);
    if (map.getLayer(GRAPH_CASING_LAYER)) map.removeLayer(GRAPH_CASING_LAYER);
    if (map.getLayer(CONNECTOR_LAYER)) map.removeLayer(CONNECTOR_LAYER);
    if (map.getSource(GRAPH_SOURCE)) map.removeSource(GRAPH_SOURCE);
    if (map.getSource(CONNECTOR_SOURCE)) map.removeSource(CONNECTOR_SOURCE);
  }

  function setOrAddSource(
    map: MapLibreMap,
    sourceId: string,
    data: FeatureCollection<LineString>,
  ) {
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      map.addSource(sourceId, { type: "geojson", data });
    }
  }

  function ensureRouteLayers(map: MapLibreMap) {
    // Approximate pin connectors deliberately sit below all authoritative
    // route paint. Their lighter dash communicates "access approximation"
    // without competing with the mapped walking geometry.
    if (!map.getLayer(CONNECTOR_LAYER)) {
      map.addLayer({
        id: CONNECTOR_LAYER,
        type: "line",
        source: CONNECTOR_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#71717a",
          "line-width": 2,
          "line-opacity": 0.56,
          "line-dasharray": [1, 1.5],
        },
      });
    }

    // Match Room TBA's existing route visual language: a neutral casing keeps
    // the maroon line legible across labels, buildings, and road strokes.
    if (!map.getLayer(GRAPH_CASING_LAYER)) {
      map.addLayer({
        id: GRAPH_CASING_LAYER,
        type: "line",
        source: GRAPH_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": 8,
          "line-opacity": 0.82,
        },
      });
    }

    if (!map.getLayer(GRAPH_LAYER)) {
      map.addLayer({
        id: GRAPH_LAYER,
        type: "line",
        source: GRAPH_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#8d1437",
          "line-width": 5,
          "line-opacity": 0.95,
        },
      });
    }
  }

  function syncRoute(map: MapLibreMap) {
    const route = buildingRouteStore.route;
    if (!map.isStyleLoaded()) return;
    if (!route) {
      lastFitKey = null;
      removeRouteLayers(map);
      return;
    }

    const data = buildingRouteGeoJson(route);
    setOrAddSource(map, CONNECTOR_SOURCE, data.connectors);
    setOrAddSource(map, GRAPH_SOURCE, data.graph);
    ensureRouteLayers(map);
  }

  function routeFitPadding(map: MapLibreMap) {
    const mapRect = map.getContainer().getBoundingClientRect();
    const panelRect = document
      .getElementById("map-tools-panel")
      ?.getBoundingClientRect();
    const mobile = window.matchMedia("(max-width: 48rem)").matches;
    const gutter = 24;

    if (mobile) {
      const panelTop = panelRect?.top ?? mapRect.bottom - 156;
      return {
        top: 96,
        right: 36,
        bottom: Math.max(156, mapRect.bottom - panelTop + gutter),
        left: 36,
      };
    }

    const panelLeft = panelRect?.left ?? mapRect.right - 384;
    return {
      top: 96,
      right: Math.max(72, mapRect.right - panelLeft + gutter),
      bottom: 72,
      left: 72,
    };
  }

  function fitRoute(map: MapLibreMap) {
    const route = buildingRouteStore.route;
    const origin = buildingRouteStore.origin;
    const destination = buildingRouteStore.destination;
    if (!route || !origin || !destination) return;

    const key = [
      origin.id,
      destination.id,
      route.totalMeters.toFixed(1),
    ].join(":");
    if (key === lastFitKey) return;
    lastFitKey = key;

    const bounds = new LngLatBounds();
    for (const coordinate of buildingRouteFitCoordinates(route)) {
      bounds.extend(coordinate);
    }
    if (bounds.isEmpty()) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    map.fitBounds(bounds, {
      padding: routeFitPadding(map),
      maxZoom: 18,
      ...buildingRouteCameraAnimationOptions(reducedMotion),
    });
  }

  $effect(() => {
    const map = mapStore.mapInstance ?? null;
    const route = buildingRouteStore.route;
    if (!map) return;

    const sync = () => {
      syncRoute(map);
      if (route) fitRoute(map);
    };

    sync();
    map.on("style.load", sync);

    return () => {
      map.off("style.load", sync);
      if (map.isStyleLoaded()) removeRouteLayers(map);
    };
  });
</script>
