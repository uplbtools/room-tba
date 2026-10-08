import { describe, expect, it } from "bun:test";
import { campusListState } from "./campus-list-state";

const base = { count: 0, loaded: true, phase: "ready", online: true } as const;

describe("campusListState", () => {
  it("is ready whenever rows exist, even offline or mid-load", () => {
    expect(campusListState({ ...base, count: 3, online: false })).toBe("ready");
    expect(campusListState({ ...base, count: 3, phase: "remote" })).toBe(
      "ready",
    );
  });

  it("shows a skeleton while campus data is still on its way", () => {
    expect(campusListState({ ...base, loaded: false })).toBe("loading");
    expect(campusListState({ ...base, phase: "remote" })).toBe("loading");
    expect(campusListState({ ...base, phase: "sync" })).toBe("loading");
  });

  it("says not available offline instead of 'none listed'", () => {
    expect(campusListState({ ...base, online: false })).toBe("offline");
    expect(campusListState({ ...base, online: false, phase: "remote" })).toBe(
      "offline",
    );
  });

  it("is empty only once loading finished online", () => {
    expect(campusListState(base)).toBe("empty");
    expect(campusListState({ ...base, phase: "error" })).toBe("empty");
  });
});
