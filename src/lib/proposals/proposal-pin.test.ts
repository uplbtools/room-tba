import { describe, expect, test } from "bun:test";
import {
  pinChangeBounds,
  pinMoveDistanceMeters,
  proposalPinChange,
} from "./proposal-pin";

describe("proposalPinChange", () => {
  test("reads a moved building pin against its published values", () => {
    const change = proposalPinChange({
      proposedPatch: { lat: 14.1663, lon: 121.2412 },
      currentValues: { lat: 14.1661, lon: 121.241 },
    });

    expect(change).toEqual({
      before: { lat: 14.1661, lon: 121.241 },
      after: { lat: 14.1663, lon: 121.2412 },
    });
  });

  test("a create_* proposal has no published position", () => {
    const change = proposalPinChange({
      proposedPatch: { lat: 14.17, lon: 121.24, buildingName: "New Hall" },
      currentValues: null,
    });

    expect(change?.before).toBeNull();
    expect(change?.after).toEqual({ lat: 14.17, lon: 121.24 });
  });

  test("reads the first location of an event patch", () => {
    const change = proposalPinChange({
      proposedPatch: {
        locations: [
          { label: "Main", lat: 14.168, lon: 121.243 },
          { label: "Overflow", lat: 14.169, lon: 121.244 },
        ],
      },
    });

    expect(change?.after).toEqual({ lat: 14.168, lon: 121.243 });
  });

  test("no preview when the patch does not move a pin", () => {
    expect(
      proposalPinChange({ proposedPatch: { directions: "Beside the oval" } }),
    ).toBeNull();
  });

  test("no preview when the pin is unchanged", () => {
    expect(
      proposalPinChange({
        proposedPatch: { lat: 14.1663, lon: 121.2412 },
        currentValues: { lat: 14.1663, lon: 121.2412 },
      }),
    ).toBeNull();
  });

  test("a lone coordinate is not a location", () => {
    expect(proposalPinChange({ proposedPatch: { lat: 14.1663 } })).toBeNull();
    expect(
      proposalPinChange({ proposedPatch: { lat: "nope", lon: 121.24 } }),
    ).toBeNull();
  });

  test("accepts numeric strings, which is how form patches arrive", () => {
    expect(
      proposalPinChange({ proposedPatch: { lat: "14.1663", lon: "121.2412" } })
        ?.after,
    ).toEqual({ lat: 14.1663, lon: 121.2412 });
  });
});

describe("pinChangeBounds", () => {
  test("encloses both pins with padding", () => {
    const bounds = pinChangeBounds(
      {
        before: { lat: 14.166, lon: 121.241 },
        after: { lat: 14.167, lon: 121.242 },
      },
      0.001,
    );

    expect(bounds).not.toBeNull();
    const [[west, south], [east, north]] = bounds as [
      [number, number],
      [number, number],
    ];
    expect(west).toBeCloseTo(121.24, 6);
    expect(south).toBeCloseTo(14.165, 6);
    expect(east).toBeCloseTo(121.243, 6);
    expect(north).toBeCloseTo(14.168, 6);
  });

  test("returns null when there is only the proposed pin", () => {
    expect(
      pinChangeBounds({ before: null, after: { lat: 14.166, lon: 121.241 } }),
    ).toBeNull();
  });
});

describe("pinMoveDistanceMeters", () => {
  test("measures the move", () => {
    const metres = pinMoveDistanceMeters({
      before: { lat: 14.166, lon: 121.241 },
      after: { lat: 14.167, lon: 121.241 },
    });
    // 0.001 degrees of latitude is ~111m.
    expect(metres).toBeGreaterThan(105);
    expect(metres).toBeLessThan(118);
  });

  test("is null with no published pin to compare against", () => {
    expect(
      pinMoveDistanceMeters({
        before: null,
        after: { lat: 14.166, lon: 121.241 },
      }),
    ).toBeNull();
  });
});
