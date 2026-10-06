import { describe, expect, test } from "bun:test";
import {
  bearingDegrees,
  distanceMetres,
  facadeHeadings,
  isGoogleCapture,
  isLikelyPhotoTitle,
  isPhysicalOrgCategory,
  stripHtml,
  titleNamesPlace,
} from "./landmark-images-core";

describe("bearingDegrees", () => {
  test("cardinal directions", () => {
    const origin = { lat: 14.16, lng: 121.24 };
    expect(bearingDegrees(origin, { lat: 14.17, lng: 121.24 })).toBe(0);
    expect(bearingDegrees(origin, { lat: 14.16, lng: 121.25 })).toBe(90);
    expect(bearingDegrees(origin, { lat: 14.15, lng: 121.24 })).toBe(180);
    expect(bearingDegrees(origin, { lat: 14.16, lng: 121.23 })).toBe(270);
  });
});

describe("facadeHeadings", () => {
  test("spreads around the base heading", () => {
    expect(facadeHeadings(90)).toEqual([35, 90, 145]);
  });

  test("wraps across north", () => {
    expect(facadeHeadings(10)).toEqual([315, 10, 65]);
  });
});

describe("isLikelyPhotoTitle", () => {
  test("keeps photographs, drops maps and documents", () => {
    expect(isLikelyPhotoTitle("File:Baker Hall front.jpg")).toBe(true);
    expect(isLikelyPhotoTitle("File:Oblation.JPEG")).toBe(true);
    expect(isLikelyPhotoTitle("File:UPLB campus map.svg")).toBe(false);
    expect(isLikelyPhotoTitle("File:Campus plan.pdf")).toBe(false);
    // Raster maps used to slip through on extension alone.
    expect(isLikelyPhotoTitle("File:UPLB_Campus_map.png")).toBe(false);
    expect(isLikelyPhotoTitle("File:Mapua Hall.jpg")).toBe(true);
  });
});

describe("stripHtml", () => {
  test("unwraps Commons artist markup", () => {
    expect(
      stripHtml('<a href="//commons.wikimedia.org/wiki/User:X">Juan\nD</a>'),
    ).toBe("Juan D");
  });

  test("drops angle brackets the tag pattern cannot pair off", () => {
    expect(stripHtml("Juan <b")).toBe("Juan b");
    expect(stripHtml('<a href="<script>">Juan</a>')).toBe('"Juan');
    expect(stripHtml("<<a>script>alert(1)")).toBe("scriptalert(1)");
  });
});

describe("small-place filters", () => {
  test("distanceMetres", () => {
    const a = { lat: 14.16, lng: 121.24 };
    expect(distanceMetres(a, a)).toBe(0);
    // 0.001 deg of latitude is about 111m.
    expect(Math.round(distanceMetres(a, { lat: 14.161, lng: 121.24 }))).toBe(
      111,
    );
  });

  test("only Google's own captures pass", () => {
    expect(isGoogleCapture("© Google")).toBe(true);
    expect(isGoogleCapture("© Ry Clark Media Arts")).toBe(false);
    expect(isGoogleCapture(undefined)).toBe(false);
  });

  test("offices and units have a place; student orgs do not", () => {
    expect(isPhysicalOrgCategory("office")).toBe(true);
    expect(isPhysicalOrgCategory("unit")).toBe(true);
    expect(isPhysicalOrgCategory("student-org")).toBe(false);
    expect(isPhysicalOrgCategory(null)).toBe(false);
  });

  test("Commons title must name the place by a distinctive word", () => {
    expect(
      titleNamesPlace(
        "File:Harrar_Hall,_IRRI,_Los_Baños,_Laguna.jpg",
        "Harrar Hall (IRRI)",
      ),
    ).toBe(true);
    // Shared campus acronym is not enough.
    expect(
      titleNamesPlace(
        "File:IRRI,_Los_Baños,_Apr_2026_(3).jpg",
        "F.F. Hill Hall (IRRI)",
      ),
    ).toBe(false);
    // Whole words only: "rice" is not "ricefields".
    expect(titleNamesPlace("File:Ricefields_of_IRRI.jpg", "Rice Museum")).toBe(
      false,
    );
    // A bird photographed next to the post office.
    expect(
      titleNamesPlace("File:Butastur_indicus_30197174.jpg", "UPLB Post Office"),
    ).toBe(false);
  });

  test("buildings keep only photos of themselves, acronyms included", () => {
    // A portrait and the CEM rotunda both sat within 120m of BSB.
    expect(
      titleNamesPlace(
        "File:Shing_Kit_Dy_Macatingin.jpg",
        "Biological Sciences Building",
      ),
    ).toBe(false);
    expect(
      titleNamesPlace(
        "File:College_of_Economics_and_Management_building_with_the_Monopteros.jpg",
        "Biological Sciences Building",
      ),
    ).toBe(false);
    // The same photo is right for the CEM Building, by its acronym.
    expect(
      titleNamesPlace(
        "File:College_of_Economics_and_Management_building_with_the_Monopteros.jpg",
        "CEM Building",
      ),
    ).toBe(true);
    expect(
      titleNamesPlace(
        "File:University_of_the_Philippines_Rural_High_School.jpg",
        "UPRHS Building",
      ),
    ).toBe(true);
    // CHE's photo is not CAS Annex 1's.
    expect(
      titleNamesPlace(
        "File:College_of_Human_Ecology_building,_University_of_the_Philippines_Los_Baños.jpg",
        "CAS Annex 1",
      ),
    ).toBe(false);
  });
});
