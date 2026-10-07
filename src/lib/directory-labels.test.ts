import { describe, expect, test } from "bun:test";
import {
  collegeLabel,
  displayOrgName,
  splitTrailingAcronym,
} from "./directory-labels";

describe("directory labels", () => {
  test("splits a trailing acronym off a name", () => {
    expect(
      splitTrailingAcronym("College of Public Affairs and Development (CPAf)"),
    ).toEqual({
      name: "College of Public Affairs and Development",
      acronym: "CPAf",
    });
    expect(splitTrailingAcronym("Graduate School")).toEqual({
      name: "Graduate School",
      acronym: null,
    });
  });

  test("gives every college an acronym", () => {
    expect(
      collegeLabel("College of Arts and Sciences", "https://cas.uplb.edu.ph"),
    ).toEqual({ name: "College of Arts and Sciences", acronym: "CAS" });
    expect(
      collegeLabel(
        "School of Environmental Science and Management (SESAM)",
        "https://sesam.uplb.edu.ph",
      ),
    ).toEqual({
      name: "School of Environmental Science and Management",
      acronym: "SESAM",
    });
    expect(collegeLabel("Graduate School", null)).toEqual({
      name: "Graduate School",
      acronym: null,
    });
  });

  test("title-cases all-caps org names and keeps the acronym", () => {
    expect(
      displayOrgName("ALLIANCE OF DEVELOPMENT COMMUNICATION STUDENTS (ADCS)"),
    ).toBe("Alliance of Development Communication Students (ADCS)");
    expect(displayOrgName("ALYANSA NG MGA KABITENYO SA UPLB (ANAK-UPLB)")).toBe(
      "Alyansa ng mga Kabitenyo sa UPLB (ANAK-UPLB)",
    );
    expect(displayOrgName("CALAMBEÑOS (UP CALAMBEÑOS)")).toBe(
      "Calambeños (UP CALAMBEÑOS)",
    );
    expect(displayOrgName("ACTUARIAL SCIENCE SOCIETY (UPLB ActSS)")).toBe(
      "Actuarial Science Society (UPLB ActSS)",
    );
    expect(displayOrgName("PAINTERS' CLUB (UPPC)")).toBe(
      "Painters' Club (UPPC)",
    );
  });

  test("leaves names a person already cased alone", () => {
    expect(displayOrgName("UPLB Computer Science Society")).toBe(
      "UPLB Computer Science Society",
    );
  });
});
