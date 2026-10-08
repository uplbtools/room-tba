import { render } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, test } from "vitest";
import TransitRouteLifecycle from "./TransitRouteLifecycle.svelte";
import { jeepneyStore, queryStore, sidePanelStore } from "@lib/store.svelte";
import { openCampusBrowse } from "@lib/browse-campus";

function openRoutePanel(id: string) {
  openCampusBrowse(queryStore, sidePanelStore, "jeepney");
  jeepneyStore.openRouteOnMap(id);
}

afterEach(() => {
  jeepneyStore.disableLayer();
  queryStore.clearQuery();
  sidePanelStore.closePanel();
});

describe("TransitRouteLifecycle clears a route its panel no longer shows", () => {
  test("opening another list removes the drawn route", async () => {
    render(TransitRouteLifecycle);
    openRoutePanel("snodlob");
    await tick();
    expect(jeepneyStore.selectedRouteId).toBe("snodlob");

    openCampusBrowse(queryStore, sidePanelStore, "divisions");
    await tick();
    expect(jeepneyStore.selectedRouteId).toBeNull();
  });

  test("closing the search (X) removes it", async () => {
    render(TransitRouteLifecycle);
    openRoutePanel("kaliwa-kanan");
    await tick();

    queryStore.clearQuery();
    await tick();
    expect(jeepneyStore.selectedRouteId).toBeNull();
  });

  test("picking a place from an open stop removes stop and route", async () => {
    render(TransitRouteLifecycle);
    openRoutePanel("snodlob");
    jeepneyStore.openStop(2);
    await tick();

    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: "Main Library",
    });
    await tick();
    expect(jeepneyStore.selectedStopIndex).toBeNull();
    expect(jeepneyStore.selectedRouteId).toBeNull();
  });

  test("a route pinned from Map tools stays over other lists", async () => {
    render(TransitRouteLifecycle);
    jeepneyStore.selectRoute("snodlob");
    openCampusBrowse(queryStore, sidePanelStore, "divisions");
    await tick();
    expect(jeepneyStore.selectedRouteId).toBe("snodlob");

    jeepneyStore.clearDrawnRoute();
    expect(jeepneyStore.selectedRouteId).toBeNull();
  });
});
