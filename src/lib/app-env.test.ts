import { describe, expect, mock, test } from "bun:test";

mock.module("astro:env/client", () => ({
  PUBLIC_APP_ENV: undefined,
}));

const { isStagingApp, isStagingAppEnv } = await import("./app-env");

describe("isStagingAppEnv", () => {
  test("true only for staging", () => {
    expect(isStagingAppEnv("staging")).toBe(true);
    expect(isStagingAppEnv("production")).toBe(false);
    expect(isStagingAppEnv(undefined)).toBe(false);
    expect(isStagingAppEnv("")).toBe(false);
  });
});

describe("isStagingApp", () => {
  test("false when PUBLIC_APP_ENV is unset", () => {
    expect(isStagingApp()).toBe(false);
  });
});
