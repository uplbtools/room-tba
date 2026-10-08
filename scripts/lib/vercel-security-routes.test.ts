import { describe, expect, test } from "bun:test";
import {
  NO_REFERRER_PATHS,
  NO_STORE_API_PREFIXES,
  NO_STORE_CACHE_CONTROL,
  SECURITY_HEADERS,
} from "../../src/lib/security-headers";
import { buildSecurityRoutes } from "./vercel-security-routes";

describe("buildSecurityRoutes", () => {
  const routes = buildSecurityRoutes({
    headers: SECURITY_HEADERS,
    noReferrerPaths: NO_REFERRER_PATHS,
    noStorePrefixes: NO_STORE_API_PREFIXES,
    noStoreValue: NO_STORE_CACHE_CONTROL,
  });

  test("the first route adds every security header to every path", () => {
    expect(routes[0]).toEqual({
      src: "^/.*$",
      headers: { ...SECURITY_HEADERS },
      continue: true,
    });
  });

  test("routes only add headers and fall through", () => {
    for (const route of routes) {
      expect(route.continue).toBe(true);
      expect(Object.keys(route)).toEqual(["src", "headers", "continue"]);
    }
  });

  test("path routes match what they should", () => {
    const match = (path: string, header: string) =>
      routes.some(
        (route) =>
          header in route.headers &&
          route.src !== "^/.*$" &&
          new RegExp(route.src).test(path),
      );
    expect(match("/verify-email", "Referrer-Policy")).toBe(true);
    expect(match("/reset-password", "Referrer-Policy")).toBe(true);
    expect(match("/reset-passwordx", "Referrer-Policy")).toBe(false);
    expect(match("/api/account/me", "Cache-Control")).toBe(true);
    expect(match("/api/proposals/mine", "Cache-Control")).toBe(true);
    expect(match("/api/buildings", "Cache-Control")).toBe(false);
  });
});
