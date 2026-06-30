import { describe, expect, it } from "bun:test";
import { openCampusBrowseModal } from "./browse-campus";

describe("openCampusBrowseModal", () => {
  it("opens the filter modal with the requested tab", () => {
    const calls: unknown[] = [];
    const modalStore = {
      openModal: (...args: unknown[]) => {
        calls.push(args);
      },
    };

    openCampusBrowseModal(modalStore as never, "colleges");

    expect(calls).toEqual([["filter", { filterTab: "colleges" }]]);
  });
});
