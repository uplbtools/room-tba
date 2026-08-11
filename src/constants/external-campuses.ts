import type { FeatureCollection } from "geojson";
import externalCampusesData from "./external-campuses.json";

// Using raw GeoJSON string or loaded as JSON depending on Vite configuration.
// But wait, importing JSON in Vite works out of the box.
export const EXTERNAL_CAMPUSES_GEOJSON =
  externalCampusesData as FeatureCollection;

/** Stable map pins for the two external campuses whose boundaries are shown. */
export const EXTERNAL_CAMPUSES_LABELS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "UP Open University (UPOU)" },
      geometry: { type: "Point", coordinates: [121.263009, 14.174569] },
    },
    {
      type: "Feature",
      properties: { name: "International Rice Research Institute (IRRI)" },
      geometry: { type: "Point", coordinates: [121.255221, 14.168834] },
    },
  ],
};
