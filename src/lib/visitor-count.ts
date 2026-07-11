// Free, no-auth hosted hit counter (https://abacus.jasoncameron.dev), same
// service as stimmie.dev. `/hit` increments and returns the new value; `/get`
// reads without incrementing.

const NAMESPACE = "uplbtools-room-tba";
const KEY = "site-visits";
const BASE = "https://abacus.jasoncameron.dev";
const STORAGE_KEY = "rtba-counted-date";

let sharedPromise: Promise<number> | null = null;

function getTodayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function alreadyCountedToday() {
  try {
    return localStorage.getItem(STORAGE_KEY) === getTodayKey();
  } catch {
    return false;
  }
}

function markCountedToday() {
  try {
    localStorage.setItem(STORAGE_KEY, getTodayKey());
  } catch {
    // private mode / blocked storage
  }
}

async function requestCount(increment: boolean) {
  const action = increment ? "hit" : "get";
  const res = await fetch(`${BASE}/${action}/${NAMESPACE}/${KEY}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("bad status");
  const data = (await res.json()) as { value?: number; count?: number };
  const value = data?.value ?? data?.count;
  if (typeof value !== "number") throw new Error("bad payload");
  return value;
}

/**
 * One increment per browser per calendar day; same-day refreshes only read.
 * Dedupes concurrent calls when multiple counters mount.
 */
export function fetchVisitorCount() {
  if (!sharedPromise) {
    sharedPromise = (async () => {
      const increment = !alreadyCountedToday();
      const value = await requestCount(increment);
      if (increment) markCountedToday();
      return value;
    })().catch((err) => {
      sharedPromise = null;
      throw err;
    });
  }
  return sharedPromise;
}
