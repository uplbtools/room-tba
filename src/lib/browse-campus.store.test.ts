import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";

vi.mock("@lib/overlay-stack.js", () => ({
  dismissEphemeralOverlays: vi.fn(),
}));

import { openBrowseClasses, openCampusBrowse } from "@lib/browse-campus";
import { SidePanelStore } from "@lib/stores/ui-stores.svelte";

type MockQueryStore = {
  category: string | null;
  type: string;
  queryValue: string;
  inputValue: string;
  updateQuery: (obj: {
    category: string | null;
    type: string;
    value: string;
  }) => void;
};

function mockQueryStore(): MockQueryStore {
  const store: MockQueryStore = {
    category: null,
    type: "query",
    queryValue: "",
    inputValue: "",
    updateQuery(obj) {
      store.category = obj.category;
      store.type = obj.type;
      store.queryValue = obj.value;
      store.inputValue = obj.value;
    },
  };
  return store;
}

/**
 * Use the real SidePanelStore, not a hand-rolled double: the regression these
 * tests guard is that `active` is only ever set by `openPanel()`. A double that
 * implements `expand()` alone would keep passing while the panel stays invisible.
 */
function panelStore() {
  const store = new SidePanelStore();
  store.collapse();
  return store;
}

describe("openCampusBrowse", () => {
  test("sets browse query, clears search input, and expands the drawer", () => {
    const queryStore = mockQueryStore();
    const sidePanelStore = panelStore();
    openCampusBrowse(queryStore as never, sidePanelStore, "divisions");
    expect(queryStore.category).toBe("browse");
    expect(queryStore.queryValue).toBe("divisions");
    expect(queryStore.inputValue).toBe("");
    expect(sidePanelStore.collapsed).toBe(false);
  });

  test("activates the side panel so the browse list actually renders", () => {
    const sidePanelStore = panelStore();
    openCampusBrowse(
      mockQueryStore() as never,
      sidePanelStore,
      "organizations",
    );
    expect(sidePanelStore.active).toBe(true);
    expect(sidePanelStore.state?.type).toBe("browsing-entities");
  });
});

describe("openBrowseClasses", () => {
  test("opens classes list and expands the drawer", () => {
    const queryStore = mockQueryStore();
    const sidePanelStore = panelStore();
    openBrowseClasses(queryStore as never, sidePanelStore);
    expect(queryStore.category).toBe("classes");
    expect(queryStore.queryValue).toBe("All classes");
    expect(sidePanelStore.collapsed).toBe(false);
  });

  test("activates the side panel so the classes list actually renders", () => {
    const sidePanelStore = panelStore();
    openBrowseClasses(mockQueryStore() as never, sidePanelStore);
    expect(sidePanelStore.active).toBe(true);
    expect(sidePanelStore.state?.type).toBe("browsing-entities");
  });

  test("still sets the query when the caller opens the panel itself", () => {
    // Sidebar.svelte calls the single-arg form and then opens the panel with its
    // own component; the helper must not throw or no-op on the query.
    const queryStore = mockQueryStore();
    expect(() => openBrowseClasses(queryStore as never)).not.toThrow();
    expect(queryStore.category).toBe("classes");
  });
});

/**
 * Regression guard for the silent breakage in #835: the browse helpers are
 * reached from several components, and a call site that sets a query without
 * activating the panel renders nothing at all — no error, no failing test.
 * These assert the *call sites* still pass the store, so the panel opens.
 */
describe("browse helper call sites keep the side panel wired", () => {
  const CALL_SITES: Array<{ file: string; helper: string }> = [
    {
      file: "src/components/svelte/search/CampusBrowseChips.svelte",
      helper: "openBrowseClasses",
    },
    {
      file: "src/components/svelte/search/CampusBrowseChips.svelte",
      helper: "openCampusBrowse",
    },
    {
      file: "src/components/svelte/navigation/Sidebar.svelte",
      helper: "openCampusBrowse",
    },
    {
      file: "src/components/svelte/navigation/Sidebar.svelte",
      helper: "openBrowseClasses",
    },
    {
      file: "src/components/svelte/modal/StudentOrgsModal.svelte",
      helper: "openCampusBrowse",
    },
    {
      file: "src/components/svelte/controls/EntityBackToList.svelte",
      helper: "openCampusBrowse",
    },
    {
      file: "src/components/svelte/Entry.svelte",
      helper: "openCampusBrowse",
    },
    {
      file: "src/components/svelte/EntityUrlSync.svelte",
      helper: "openCampusBrowse",
    },
  ];

  test.each(CALL_SITES)(
    "$file passes sidePanelStore to $helper",
    ({ file, helper }) => {
      const source = readFileSync(file, "utf8");
      const calls = source.match(new RegExp(`${helper}\\([^)]*\\)`, "g")) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call).toContain("sidePanelStore");
      }
    },
  );
});
