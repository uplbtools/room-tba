/**
 * Response security headers (security audit item 8). One source of truth:
 * vercel.json carries the same values for static and edge-cached responses
 * (security-headers.test.ts fails on drift) and src/middleware.ts applies
 * them to server-rendered responses, which also covers the node preview that
 * E2E runs against.
 *
 * Enforced now: framing ban, nosniff, referrer and permissions policies.
 * The full Content-Security-Policy ships as Report-Only first: the app pulls
 * map tiles, glyphs and sprites from several hosts, AdSense (which loads
 * from a long, changing list of Google domains), Turnstile, Supabase, R2
 * images, Street View, Wikimedia thumbnails and Datadog, so an enforced
 * policy that misses one host would blank the map or break sign-in.
 * Violations show in the browser console; promote the policy to enforced
 * once a release runs clean. Until then a minimal enforced CSP still bans
 * framing, plugins and <base> hijacking.
 */

/** Small CSP that is safe to enforce today (no fetch restrictions). */
export const ENFORCED_CSP = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

/** Full policy, report-only until it has run clean in production. */
export const REPORT_ONLY_CSP = [
  "default-src 'self'",
  // Astro inline boot scripts, PGlite's wasm, Turnstile, AdSense.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.adtrafficquality.google",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Map rasters, Street View, Wikimedia, R2 uploads, avatars, ads.
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.maptiler.com https://*.maptiler.com https://tiles.openfreemap.org https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://routing.openstreetmap.de https://nominatim.openstreetmap.org https://overpass-api.de https://maps.mail.ru https://*.arcgis.com https://*.arcgisonline.com https://maputnik.github.io https://orangemug.github.io https://klokantech.github.io https://*.supabase.co wss://*.supabase.co https://*.datadoghq.com https://abacus.jasoncameron.dev https://challenges.cloudflare.com https://maps.googleapis.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google",
  // MapLibre and PGlite workers are same-origin; some builds spawn blob: workers.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** Headers for every response. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": ENFORCED_CSP,
  "Content-Security-Policy-Report-Only": REPORT_ONLY_CSP,
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Geolocation powers "you are here"; device orientation (compass) stays
  // allowed. Nothing in the app uses camera, mic, USB or Payment Request.
  "Permissions-Policy":
    "geolocation=(self), camera=(), microphone=(), usb=(), payment=()",
};

/** Pages whose URL carries a one-time token: never leak it in Referer. */
export const NO_REFERRER_PATHS = ["/reset-password", "/verify-email"] as const;

export function isNoReferrerPath(pathname: string): boolean {
  return NO_REFERRER_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/** API prefixes whose responses are per-user and must never be cached. */
export const NO_STORE_API_PREFIXES = [
  "/api/admin/",
  "/api/account/",
  "/api/auth/",
  "/api/proposals/mine",
] as const;

export function isNoStoreApiPath(pathname: string): boolean {
  return NO_STORE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const NO_STORE_CACHE_CONTROL = "private, no-store";

/** Apply the headers above to a server-rendered response, in place. */
export function applySecurityHeaders(headers: Headers, pathname: string): void {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  if (isNoReferrerPath(pathname)) headers.set("Referrer-Policy", "no-referrer");
  if (isNoStoreApiPath(pathname)) {
    headers.set("Cache-Control", NO_STORE_CACHE_CONTROL);
  }
}
