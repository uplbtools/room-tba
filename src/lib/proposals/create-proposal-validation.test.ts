import { describe, expect, test } from "bun:test";
import {
  parseBundledRooms,
  ProposalValidationError,
  validateBundledRooms,
  validateCreateProposalPatch,
} from "@lib/proposals/create-proposal-validation";

describe("parseBundledRooms", () => {
  test("skips empty codes and non-objects", () => {
    expect(
      parseBundledRooms({
        rooms: [
          { roomCode: " 301 ", directions: "Third floor" },
          { roomCode: "" },
          null,
        ],
      }),
    ).toEqual([{ roomCode: "301", directions: "Third floor" }]);
  });
});

describe("validateBundledRooms", () => {
  test("rejects duplicates and over-limit lists", () => {
    expect(() =>
      validateBundledRooms([
        { roomCode: "301", directions: "" },
        { roomCode: "301", directions: "" },
      ]),
    ).toThrow(ProposalValidationError);

    const many = Array.from({ length: 21 }, (_, i) => ({
      roomCode: `R${i}`,
      directions: "",
    }));
    expect(() => validateBundledRooms(many)).toThrow(ProposalValidationError);
  });
});

describe("validateCreateProposalPatch", () => {
  test("create_building accepts bundled rooms", () => {
    expect(() =>
      validateCreateProposalPatch("create_building", {
        buildingName: "Gonzaga Hall",
        lat: 14.65,
        lon: 121.07,
        rooms: [
          { roomCode: "301", directions: "Left wing" },
          { roomCode: "302", directions: "" },
        ],
      }),
    ).not.toThrow();
  });

  test("create_room requires room code and buildingId", () => {
    expect(() =>
      validateCreateProposalPatch("create_room", {
        roomCode: "301",
      }),
    ).toThrow(ProposalValidationError);

    expect(() =>
      validateCreateProposalPatch("create_room", {
        roomCode: "",
        buildingId: 1,
      }),
    ).toThrow(ProposalValidationError);

    expect(() =>
      validateCreateProposalPatch("create_room", {
        roomCode: "301",
        buildingId: 1,
      }),
    ).not.toThrow();
  });
});
