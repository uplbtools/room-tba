/**
 * Builds src/constants/landmark-images.json: 1-10 images per landmark from
 * more sources than Street View alone.
 *
 *   bun run scripts/fetch-landmark-images.ts
 *   ... --from-api https://<deployment>.vercel.app   buildings source (default prod)
 *   ... --radius 120                                 Commons geosearch radius, metres
 *
 * Per building:
 *  - Street View: metadata lookup (free, unmetered) finds the panorama, and
 *    the pano-to-building bearing becomes three facade headings. Only
 *    headings are stored; the client builds image URLs with its own key.
 *    Google's terms forbid storing the imagery itself.
 *  - Wikimedia Commons: geosearch within the radius, nearest photographs
 *    first, capped at MAX_COMMONS_IMAGES. Hotlinked thumbnails plus the
 *    artist/license attribution their licenses require.
 *
 * Reads the public buildings API rather than the database: it needs nothing
 * the API does not already serve, and it keeps the script runnable without
 * production credentials.
 */
import { writeFileSync } from "node:fs";
import {
  fetchStreetViewMetadata,
  hasStreetViewKey,
} from "../src/lib/street-view";
import {
  bearingDegrees,
  facadeHeadings,
  isLikelyPhotoTitle,
  stripHtml,
  MAX_COMMONS_IMAGES,
  type CommonsImage,
  type LandmarkImagesManifest,
} from "./lib/landmark-images-core";
import { loadEnv } from "./load-env";

loadEnv();

const OUT_PATH = "src/constants/landmark-images.json";
const DEFAULT_API = "https://www.uplb.tools";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
/** Wikimedia asks API clients to identify themselves. */
const USER_AGENT =
  "RoomTBA-landmark-images/1.0 (https://github.com/uplbtools/room-tba)";

type Building = {
  id: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
  streetViewPanoId: string | null;
};

function argValue(flag: string): string | undefined {
  const at = process.argv.indexOf(flag);
  return at === -1 ? undefined : process.argv[at + 1];
}

const apiBase = (argValue("--from-api") ?? DEFAULT_API).replace(/\/$/, "");
const radius = Number(argValue("--radius") ?? 120);

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
      geosearch?: { pageid: number; title: string }[];
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

async function commonsImagesNear(
  lat: number,
  lon: number,
): Promise<CommonsImage[]> {
  const geo = await commonsQuery({
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: String(radius),
    gslimit: "20",
    gsnamespace: "6",
  });
  const pages = (geo.query?.geosearch ?? []).filter((page) =>
    isLikelyPhotoTitle(page.title),
  );
  if (pages.length === 0) return [];

  const info = await commonsQuery({
    pageids: pages
      .slice(0, MAX_COMMONS_IMAGES)
      .map((page) => page.pageid)
      .join("|"),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "800",
  });

  const images: CommonsImage[] = [];
  // Keep geosearch order: nearest photograph first.
  for (const page of pages.slice(0, MAX_COMMONS_IMAGES)) {
    const detail = info.query?.pages?.[String(page.pageid)]?.imageinfo?.[0];
    if (!detail?.thumburl || !detail.descriptionurl) continue;
    const meta = detail.extmetadata ?? {};
    images.push({
      url: detail.thumburl,
      pageUrl: detail.descriptionurl,
      artist: stripHtml(meta.Artist?.value ?? "Unknown"),
      license: stripHtml(meta.LicenseShortName?.value ?? "see file page"),
    });
  }
  return images;
}

const key = process.env.PUBLIC_GOOGLE_MAPS_API_KEY;
const buildingsRes = await fetch(`${apiBase}/api/buildings`, {
  headers: { "user-agent": USER_AGENT },
});
if (!buildingsRes.ok) {
  throw new Error(`buildings API ${buildingsRes.status} from ${apiBase}`);
}
const buildings = (await buildingsRes.json()) as Building[];

const manifest: LandmarkImagesManifest = {};
let withStreetView = 0;
let withCommons = 0;

for (const building of buildings) {
  const { buildingName, lat, lon } = building;
  if (lat == null || lon == null) continue;

  let streetViewHeadings: number[] | undefined;
  // Only look where the coverage backfill already found a panorama; the
  // metadata call is free but pointless where coverage is known-absent.
  if (hasStreetViewKey(key) && building.streetViewPanoId) {
    const meta = await fetchStreetViewMetadata(
      { lat: Number(lat), lng: Number(lon) },
      key,
      { radius: 100 },
    );
    if (meta.status === "OK") {
      streetViewHeadings = facadeHeadings(
        bearingDegrees(meta.location, { lat: Number(lat), lng: Number(lon) }),
      );
      withStreetView += 1;
    }
  }

  const commons = await commonsImagesNear(Number(lat), Number(lon));
  if (commons.length > 0) withCommons += 1;

  if (!streetViewHeadings && commons.length === 0) continue;
  // Name-keyed, not id-keyed: ids differ between the prod, staging, and e2e
  // databases (see LandmarkImagesManifest).
  manifest[`building:${buildingName}`] = {
    ...(streetViewHeadings ? { streetViewHeadings } : {}),
    ...(commons.length > 0 ? { commons } : {}),
  };
  console.log(
    `${buildingName}: ${streetViewHeadings ? 3 : 0} street view + ${commons.length} commons`,
  );
}

// Stable key order keeps re-runs reviewable as diffs.
const sorted = Object.fromEntries(
  Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync(OUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `\nWrote ${OUT_PATH}: ${Object.keys(sorted).length}/${buildings.length} buildings ` +
    `(${withStreetView} with Street View, ${withCommons} with Commons photos)`,
);
