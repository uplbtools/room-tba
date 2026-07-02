import { describe, expect, test } from "bun:test";

/**
 * Pure mirror of getMapChromeVisibility rules for browse vs edit (see map-chrome.ts).
 */
function visibility(editMode: boolean, mapEditEnabled: boolean) {
  return {
    editMode,
    showSearchSuggestions: !editMode,
    showEventBanner: !editMode,
    showEventsShelf: !editMode,
    showEditDock: mapEditEnabled,
  };
}

describe("map chrome visibility rules", () => {
  test("browse mode shows search and events", () => {
    const v = visibility(false, false);
    expect(v.showSearchSuggestions).toBe(true);
    expect(v.showEventsShelf).toBe(true);
    expect(v.showEditDock).toBe(false);
  });

  test("edit mode hides browse chrome and shows dock", () => {
    const v = visibility(true, true);
    expect(v.showSearchSuggestions).toBe(false);
    expect(v.showEventBanner).toBe(false);
    expect(v.showEditDock).toBe(true);
  });
});
