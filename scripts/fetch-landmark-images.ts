/**
 * Builds src/constants/landmark-images.json: 1-10 images per landmark from
 * more sources than Street View alone. Covers buildings, dorms, places
 * (landmarks, tourist spots, establishments) and organizations that occupy a
 * physical place (offices, units, academic departments, service desks).
 *
 *   bun run scripts/fetch-landmark-images.ts
 *   ... --from-api https://<deployment>.vercel.app   entity source (default prod)
 *   ... --radius 120                                 building Commons radius, metres
 *   bunx biome format --write src/constants/landmark-images.json   (before committing)
 *
 * Per entity:
 *  - Street View: metadata lookup (free, unmetered) finds the nearest outdoor
 *    Google-captured panorama, and the pano-to-subject bearing becomes three
 *    facade headings. Only the pano id and headings are stored; the client
 *    builds image URLs with its own key. Google's terms forbid storing the
 *    imagery itself. When the nearest pano is a photo sphere somebody
 *    uploaded (a classroom, a lobby), a ring of points around the subject is
 *    probed for a Google capture first. Failing that, buildings keep the
 *    upload with its copyright stored for the credit line (the client shows
 *    it last); dorms, places and orgs skip it, as it is usually a shop
 *    interior or somebody else's frontage.
 *  - Wikimedia Commons: geosearch near the pin, photographs only, capped at
 *    MAX_COMMONS_IMAGES. Hotlinked thumbnails plus the artist/license
 *    attribution their licenses require. Small places only keep files whose
 *    title names them.
 *
 * Reads the public APIs rather than the database: it needs nothing the API
 * does not already serve, and it keeps the script runnable without
 * production credentials.
 */
import { writeFileSync } from "node:fs";
import type { LandmarkKind } from "../src/lib/landmark-images";
import {
  fetchStreetViewMetadata,
  hasStreetViewKey,
} from "../src/lib/street-view";
import {
  bearingDegrees,
  distanceMetres,
  facadeHeadings,
  isGoogleCapture,
  ringPoints,
  isLikelyPhotoTitle,
  isPhysicalOrgCategory,
  titleNamesPlace,
  stripHtml,
  MAX_COMMONS_IMAGES,
  type CommonsImage,
  type LandmarkImagesManifest,
} from "./lib/landmark-images-core";
import { loadEnv } from "./load-env";

loadEnv();

const OUT_PATH = "src/constants/landmark-images.json";
// www.uplb.tools is the org landing site; the app (and its API) lives here.
const DEFAULT_API = "https://room-tba.uplb.tools";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
/** Wikimedia asks API clients to identify themselves. */
const USER_AGENT =
  "RoomTBA-landmark-images/1.0 (https://github.com/uplbtools/room-tba)";

/**
 * Search radii, metres. Buildings sit back from the road, so 100m finds their
 * frontage. A dorm or food stall 60m from the nearest pano is out of frame or
 * hidden behind something else, so beyond that we show nothing.
 */
const BUILDING_PANO_RADIUS = 100;
const SMALL_PANO_RADIUS = 60;
const SMALL_COMMONS_RADIUS = 60;

type Target = {
  kind: LandmarkKind;
  name: string;
  lat: number;
  lon: number;
};

type GeoPage = { pageid: number; title: string };

function argValue(flag: string): string | undefined {
  const at = process.argv.indexOf(flag);
  return at === -1 ? undefined : process.argv[at + 1];
}

const apiBase = (argValue("--from-api") ?? DEFAULT_API).replace(/\/$/, "");
const buildingRadius = Number(argValue("--radius") ?? 120);

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { "user-agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`${path} ${res.status} from ${apiBase}`);
  return res.json() as Promise<T>;
}

async function commonsQuery(params: Record<string, string>) {
  const url = new URL(COMMONS_API);
  for (const [key, value] of Object.entries({
    format: "json",
    origin: "*",
    action: "query",
    ...params,
  })) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Commons ${res.status} for ${url}`);
  return res.json() as Promise<{
    query?: {
      geosearch?: GeoPage[];
      pages?: Record<
        string,
        {
          title?: string;
          imageinfo?: {
            thumburl?: string;
            descriptionurl?: string;
            extmetadata?: Record<string, { value?: string }>;
          }[];
        }
      >;
    };
  }>;
}

/**
 * Hand-picked Commons files, by manifest key, for places whose good photos
 * carry no location tag, so the geosearch below never finds them. A name
 * search is not safe instead: "UPLB Oblation" also matches Oblation Run
 * photos. Each file here was checked by hand.
 */
const PINNED_COMMONS: Record<string, string[]> = {
  "place:UPLB Oblation (Oblation Park)": ["File:UPLB Oblation Statue.jpg"],
};

async function commonsImagesFor(target: Target): Promise<CommonsImage[]> {
  const pinnedTitles = PINNED_COMMONS[`${target.kind}:${target.name}`] ?? [];
  const small = target.kind !== "building";
  const geo = await commonsQuery({
    list: "geosearch",
    gscoord: `${target.lat}|${target.lon}`,
    gsradius: String(small ? SMALL_COMMONS_RADIUS : buildingRadius),
    gslimit: "20",
    gsnamespace: "6",
  });
  let pages = (geo.query?.geosearch ?? []).filter((page) =>
    isLikelyPhotoTitle(page.title),
  );
  pages = pages.filter((page) => titleNamesPlace(page.title, target.name));
  const titles = [
    ...pinnedTitles,
    ...pages.map((page) => page.title).filter((t) => !pinnedTitles.includes(t)),
  ].slice(0, MAX_COMMONS_IMAGES);
  if (titles.length === 0) return [];

  const info = await commonsQuery({
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "800",
  });
  const byTitle = new Map(
    Object.values(info.query?.pages ?? {}).map((page) => [page.title, page]),
  );

  const images: CommonsImage[] = [];
  // Keep ranked order: hand-picked first, then best geosearch match.
  for (const title of titles) {
    const detail = byTitle.get(title)?.imageinfo?.[0];
    if (!detail?.thumburl || !detail.descriptionurl) continue;
    const meta = detail.extmetadata ?? {};
    images.push({
      // Drop the utm_* tracking params Commons appends to thumbnail URLs.
      url: detail.thumburl.split("?")[0]!,
      pageUrl: detail.descriptionurl,
      artist: stripHtml(meta.Artist?.value ?? "Unknown"),
      license: stripHtml(meta.LicenseShortName?.value ?? "see file page"),
    });
  }
  return images;
}

const key = process.env.PUBLIC_GOOGLE_MAPS_API_KEY;
if (!hasStreetViewKey(key)) {
  console.warn(
    "PUBLIC_GOOGLE_MAPS_API_KEY unset: Commons only, no Street View",
  );
}

type Pinned = { lat: number | null; lon: number | null };
const pinned = <T extends Pinned>(rows: T[]) =>
  rows.filter((row) => row.lat != null && row.lon != null) as (T & {
    lat: number;
    lon: number;
  })[];

const [buildings, dorms, places, organizations] = await Promise.all([
  getJson<
    (Pinned & { buildingName: string; streetViewPanoId: string | null })[]
  >("/api/buildings"),
  getJson<(Pinned & { dormName: string })[]>("/api/dorms"),
  getJson<(Pinned & { name: string })[]>("/api/places"),
  getJson<(Pinned & { name: string; category: string | null })[]>(
    "/api/organizations",
  ),
]);

const targets: (Target & { skipStreetView?: boolean })[] = [
  ...pinned(buildings).map((b) => ({
    kind: "building" as const,
    name: b.buildingName,
    lat: Number(b.lat),
    lon: Number(b.lon),
    // The coverage backfill already looked here and found nothing.
    skipStreetView: !b.streetViewPanoId,
  })),
  ...pinned(dorms).map((d) => ({
    kind: "dorm" as const,
    name: d.dormName,
    lat: Number(d.lat),
    lon: Number(d.lon),
  })),
  ...pinned(places).map((p) => ({
    kind: "place" as const,
    name: p.name,
    lat: Number(p.lat),
    lon: Number(p.lon),
  })),
  // Own pin only: an org without one inherits its host building's pin, and
  // that building already has its own gallery.
  ...pinned(organizations)
    .filter((o) => isPhysicalOrgCategory(o.category))
    .map((o) => ({
      kind: "organization" as const,
      name: o.name,
      lat: Number(o.lat),
      lon: Number(o.lon),
    })),
];

const manifest: LandmarkImagesManifest = {};
const stats: Record<
  string,
  { total: number; entries: number; streetView: number; commons: number }
> = {};

for (const target of targets) {
  stats[target.kind] ??= { total: 0, entries: 0, streetView: 0, commons: 0 };
  const stat = stats[target.kind]!;
  stat.total += 1;
  const coords = { lat: target.lat, lng: target.lon };

  let streetView:
    | { panoId: string; headings: number[]; copyright?: string }
    | undefined;
  if (hasStreetViewKey(key) && !target.skipStreetView) {
    const radius =
      target.kind === "building" ? BUILDING_PANO_RADIUS : SMALL_PANO_RADIUS;
    // Nearest pano first; if it is someone's upload, probe around the
    // subject for Google's own capture (metadata lookups are free).
    const probes = [coords, ...ringPoints(coords, radius / 2)];
    let best: { panoId: string; location: typeof coords } | undefined;
    let upload:
      | { panoId: string; location: typeof coords; copyright?: string }
      | undefined;
    for (const [i, probe] of probes.entries()) {
      const meta = await fetchStreetViewMetadata(probe, key, {
        radius: i === 0 ? radius : radius / 2,
        source: "outdoor",
      });
      if (meta.status !== "OK") continue;
      // Google's radius is a search hint, not a bound: it has returned panos
      // 150m away for a 60m search. Enforce it ourselves.
      const distance = distanceMetres(meta.location, coords);
      if (distance > radius) continue;
      if (!isGoogleCapture(meta.copyright)) {
        upload ??= {
          panoId: meta.panoId,
          location: meta.location,
          copyright: meta.copyright,
        };
        continue;
      }
      if (!best || distance < distanceMetres(best.location, coords)) {
        best = { panoId: meta.panoId, location: meta.location };
      }
      if (i === 0) break;
    }
    const pick = best ?? (target.kind === "building" ? upload : undefined);
    if (pick) {
      streetView = {
        panoId: pick.panoId,
        headings: facadeHeadings(bearingDegrees(pick.location, coords)),
        ...(best ? {} : { copyright: upload?.copyright }),
      };
      stat.streetView += 1;
    }
  }

  const commons = await commonsImagesFor(target);
  if (commons.length > 0) stat.commons += 1;

  if (!streetView && commons.length === 0) continue;
  stat.entries += 1;
  // Name-keyed, not id-keyed: ids differ between the prod, staging, and e2e
  // databases (see LandmarkImagesManifest).
  manifest[`${target.kind}:${target.name}`] = {
    ...(streetView
      ? {
          streetViewHeadings: streetView.headings,
          streetViewPanoId: streetView.panoId,
          ...(streetView.copyright
            ? { streetViewCopyright: streetView.copyright }
            : {}),
        }
      : {}),
    ...(commons.length > 0 ? { commons } : {}),
  };
  console.log(
    `${target.kind}:${target.name}: ${streetView ? 3 : 0} street view + ${commons.length} commons`,
  );
}

// Stable key order keeps re-runs reviewable as diffs.
const sorted = Object.fromEntries(
  Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(OUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`\nWrote ${OUT_PATH}: ${Object.keys(sorted).length} entries`);
for (const [kind, s] of Object.entries(stats)) {
  console.log(
    `  ${kind}: ${s.entries}/${s.total} pinned (${s.streetView} Street View, ${s.commons} Commons)`,
  );
}
