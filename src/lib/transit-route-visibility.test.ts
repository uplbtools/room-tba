import { describe, expect, test } from "bun:test";
import {
  isRoutePanelQuery,
  shouldClearDrawnRoute,
} from "./transit-route-visibility";

const drawn = {
  routeId: "snodlob",
  pinned: false,
  stopOpen: false,
  routePanelOpen: false,
};

describe("shouldClearDrawnRoute", () => {
  test("a route left behind by its closed panel is cleared", () => {
    expect(shouldClearDrawnRoute(drawn)).toBe(true);
  });

  test("kept while its route or stop panel shows, or when pinned", () => {
    expect(shouldClearDrawnRoute({ ...drawn, routePanelOpen: true })).toBe(
      false,
    );
    expect(shouldClearDrawnRoute({ ...drawn, stopOpen: true })).toBe(false);
    expect(shouldClearDrawnRoute({ ...drawn, pinned: true })).toBe(false);
  });

  test("nothing to clear without a route", () => {
    expect(shouldClearDrawnRoute({ ...drawn, routeId: null })).toBe(false);
  });
});

describe("isRoutePanelQuery", () => {
  test("only the jeepney browse list hosts the route panel", () => {
    expect(isRoutePanelQuery("browse", "jeepney")).toBe(true);
    expect(isRoutePanelQuery("browse", "divisions")).toBe(false);
    expect(isRoutePanelQuery("building", "jeepney")).toBe(false);
    expect(isRoutePanelQuery(null, null)).toBe(false);
  });
});
