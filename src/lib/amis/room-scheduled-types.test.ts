import { describe, expect, it } from "bun:test";
import {
  classTypeDisplayLabel,
  CLASS_BROWSE_SCOPE_NOTE,
  isNonRoomClassType,
  isRoomScheduledClassType,
  ROOM_SCHEDULE_SCOPE_NOTE,
} from "./room-scheduled-types";

describe("room-scheduled-types", () => {
  it("treats LEC, LAB, RCT, and CPT as room-scheduled", () => {
    expect(isRoomScheduledClassType("LEC")).toBe(true);
    expect(isRoomScheduledClassType("lab")).toBe(true);
    expect(isRoomScheduledClassType("RCT")).toBe(true);
    expect(isRoomScheduledClassType("cpt")).toBe(true);
  });

  it("recognizes roomless import types", () => {
    expect(isNonRoomClassType("THE")).toBe(true);
    expect(isNonRoomClassType("SPR")).toBe(true);
    expect(isNonRoomClassType("DSR")).toBe(true);
    expect(isNonRoomClassType("PRA")).toBe(true);
    expect(isNonRoomClassType("IND")).toBe(true);
    expect(isNonRoomClassType("LEC")).toBe(false);
    expect(isNonRoomClassType("THS")).toBe(false);
  });

  it("maps roomless types to display labels", () => {
    expect(classTypeDisplayLabel("THE")).toBe("Thesis");
    expect(classTypeDisplayLabel("spr")).toBe("Special problem");
    expect(classTypeDisplayLabel("LEC")).toBe("LEC");
  });

  it("documents scope for room schedules vs class browse", () => {
    expect(ROOM_SCHEDULE_SCOPE_NOTE).toContain("do not appear here");
    expect(CLASS_BROWSE_SCOPE_NOTE).toContain("thesis");
    expect(CLASS_BROWSE_SCOPE_NOTE).toContain("unassigned");
  });
});
