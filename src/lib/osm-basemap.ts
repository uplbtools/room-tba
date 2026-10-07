/**
 * Ground image for the 3D building viewer: the campus map itself, rendered
 * top-down by a throwaway offscreen MapLibre map and handed back as a canvas
 * plus its true extent in local meters (so the caller can size a Three.js
 * plane to match).
 *
 * It used to composite MapTiler `streets-v2` raster tiles. Those bake in
 * street names and parking/bus POI icons, which the tilted camera stretched
 * into big smeared glyphs. Rendering the campus style lets us drop every
 * symbol layer first, and it follows the same MapTiler → OpenFreeMap fallback
 * as the main map (`loadCampusMapStyle`). Attribution must remain visible
 * (OpenStreetMap contributors + whoever served the tiles).
 */

import type { StyleSpecification } from "maplibre-gl";
import { loadCampusMapStyle } from "@lib/maptiler-key";

/** Web Mercator equator length, meters. */
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
/** MapLibre zoom levels are defined against 512px tiles. */
const TILE_SIZE = 512;
const RENDER_TIMEOUT_MS = 15_000;

/**
 * Labels and POI icons are `symbol` layers: under the viewer's tilt they
 * smear across the ground. Extrusions would draw a second, flat-roofed copy
 * of the very building the viewer models in 3D.
 */
const DROPPED_LAYER_TYPES = new Set(["symbol", "fill-extrusion"]);

export type Basemap = {
  /** Top-down image of the area, ready to use as a CanvasTexture. */
  canvas: HTMLCanvasElement;
  /** Half-extent west↔east in local meters (canvas is centered on the building). */
  halfWidthMeters: number;
  /** Half-extent north↔south in local meters. */
  halfDepthMeters: number;
};

/** The campus style as a flat ground: no labels, POIs, extrusions or terrain. */
export function groundStyle(style: StyleSpecification): StyleSpecification {
  const { terrain: _terrain, sky: _sky, ...rest } = style;
  return {
    ...rest,
    layers: style.layers.filter(
      (layer) => !DROPPED_LAYER_TYPES.has(layer.type),
    ),
  };
}

/** MapLibre zoom at which one CSS pixel covers `metersPerPixel` at `lat`. */
export function zoomForMetersPerPixel(lat: number, metersPerPixel: number) {
  return Math.log2(
    (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) /
      (TILE_SIZE * metersPerPixel),
  );
}

/**
 * Render a square of `radiusMeters * 2` on a side, centered on
 * (centerLat, centerLon), north up.
 *
 * Returns null if the style or tiles fail to load in time.
 */
export async function fetchBasemap(opts: {
  centerLat: number;
  centerLon: number;
  /** Half-side length of the desired square area, in meters. */
  radiusMeters: number;
  /** Image side in pixels; 1536 keeps ~0.2 m/px for a 150 m radius. */
  sizePx?: number;
}): Promise<Basemap | null> {
  const { centerLat, centerLon, radiusMeters } = opts;
  const size = opts.sizePx ?? 1536;

  let style: StyleSpecification;
  let maplibregl: typeof import("maplibre-gl");
  try {
    [maplibregl, style] = await Promise.all([
      import("maplibre-gl"),
      loadCampusMapStyle<StyleSpecification>(),
    ]);
  } catch (err) {
    console.warn("Basemap style failed", err);
    return null;
  }

  // Offscreen but laid out: MapLibre needs a sized container to render.
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  Object.assign(container.style, {
    position: "fixed",
    top: "0",
    left: "-100000px",
    width: `${size}px`,
    height: `${size}px`,
    pointerEvents: "none",
  });
  document.body.append(container);

  const map = new maplibregl.Map({
    container,
    style: groundStyle(style),
    center: [centerLon, centerLat],
    zoom: zoomForMetersPerPixel(centerLat, (radiusMeters * 2) / size),
    interactive: false,
    attributionControl: false,
    pixelRatio: 1,
    fadeDuration: 0,
    // Keep the frame readable after MapLibre presents it.
    canvasContextAttributes: { preserveDrawingBuffer: true },
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Basemap render timed out")),
        RENDER_TIMEOUT_MS,
      );
      map.once("idle", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(map.getCanvas(), 0, 0, size, size);
    return {
      canvas,
      halfWidthMeters: radiusMeters,
      halfDepthMeters: radiusMeters,
    };
  } catch (err) {
    console.warn("Basemap render failed", err);
    return null;
  } finally {
    map.remove();
    container.remove();
  }
}
