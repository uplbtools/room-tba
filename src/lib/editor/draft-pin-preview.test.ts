import { describe, expect, test } from "vitest";
import {
  buildDraftPinPreview,
  draftPinMapProps,
  draftPinRowLabel,
} from "./draft-pin-preview";

describe("buildDraftPinPreview", () => {
  test("returns null when the pin kind has no name yet", () => {
    expect(
      buildDraftPinPreview({
        kind: "create_building",
        buildingName: "  ",
        dormName: "",
        placeName: "",
        placeCategory: "landmark",
        organizationName: "",
        organizationCategory: "student-org",
        eventTitle: "",
        eventStartsAt: "",
        eventImageUrl: null,
      }),
    ).toBeNull();
  });

  test("maps building and dorm kinds", () => {
    expect(
      buildDraftPinPreview({
        kind: "create_building",
        buildingName: " Baker Hall ",
        dormName: "",
        placeName: "",
        placeCategory: "landmark",
        organizationName: "",
        organizationCategory: "student-org",
        eventTitle: "",
        eventStartsAt: "",
        eventImageUrl: null,
      }),
    ).toEqual({ kind: "building", label: "Baker Hall" });

    expect(
      buildDraftPinPreview({
        kind: "create_dorm",
        buildingName: "",
        dormName: "Sampaguita",
        placeName: "",
        placeCategory: "landmark",
        organizationName: "",
        organizationCategory: "student-org",
        eventTitle: "",
        eventStartsAt: "",
        eventImageUrl: null,
      }),
    ).toEqual({ kind: "dorm", label: "Sampaguita" });
  });

  test("maps place and organization categories to preview metadata", () => {
    expect(
      draftPinMapProps({
        kind: "place",
        label: "Oblation",
        placeCategory: "tourist-spot",
      }).tone,
    ).toBe("landmark");

    expect(
      draftPinMapProps({
        kind: "place",
        label: "Cafe",
        placeCategory: "food",
      }),
    ).toMatchObject({ tone: "establishment", icon: "store" });

    expect(
      draftPinMapProps({
        kind: "organization",
        label: "CSS",
        orgCategory: "student-org",
      }),
    ).toMatchObject({ tone: "organization", icon: "users" });

    expect(
      draftPinMapProps({
        kind: "organization",
        label: "Registrar",
        orgCategory: "office",
      }),
    ).toMatchObject({ tone: "office", icon: "briefcase" });
  });

  test("formats event preview date label", () => {
    const props = draftPinMapProps({
      kind: "event",
      label: "Lantern Parade",
      eventStartsAt: "2026-12-18T18:00",
      eventImageUrl: null,
    });
    expect(props.component).toBe("event");
    expect(props.dateLabel).toMatch(/Dec/);
  });
});

describe("draftPinRowLabel", () => {
  test("uses entity name when coords exist", () => {
    expect(
      draftPinRowLabel({ kind: "building", label: "Baker Hall" }, true),
    ).toBe("Pin set · Baker Hall");
    expect(draftPinRowLabel(null, false)).toBe("Drop a pin on the map");
    expect(draftPinRowLabel(null, true)).toBe("Pin set on map");
  });
});
