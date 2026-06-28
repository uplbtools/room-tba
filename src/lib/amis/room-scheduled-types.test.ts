import { describe, expect, it } from "bun:test";
import {
  isRoomScheduledClassType,
  ROOM_SCHEDULE_SCOPE_NOTE,
} from "./room-scheduled-types";

describe("room-scheduled-types", () => {
  it("treats LEC and LAB as room-scheduled", () => {
    expect(isRoomScheduledClassType("LEC")).toBe(true);
    expect(isRoomScheduledClassType("lab")).toBe(true);
  });

  it("excludes thesis and special-problem types", () => {
    expect(isRoomScheduledClassType("THE")).toBe(false);
    expect(isRoomScheduledClassType("SPR")).toBe(false);
    expect(isRoomScheduledClassType("DSR")).toBe(false);
    expect(isRoomScheduledClassType("PRA")).toBe(false);
  });

  it("documents scope for users", () => {
    expect(ROOM_SCHEDULE_SCOPE_NOTE).toContain("Thesis");
    expect(ROOM_SCHEDULE_SCOPE_NOTE).toContain("special problem");
  });
});
