import { beforeEach, describe, expect, test } from "vitest";
import { getSyncKeysFromLs } from "./sync-keys";

describe("getSyncKeysFromLs", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("seeds default sync-key object when missing", () => {
    expect(getSyncKeysFromLs()).toBeNull();
    const raw = localStorage.getItem("sync-key");
    expect(raw).toContain('"buildings"');
    expect(raw).toContain('"classes"');
  });

  test("returns parsed keys when valid JSON exists", () => {
    localStorage.setItem(
      "sync-key",
      JSON.stringify({
        buildings: "abc",
        colleges: "",
        divisions: "",
        rooms: "",
        dorms: "",
        classes: "",
        final_exams: "",
        events: "",
      }),
    );
    expect(getSyncKeysFromLs()?.buildings).toBe("abc");
  });

  test("reseeds corrupted sync-key JSON", () => {
    localStorage.setItem("sync-key", "{not-json");
    expect(getSyncKeysFromLs()).toBeNull();
    expect(localStorage.getItem("sync-key")).toContain('"buildings"');
  });
});
