import { writable } from "svelte/store";

export const KUBO_RESERVATION_STATUSES = [
  "accepting",
  "waitlist",
  "paused",
  "unavailable",
  "unknown",
] as const;

export type KuboReservationStatus = (typeof KUBO_RESERVATION_STATUSES)[number];

export type KuboDormRecord = {
  name: string;
  kuboSlug: string;
  listingUrl: string;
  updatedAt: string;
};

export type KuboDormDirectoryResponse = {
  version: 1;
  generatedAt: string;
  dorms: KuboDormRecord[];
};

export type KuboDormCta = {
  href: string;
  label: "Reserve on Kubo" | "Join waitlist on Kubo" | "View on Kubo";
  ariaLabel: string;
};

export type KuboDormDirectory = ReadonlyMap<string, KuboDormRecord>;

const RETRY_AFTER_MS = 60_000;

export const kuboDormDirectory = writable<KuboDormDirectory>(new Map());

let loadPromise: Promise<void> | null = null;
let lastAttemptAt = 0;

export function parseKuboDormDirectory(
  value: unknown,
): KuboDormDirectoryResponse | null {
  if (Array.isArray(value)) return parsePublicDorms(value);
  if (!isRecord(value) || value.version !== 1) return null;
  if (!isIsoDate(value.generatedAt) || !Array.isArray(value.dorms)) return null;

  const dorms: KuboDormRecord[] = [];
  const seenNames = new Set<string>();
  for (const item of value.dorms) {
    if (!isKuboDormRecord(item) || seenNames.has(normalizeDormName(item.name)))
      return null;
    seenNames.add(normalizeDormName(item.name));
    dorms.push(item);
  }

  return { version: 1, generatedAt: value.generatedAt, dorms };
}

/** Kubo's public directory deliberately exposes only safe, browseable fields. */
function parsePublicDorms(value: unknown[]): KuboDormDirectoryResponse | null {
  const dorms: KuboDormRecord[] = [];
  const seenNames = new Set<string>();
  let generatedAt = "1970-01-01T00:00:00.000Z";

  for (const item of value) {
    if (!isRecord(item)) return null;
    const name = typeof item.name === "string" ? item.name : null;
    const kuboSlug = typeof item.slug === "string" ? item.slug : null;
    const updatedAt =
      typeof item.updatedAt === "string" ? item.updatedAt : null;
    if (!name || !kuboSlug || !updatedAt || !isIsoDate(updatedAt)) return null;
    const normalized = normalizeDormName(name);
    if (!normalized || seenNames.has(normalized)) return null;
    seenNames.add(normalized);
    if (Date.parse(updatedAt) > Date.parse(generatedAt))
      generatedAt = updatedAt;
    dorms.push({
      name,
      kuboSlug,
      listingUrl: `https://kubo.community/dorms/${encodeURIComponent(kuboSlug)}`,
      updatedAt,
    });
  }

  return { version: 1, generatedAt, dorms };
}

export function getKuboDormCta(
  directory: KuboDormDirectory,
  dormName: string,
): KuboDormCta | null {
  const match = directory.get(normalizeDormName(dormName));
  if (!match) return null;

  // Trust boundary: Kubo's feed has served placeholder roomTbaDormIds that
  // collide with real dorms (2026-07-25, demo rows mapped onto Men's RH and
  // New Dormitory RH). An id match alone must not render a reservation CTA;
  // the names have to agree too.
  if (!dormNamesMatch(match.name, dormName)) {
    console.warn(
      `Kubo directory: dorm id ${dormId} name mismatch ("${match.name}" vs "${dormName}"); CTA suppressed`,
    );
    return null;
  }

  return {
    href: match.listingUrl,
    label: "Reserve on Kubo",
    ariaLabel: `Check availability for ${dormName} on Kubo (opens in new tab)`,
  };
}

export async function loadKuboDormDirectory(
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<void> {
  if (loadPromise) return loadPromise;
  if (now - lastAttemptAt < RETRY_AFTER_MS) return;
  lastAttemptAt = now;

  loadPromise = (async () => {
    try {
      const response = await fetcher("/api/integrations/kubo/dorms", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;

      const parsed = parseKuboDormDirectory(await response.json());
      if (parsed) kuboDormDirectory.set(toDirectory(parsed.dorms));
    } catch {
      // Keep the last successful directory. A fresh session fails closed.
    }
  })().finally(() => {
    loadPromise = null;
  });

  return loadPromise;
}

// Exact match after normalization: "Residence Hall" folds to "RH" so
// registrar-style spellings still agree. Containment is deliberately NOT
// allowed — prod has sibling dorms where one name contains the other
// ("Forestry Residence Hall" inside "New Forestry Residence Hall"), so a
// placeholder id from Kubo could otherwise light up the wrong building.
function normalizeDormName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/residencehall/g, "rh");
}

export function dormNamesMatch(kuboName: string, dormName: string): boolean {
  const a = normalizeDormName(kuboName);
  const b = normalizeDormName(dormName);
  if (!a || !b) return false;
  return a === b;
}

function toDirectory(records: KuboDormRecord[]): KuboDormDirectory {
  return new Map(
    records.map((record) => [normalizeDormName(record.name), record]),
  );
}

function isKuboDormRecord(value: unknown): value is KuboDormRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.kuboSlug === "string" &&
    value.kuboSlug.length > 0 &&
    isSafeKuboUrl(value.listingUrl) &&
    isIsoDate(value.updatedAt)
  );
}

function isSafeKuboUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "kubo.community" ||
        url.hostname.endsWith(".kubo.community"))
    );
  } catch {
    return false;
  }
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
