import { describe, expect, test } from "bun:test";
import { buildTravelGraph } from "./engine";
import {
  routeBuildingToBuilding,
  type BuildingRouteEndpoint,
} from "./building-route";

const LOOP_METERS = 400;

function loopGraph(oneway = false) {
  return buildTravelGraph({
    meta: { coordScale: 1e6, nodeCount: 1, edgeCount: 1 },
    nodes: [[1, 14, 121]],
    // Square loop in stored u -> v order, returning to the same graph node.
    edges: [
      [
        0,
        0,
        LOOP_METERS,
        "footway",
        null,
        [1000, 0, 0, 1000, -1000, 0],
        oneway ? 1 : undefined,
      ],
    ],
  });
}

function building(
  id: number,
  lat: number,
  lon: number,
): BuildingRouteEndpoint {
  return { id, buildingName: `Building ${id}`, lat, lon };
}

describe("building routing on self-loop edges", () => {
  test("two-way loop can take the shorter path across the stored edge seam", () => {
    const result = routeBuildingToBuilding({
      graph: loopGraph(),
      // Origin lies near stored u on the first segment; destination lies near
      // stored v on the final segment. Because u === v, the short walk crosses
      // the seam instead of traversing most of the loop geometry.
      origin: building(1, 14, 121.0004),
      destination: building(2, 14.0004, 121),
      maxSnapMeters: 5,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const direct = Math.abs(
      result.destinationSnap.edgeMetersFromU -
        result.originSnap.edgeMetersFromU,
    );
    const seam =
      result.originSnap.edgeMetersFromU +
      result.destinationSnap.edgeMetersToV;

    expect(result.route.graphMeters).toBeCloseTo(seam, 6);
    expect(result.route.graphMeters).toBeLessThan(direct);
    expect(result.route.graphCoordinates[0]).toEqual(
      result.originSnap.snappedCoordinate,
    );
    expect(result.route.graphCoordinates.at(-1)).toEqual(
      result.destinationSnap.snappedCoordinate,
    );
  });

  test("one-way loop can wrap forward across the seam but never reverse directly", () => {
    const result = routeBuildingToBuilding({
      graph: loopGraph(true),
      // Stored direction reaches the origin near v, wraps v/u at the same
      // graph node, then continues forward to the destination near u.
      origin: building(1, 14.0004, 121),
      destination: building(2, 14, 121.0004),
      maxSnapMeters: 5,
    });

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(result.originSnap.edgeMetersFromU).toBeGreaterThan(
      result.destinationSnap.edgeMetersFromU,
    );
    const forwardWrap =
      result.originSnap.edgeMetersToV +
      result.destinationSnap.edgeMetersFromU;
    expect(result.route.graphMeters).toBeCloseTo(forwardWrap, 6);
    expect(result.route.graphMeters).toBeLessThan(LOOP_METERS / 2);
  });
});
