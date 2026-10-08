import { describe, expect, test } from "bun:test";
import vercelConfig from "../../vercel.json";
import {
  NO_REFERRER_PATHS,
  NO_STORE_API_PREFIXES,
  NO_STORE_CACHE_CONTROL,
  REPORT_ONLY_CSP,
  SECURITY_HEADERS,
  applySecurityHeaders,
  isNoReferrerPath,
  isNoStoreApiPath,
} from "./security-headers";

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};
const rules = (vercelConfig as { headers?: HeaderRule[] }).headers ?? [];

describe("vercel.json security headers", () => {
  test("every response gets the same headers the middleware applies", () => {
    const global = rules.find((rule) => rule.source === "/(.*)");
    expect(global).toBeDefined();
    const fromVercel = Object.fromEntries(
      (global?.headers ?? []).map(({ key, value }) => [key, value]),
    );
    expect(fromVercel).toEqual({ ...SECURITY_HEADERS });
  });

  test("token pages send no referrer", () => {
    for (const path of NO_REFERRER_PATHS) {
      const rule = rules.find((r) => r.source.startsWith(path));
      expect(rule?.headers).toContainEqual({
        key: "Referrer-Policy",
        value: "no-referrer",
      });
    }
  });

  test("per-user APIs are never cached", () => {
    for (const prefix of NO_STORE_API_PREFIXES) {
      const rule = rules.find((r) => r.source.startsWith(prefix));
      expect(rule?.headers).toContainEqual({
        key: "Cache-Control",
        value: NO_STORE_CACHE_CONTROL,
      });
    }
  });
});

describe("security header policy", () => {
  test("framing is banned outright", () => {
    expect(SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });

  test("the report-only CSP allows what the app loads", () => {
    for (const needed of [
      "https://challenges.cloudflare.com",
      "https://api.maptiler.com",
      "https://tiles.openfreemap.org",
      "https://*.supabase.co",
      "https://fonts.gstatic.com",
      "https://maps.googleapis.com",
      "'wasm-unsafe-eval'",
      "worker-src 'self' blob:",
    ]) {
      expect(REPORT_ONLY_CSP).toContain(needed);
    }
  });

  test("geolocation stays available to the app itself", () => {
    expect(SECURITY_HEADERS["Permissions-Policy"]).toContain(
      "geolocation=(self)",
    );
  });

  test("path matchers", () => {
    expect(isNoReferrerPath("/reset-password")).toBe(true);
    expect(isNoReferrerPath("/verify-email")).toBe(true);
    expect(isNoReferrerPath("/building/x")).toBe(false);
    expect(isNoStoreApiPath("/api/admin/auth")).toBe(true);
    expect(isNoStoreApiPath("/api/account/me")).toBe(true);
    expect(isNoStoreApiPath("/api/buildings")).toBe(false);
  });

  test("applySecurityHeaders sets per-path overrides", () => {
    const headers = new Headers({ "Cache-Control": "public, max-age=60" });
    applySecurityHeaders(headers, "/api/account/me");
    expect(headers.get("Cache-Control")).toBe(NO_STORE_CACHE_CONTROL);
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");

    const page = new Headers();
    applySecurityHeaders(page, "/verify-email");
    expect(page.get("Referrer-Policy")).toBe("no-referrer");
    expect(page.get("Cache-Control")).toBeNull();
  });
});
