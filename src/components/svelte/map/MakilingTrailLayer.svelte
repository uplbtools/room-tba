<script lang="ts">
  /**
   * Makiling trail on the map (#716): the line, a dot per stop, stop labels
   * once zoomed in, the selected stop ringed. Tapping a dot opens that stop's
   * sheet; tapping the line opens the trail. Answers the trail store's frame
   * and fly requests with the shared visible-area padding.
   */
  import { untrack } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import type * as maplibre from "maplibre-gl";
  import {
    MAKILING_TRAIL_COLOR,
    MAKILING_TRAIL_LAYER_CASING_ID,
    MAKILING_TRAIL_LAYER_ID,
    MAKILING_TRAIL_SELECTED_LAYER_ID,
    MAKILING_TRAIL_SOURCE_ID,
    MAKILING_TRAIL_STATION_LABELS_LAYER_ID,
    MAKILING_TRAIL_STATIONS_LAYER_ID,
    MAKILING_TRAIL_STATIONS_SOURCE_ID,
  } from "@constants/makiling-trail";
  import { MAKILING_TRAIL_PATH } from "@constants/makiling-trail-path";
  import { TERRAIN_ENABLED } from "@constants/map-terrain";
  import { findTrailStop, getTrailStops } from "@lib/makiling-trail";
  import {
    measureVisibleMapPadding,
    pointsBounds,
    SIDE_PANEL_WIDTH_PX,
  } from "@lib/map-fit";
  import { getResolvedTheme, onThemeChange } from "@lib/theme";
  import { openTrailSheet } from "@lib/trail-sheet";
  import {
    mapStore,
    sidePanelStore,
    terrainStore,
    trailStore,
  } from "@lib/store.svelte";

  const mobile = new MediaQuery("max-width:48rem");

  const LAYER_IDS = [
    MAKILING_TRAIL_SELECTED_LAYER_ID,
    MAKILING_TRAIL_STATION_LABELS_LAYER_ID,
    MAKILING_TRAIL_STATIONS_LAYER_ID,
    MAKILING_TRAIL_LAYER_ID,
    MAKILING_TRAIL_LAYER_CASING_ID,
  ];
  /** Where stop names appear; below it the dots alone keep the map calm. */
  const LABEL_MIN_ZOOM = 14.5;

  const lineCoords = MAKILING_TRAIL_PATH.map(
    ([lng, lat]) => [lng, lat] as [number, number],
  );

  function stationFeatures() {
    return {
      type: "FeatureCollection" as const,
      features: getTrailStops().map((stop) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [stop.lon, stop.lat],
        },
        properties: {
          id: stop.id,
          name: stop.name,
          named: stop.description !== undefined,
        },
      })),
    };
  }

  function themeColors() {
    const dark = getResolvedTheme() === "dark";
    return {
      casing: dark ? "#0b1f12" : "#ffffff",
      halo: dark ? "#0f172a" : "#ffffff",
      text: dark ? "#d1fae5" : "#14532d",
      line: dark ? "#4ade80" : MAKILING_TRAIL_COLOR,
    };
  }

  function addLayers(map: maplibre.Map) {
    const colors = themeColors();
    if (!map.getSource(MAKILING_TRAIL_SOURCE_ID)) {
      map.addSource(MAKILING_TRAIL_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: lineCoords },
          properties: {},
        },
      });
    }
    if (!map.getSource(MAKILING_TRAIL_STATIONS_SOURCE_ID)) {
      map.addSource(MAKILING_TRAIL_STATIONS_SOURCE_ID, {
        type: "geojson",
        data: stationFeatures(),
      });
    }
    if (!map.getLayer(MAKILING_TRAIL_LAYER_CASING_ID)) {
      map.addLayer({
        id: MAKILING_TRAIL_LAYER_CASING_ID,
        type: "line",
        source: MAKILING_TRAIL_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": colors.casing,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 5, 16, 9],
          "line-opacity": 0.9,
        },
      });
    }
    if (!map.getLayer(MAKILING_TRAIL_LAYER_ID)) {
      map.addLayer({
        id: MAKILING_TRAIL_LAYER_ID,
        type: "line",
        source: MAKILING_TRAIL_SOURCE_ID,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": colors.line,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 16, 5],
          "line-dasharray": [2, 1],
        },
      });
    }
    if (!map.getLayer(MAKILING_TRAIL_STATIONS_LAYER_ID)) {
      map.addLayer({
        id: MAKILING_TRAIL_STATIONS_LAYER_ID,
        type: "circle",
        source: MAKILING_TRAIL_STATIONS_SOURCE_ID,
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            ["case", ["get", "named"], 5, 3.5],
            16,
            ["case", ["get", "named"], 8, 6],
          ],
          "circle-color": colors.line,
          "circle-stroke-color": colors.casing,
          "circle-stroke-width": 2,
        },
      });
    }
    if (!map.getLayer(MAKILING_TRAIL_SELECTED_LAYER_ID)) {
      map.addLayer({
        id: MAKILING_TRAIL_SELECTED_LAYER_ID,
        type: "circle",
        source: MAKILING_TRAIL_STATIONS_SOURCE_ID,
        filter: ["==", ["get", "id"], trailStore.selectedStopId ?? ""],
        paint: {
          "circle-radius": 12,
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": colors.line,
          "circle-stroke-width": 3,
        },
      });
    }
    if (!map.getLayer(MAKILING_TRAIL_STATION_LABELS_LAYER_ID)) {
      map.addLayer({
        id: MAKILING_TRAIL_STATION_LABELS_LAYER_ID,
        type: "symbol",
        source: MAKILING_TRAIL_STATIONS_SOURCE_ID,
        minzoom: LABEL_MIN_ZOOM,
        layout: {
          "text-field": ["get", "name"],
          // A font both basemaps (MapTiler, OpenFreeMap) serve glyphs for.
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-anchor": "left",
          "text-offset": [0.9, 0],
          "text-optional": true,
          // Named stops win a label collision over plain markers.
          "symbol-sort-key": ["case", ["get", "named"], 0, 1],
        },
        paint: {
          "text-color": colors.text,
          "text-halo-color": colors.halo,
          "text-halo-width": 1.75,
        },
      });
    }
  }

  function removeLayers(map: maplibre.Map) {
    for (const id of LAYER_IDS) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(MAKILING_TRAIL_STATIONS_SOURCE_ID)) {
      map.removeSource(MAKILING_TRAIL_STATIONS_SOURCE_ID);
    }
    if (map.getSource(MAKILING_TRAIL_SOURCE_ID)) {
      map.removeSource(MAKILING_TRAIL_SOURCE_ID);
    }
  }

  function applyTheme(map: maplibre.Map) {
    if (!map.getLayer(MAKILING_TRAIL_LAYER_ID)) return;
    const colors = themeColors();
    map.setPaintProperty(MAKILING_TRAIL_LAYER_CASING_ID, "line-color", colors.casing);
    map.setPaintProperty(MAKILING_TRAIL_LAYER_ID, "line-color", colors.line);
    map.setPaintProperty(MAKILING_TRAIL_STATIONS_LAYER_ID, "circle-color", colors.line);
    map.setPaintProperty(
      MAKILING_TRAIL_STATIONS_LAYER_ID,
      "circle-stroke-color",
      colors.casing,
    );
    map.setPaintProperty(
      MAKILING_TRAIL_SELECTED_LAYER_ID,
      "circle-stroke-color",
      colors.line,
    );
    map.setPaintProperty(MAKILING_TRAIL_STATION_LABELS_LAYER_ID, "text-color", colors.text);
    map.setPaintProperty(
      MAKILING_TRAIL_STATION_LABELS_LAYER_ID,
      "text-halo-color",
      colors.halo,
    );
  }

  // Draw or clear with the toggle. A style that is still loading refuses
  // layers, so retry on each styledata until it takes them.
  $effect(() => {
    const map = mapStore.mapInstance;
    const enabled = trailStore.enabled;
    if (!map) return;
    if (!enabled) {
      if (map.getStyle()) removeLayers(map);
      return;
    }
    const tryAdd = () => {
      try {
        addLayers(map);
        return true;
      } catch {
        return false;
      }
    };
    const offTheme = onThemeChange(() => applyTheme(map));
    if (tryAdd()) return offTheme;
    const onStyleData = () => {
      if (tryAdd()) map.off("styledata", onStyleData);
    };
    map.on("styledata", onStyleData);
    return () => {
      offTheme();
      map.off("styledata", onStyleData);
    };
  });

  // Ring the selected stop.
  $effect(() => {
    const map = mapStore.mapInstance;
    const id = trailStore.selectedStopId ?? "";
    if (!map || !trailStore.enabled) return;
    if (!map.getLayer(MAKILING_TRAIL_SELECTED_LAYER_ID)) return;
    map.setFilter(MAKILING_TRAIL_SELECTED_LAYER_ID, ["==", ["get", "id"], id]);
  });

  // Tap a dot for its stop, the line for the trail. Plain listeners (not
  // layer-delegated): those error while the layers do not exist yet.
  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map || !trailStore.enabled) return;
    const canvas = map.getCanvas();
    const hit = (event: maplibre.MapMouseEvent) => {
      if (!map.getLayer(MAKILING_TRAIL_STATIONS_LAYER_ID)) return null;
      const box: [maplibre.PointLike, maplibre.PointLike] = [
        [event.point.x - 10, event.point.y - 10],
        [event.point.x + 10, event.point.y + 10],
      ];
      const stop = map.queryRenderedFeatures(box, {
        layers: [MAKILING_TRAIL_STATIONS_LAYER_ID],
      })[0];
      if (stop) {
        const id = stop.properties?.id;
        return { stopId: typeof id === "string" ? id : null };
      }
      const line = map.queryRenderedFeatures(box, {
        layers: [MAKILING_TRAIL_LAYER_ID, MAKILING_TRAIL_LAYER_CASING_ID],
      })[0];
      return line ? { stopId: null } : null;
    };
    const click = (event: maplibre.MapMouseEvent) => {
      const target = hit(event);
      if (!target) return;
      if (target.stopId) {
        openTrailSheet(target.stopId, { fly: false });
      } else if (!trailStore.sheetOpen) {
        openTrailSheet(null, { frame: false });
      }
    };
    let pointing = false;
    const hover = (event: maplibre.MapMouseEvent) => {
      const over = hit(event) !== null;
      if (over === pointing) return;
      pointing = over;
      canvas.style.cursor = over ? "pointer" : "";
    };
    map.on("click", click);
    map.on("mousemove", hover);
    return () => {
      map.off("click", click);
      map.off("mousemove", hover);
      if (pointing) canvas.style.cursor = "";
    };
  });

  function padding(map: maplibre.Map) {
    return measureVisibleMapPadding(map, {
      mobile: mobile.current,
      leftPanelWidth: sidePanelStore.collapsed ? 0 : SIDE_PANEL_WIDTH_PX,
    });
  }

  /**
   * Run a camera move once the style is ready and after any camera move
   * already under way (turning terrain on flies to its own view), so ours
   * lands last.
   */
  function whenReady(map: maplibre.Map, move: () => void) {
    let frames = 0;
    const step = () => {
      frames += 1;
      // Wait for the style (a deep link asks before it loads), then two
      // more frames so the sheet has reached its resting place.
      // Terrain turned on just now flies to its own view once the map has
      // loaded; wait for that flight too.
      const pending =
        !map.isStyleLoaded() || terrainStore.status === "loading";
      if ((pending && frames < 600) || frames < 3) {
        requestAnimationFrame(step);
        return;
      }
      if (map.isMoving()) map.once("moveend", () => move());
      else move();
    };
    requestAnimationFrame(step);
  }

  // Frame the whole trail north-up with a gentle tilt, so the climb reads in
  // relief.
  $effect(() => {
    const nonce = trailStore.frameNonce;
    // A deep link asks before the map exists; answer once it does.
    const map = mapStore.mapInstance;
    if (nonce === 0 || !map) return;
    untrack(() => {
      if (TERRAIN_ENABLED && !terrainStore.enabled) terrainStore.enable();
      const bounds = pointsBounds(lineCoords);
      if (!bounds) return;
      whenReady(
        map,
        () => {
          // Fit flat, then tilt: a pitched fit zooms far out on phones. The
          // map already carries the sheet inset as its own padding, so ask
          // only for what the chrome covers beyond it (as fit-route does).
          const chrome = padding(map);
          const current = map.getPadding();
          const camera = map.cameraForBounds(bounds, {
            bearing: 0,
            padding: {
              top: Math.max(0, chrome.top - (current.top ?? 0)),
              bottom: Math.max(0, chrome.bottom - (current.bottom ?? 0)),
              left: Math.max(0, chrome.left - (current.left ?? 0)),
              right: Math.max(0, chrome.right - (current.right ?? 0)),
            },
          });
          if (!camera?.center || camera.zoom === undefined) return;
          map.easeTo({
            center: camera.center,
            // A little out, so the tilted far end stays on screen.
            zoom: Math.min(15, camera.zoom - 0.3),
            bearing: 0,
            pitch: 45,
            duration: 1200,
          });
        },
      );
    });
  });

  // Fly to the selected stop (a list row, search, Prev / Next).
  $effect(() => {
    const nonce = trailStore.flyNonce;
    const map = mapStore.mapInstance;
    if (nonce === 0 || !map) return;
    untrack(() => {
      const stop = findTrailStop(trailStore.selectedStopId);
      if (!stop) return;
      whenReady(map, () => {
        map.flyTo({
          center: [stop.lon, stop.lat],
          zoom: Math.max(map.getZoom(), 15.5),
          padding: padding(map),
          duration: 900,
          essential: true,
        });
      });
    });
  });
</script>
