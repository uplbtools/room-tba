import { describe, expect, test } from "bun:test";
import {
  ROOM_CATEGORIES,
  normalizeRoomCategory,
  roomCategoryLabel,
} from "./room-categories.js";

describe("normalizeRoomCategory", () => {
  test("accepts known categories, case/space-insensitively", () => {
    expect(normalizeRoomCategory("office")).toBe("office");
    expect(normalizeRoomCategory(" Org-Tambayan ")).toBe("org-tambayan");
    expect(normalizeRoomCategory("EVENT-VENUE")).toBe("event-venue");
  });

  test("rejects unknown/empty/non-string as null", () => {
    expect(normalizeRoomCategory("dorm")).toBeNull();
    expect(normalizeRoomCategory("")).toBeNull();
    expect(normalizeRoomCategory(null)).toBeNull();
    expect(normalizeRoomCategory(42)).toBeNull();
  });

  test("every listed category round-trips and has a label", () => {
    for (const c of ROOM_CATEGORIES) {
      expect(normalizeRoomCategory(c)).toBe(c);
      expect(roomCategoryLabel(c)).toBeTruthy();
    }
  });

  test("roomCategoryLabel returns null for untagged", () => {
    expect(roomCategoryLabel(null)).toBeNull();
    expect(roomCategoryLabel("nonsense")).toBeNull();
  });
});
