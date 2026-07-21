/**
 * First-party sponsor impression/click beacons. Session-deduped via
 * sessionStorage only — no cookies, no third-party scripts. Beacons fail
 * silently offline; the API route drops bot traffic server-side.
 */

const BEACON_URL = "/api/sponsor-event";
const SEEN_KEY = "rtba-sponsor-seen";

/** Fire once per sponsor × zone per session. */
export function trackSponsorImpression(sponsorId: string, zone: string): void {
  if (typeof window === "undefined") return;
  const key = `${sponsorId}:${zone}`;
  let seen: Set<string>;
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    seen = new Set(raw ? raw.split(",") : []);
    if (seen.has(key)) return;
    seen.add(key);
    sessionStorage.setItem(SEEN_KEY, [...seen].join(","));
  } catch {
    // sessionStorage unavailable (private mode) — still record the impression.
  }
  fire({ sponsorId, zone, eventType: "impression" });
}

/** Always fires (not deduped). */
export function trackSponsorClick(sponsorId: string, zone: string): void {
  if (typeof window === "undefined") return;
  fire({ sponsorId, zone, eventType: "click" });
}

function fire(payload: Record<string, string>): void {
  const body = JSON.stringify({
    ...payload,
    pagePath: window.location.pathname,
  });
  const blob = new Blob([body], { type: "application/json" });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(BEACON_URL, blob);
  } else {
    fetch(BEACON_URL, { method: "POST", body, keepalive: true }).catch(
      () => {},
    );
  }
}
