import { describe, expect, test } from "bun:test";
import {
  CAMPUS_DATA_LICENSE,
  CAMPUS_DATA_LICENSE_URL,
  CONTRIBUTOR_LICENSE_CONSENT,
  DATA_LICENSE_FAQ_PATH,
  DATA_LICENSE_TERMS_PATH,
  OSM_COPYRIGHT_URL,
  SOFTWARE_LICENSE,
} from "./data-license.ts";

describe("data-license", () => {
  test("exposes stable license labels and anchors", () => {
    expect(SOFTWARE_LICENSE).toBe("MIT");
    expect(CAMPUS_DATA_LICENSE).toBe("CC-BY 4.0");
    expect(CAMPUS_DATA_LICENSE_URL).toContain("creativecommons.org");
    expect(OSM_COPYRIGHT_URL).toContain("openstreetmap.org/copyright");
    expect(DATA_LICENSE_FAQ_PATH).toBe("/faq#data-license");
    expect(DATA_LICENSE_TERMS_PATH).toBe("/terms#data-licenses");
    expect(CONTRIBUTOR_LICENSE_CONSENT).toContain("CC-BY 4.0");
  });
});
