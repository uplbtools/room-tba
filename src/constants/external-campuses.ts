import type { FeatureCollection } from "geojson";
import externalCampusesData from "./external-campuses.json";

// Using raw GeoJSON string or loaded as JSON depending on Vite configuration.
// But wait, importing JSON in Vite works out of the box.
export const EXTERNAL_CAMPUSES_GEOJSON =
  externalCampusesData as FeatureCollection;
