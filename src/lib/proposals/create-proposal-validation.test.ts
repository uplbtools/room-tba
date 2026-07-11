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

  test("create_organization requires a name, valid category, and map pin", () => {
    expect(() =>
      validateCreateProposalPatch("create_organization", {
        name: "UP Circle",
      }),
    ).toThrow(ProposalValidationError);

    expect(() =>
      validateCreateProposalPatch("create_organization", {
        name: "UP Circle",
        category: "not-a-category",
      }),
    ).toThrow(ProposalValidationError);

    expect(() =>
      validateCreateProposalPatch("create_organization", {
        name: "UP Circle",
        category: "student-org",
        lat: 14.165,
        lon: 121.242,
      }),
    ).not.toThrow();
  });

  test("create_place requires a valid category and map pin", () => {
    expect(() =>
      validateCreateProposalPatch("create_place", {
        name: "But First Coffee",
        category: "not-a-category",
        lat: 14.165,
        lon: 121.242,
      }),
    ).toThrow(ProposalValidationError);

    expect(() =>
      validateCreateProposalPatch("create_place", {
        name: "But First Coffee",
        category: "food",
        lat: 14.165,
        lon: 121.242,
      }),
    ).not.toThrow();
  });
});
