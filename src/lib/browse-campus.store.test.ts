import { describe, expect, test, vi } from "vitest";

vi.mock("@lib/overlay-stack.js", () => ({
  dismissEphemeralOverlays: vi.fn(),
}));

import { openBrowseClasses, openCampusBrowse } from "@lib/browse-campus";

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

describe("openCampusBrowse", () => {
  test("sets browse query, clears search input, and expands the drawer", () => {
    const queryStore = mockQueryStore();
    const sidePanelStore = {
      collapsed: true,
      expand() {
        this.collapsed = false;
      },
    };
    openCampusBrowse(queryStore as never, sidePanelStore as never, "divisions");
    expect(queryStore.category).toBe("browse");
    expect(queryStore.queryValue).toBe("divisions");
    expect(queryStore.inputValue).toBe("");
    expect(sidePanelStore.collapsed).toBe(false);
  });
});

describe("openBrowseClasses", () => {
  test("opens classes list and expands the drawer", () => {
    const queryStore = mockQueryStore();
    const sidePanelStore = {
      collapsed: true,
      expand() {
        this.collapsed = false;
      },
    };
    openBrowseClasses(queryStore as never, sidePanelStore as never);
    expect(queryStore.category).toBe("classes");
    expect(queryStore.queryValue).toBe("All classes");
    expect(sidePanelStore.collapsed).toBe(false);
  });
});
