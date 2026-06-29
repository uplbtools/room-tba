import { describe, it, expect } from "bun:test";
import { APP_VERSION, APP_VERSION_LABEL } from "@constants/version";
import packageJson from "../../../package.json";

describe("version constants", () => {
  it("APP_VERSION matches package.json (#270)", () => {
    expect(APP_VERSION).toBe(packageJson.version);
  });

  it("APP_VERSION_LABEL is formatted correctly", () => {
    expect(APP_VERSION_LABEL).toBe(`v${packageJson.version}`);
  });
});
