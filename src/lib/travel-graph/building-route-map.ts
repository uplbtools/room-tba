import type { FeatureCollection, LineString } from "geojson";
import type { BuildingWalkRoute } from "./building-route";

export const BUILDING_ROUTE_CONNECTOR_RENDER_MIN_METERS = 1.5;

export function buildingRouteGeoJson(route: BuildingWalkRoute): {
  graph: FeatureCollection<LineString>;
  connectors: FeatureCollection<LineString>;
} {
  const connectorEntries = [
    {
      meters: route.originConnectorMeters,
      coordinates: route.originConnectorCoordinates,
    },
    {
      meters: route.destinationConnectorMeters,
      coordinates: route.destinationConnectorCoordinates,
    },
  ];

  return {
    graph: {
      type: "FeatureCollection",
      // A direct same-position virtual route can legitimately contain one
      // coordinate. GeoJSON LineString requires at least two positions.
      features:
        route.graphCoordinates.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: route.graphCoordinates,
                },
              },
            ]
          : [],
    },
    connectors: {
      type: "FeatureCollection",
      // Preserve tiny connector cost in route totals, but do not render a
      // sub-pixel dashed artifact when the pin is effectively on the path.
      features: connectorEntries
        .filter(
          ({ meters, coordinates }) =>
            meters >= BUILDING_ROUTE_CONNECTOR_RENDER_MIN_METERS &&
            coordinates.length >= 2,
        )
        .map(({ coordinates }) => ({
          type: "Feature" as const,
          properties: {},
          geometry: { type: "LineString" as const, coordinates },
        })),
    },
  };
}

/** Every coordinate that must remain visible when framing a building route. */
export function buildingRouteFitCoordinates(
  route: BuildingWalkRoute,
): [number, number][] {
  return [
    ...route.originConnectorCoordinates,
    ...route.graphCoordinates,
    ...route.destinationConnectorCoordinates,
  ];
}

export function buildingRouteCameraAnimationOptions(reducedMotion: boolean) {
  return {
    animate: !reducedMotion,
    duration: reducedMotion ? 0 : 650,
  } as const;
}
