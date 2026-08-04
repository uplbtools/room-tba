/**
 * Single source of truth for the `src/campus.config.ts` a fork pastes over
 * its checkout. Consumed by both the /fork wizard island and the
 * `bun run fork:init` CLI, so the two never generate divergent configs.
 */
import { slugifySegment } from "../site";

export type ForkConfig = {
  /** Full campus name, e.g. "University of the Philippines Diliman". */
  name: string;
  /** Where the fork will be hosted, e.g. "https://upd-room-tba.vercel.app". */
  siteUrl: string;
  /** Campus center as [lng, lat]. */
  center: [number, number];
  /** Map max bounds: [[west, south], [east, north]] in lng/lat. */
  bounds: [[number, number], [number, number]];
  defaultZoom: number;
  transitOverlay: boolean;
  /** Label for the transit overlay toggle, e.g. "Jeepney routes". */
  transitLabel: string;
  terrain: boolean;
};

export function campusSlug(name: string): string {
  return slugifySegment(name);
}

const UPSTREAM_REPO_URL = "https://github.com/uplbtools/room-tba";

/** Vercel "Deploy" clone URL prefilled with the fork's env prompts. */
export function vercelDeployUrl(slug: string): string {
  const params = new URLSearchParams({
    "repository-url": UPSTREAM_REPO_URL,
    env: "DATABASE_URL,ADMIN_PASSWORD,ADMIN_SESSION_SECRET,ISR_BYPASS_TOKEN",
    envDescription: "See .env.example",
    "project-name": `${slug}-room-tba`,
  });
  return `https://vercel.com/new/clone?${params.toString()}`;
}

/** ~0.1 m precision; map clicks otherwise emit 15+ decimals. */
const coord = (n: number) => Number(n.toFixed(6));
const zoomValue = (n: number) => Number(n.toFixed(2));

/**
 * Render the full campus.config.ts contents: every export the app, scripts,
 * and E2E suite import (campusSite / campusMap / campusTerrain /
 * campusTransit / campusTestFixtures / campusCommunity). Community links are
 * emitted as blank placeholders for the fork to fill in.
 */
export function generateCampusConfig(config: ForkConfig): string {
  const lng = coord(config.center[0]);
  const lat = coord(config.center[1]);
  const west = coord(config.bounds[0][0]);
  const south = coord(config.bounds[0][1]);
  const east = coord(config.bounds[1][0]);
  const north = coord(config.bounds[1][1]);
  const zoom = zoomValue(config.defaultZoom);
  return `/**
 * Single source of truth for campus-specific config.
 *
 * Generated for ${config.name} by the Room TBA fork tools (the /fork wizard or
 * \`bun run fork:init\`) — edit freely, but keep the exported shapes: the app,
 * scripts, and E2E suite import them. Run \`bun run fork:check\` afterwards to
 * catch remaining upstream strings.
 *
 * Values are plain literals so astro.config.mjs can import this module at
 * config-eval time (no process.env reads at module top level).
 */

export const campusSite = {
  url: ${JSON.stringify(config.siteUrl)},
  name: "Room TBA",
  title: ${JSON.stringify(`Room TBA | Find Rooms and Buildings at ${config.name}`)},
  description:
    ${JSON.stringify(`Room TBA helps ${config.name} students find rooms, buildings, and classes across campus.`)},
} as const;

export const campusMap: {
  maxBounds: [[number, number], [number, number]];
  defaultCamera: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  };
} = {
  /** [lng, lat] — west/south corner, then east/north corner. */
  maxBounds: [
    [${west}, ${south}],
    [${east}, ${north}],
  ],
  /** Default camera: center [lng, lat], zoom, pitch (0 = top-down, 60 = tilted 3D), bearing. */
  defaultCamera: {
    center: [${lng}, ${lat}],
    zoom: ${zoom},
    pitch: ${config.terrain ? 60 : 0},
    bearing: 0,
  },
};

export const campusTerrain: {
  enabled: boolean;
  demTilesUrl: string;
  maxBounds: [[number, number], [number, number]];
  camera: {
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  };
} = {
  /** 3D terrain (raster-dem + hillshade). false = flat map, no terrain controls. */
  enabled: ${config.terrain},
  /** TileJSON for the elevation source; __MAPTILER_KEY__ is replaced with PUBLIC_MAPTILER_KEY at runtime. */
  demTilesUrl:
    "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=__MAPTILER_KEY__",
  /** [lng, lat] corners the terrain view may cover — tune to your landscape. */
  maxBounds: [
    [${west}, ${south}],
    [${east}, ${north}],
  ],
  /** Camera the map flies to when terrain mode turns on — tune to your landscape. */
  camera: { center: [${lng}, ${lat}], zoom: ${zoomValue(zoom - 2.5)}, pitch: 68, bearing: 0 },
};

export const campusTransit: {
  enabled: boolean;
  label: string;
  routeDataModule: string;
} = {
  /** Campus transit overlay: map layer, sidebar browse tab, /transit/ links, sitemap entries. */
  enabled: ${config.transitOverlay},
  /** Menu / browse-tab label; title case and singular copy are derived from it. */
  label: ${JSON.stringify(config.transitLabel)},
  /** Bundled route/stop data a fork replaces (runtime rows come from the transit tables). */
  routeDataModule: "src/constants/jeepney-routes.ts",
};

/** Reference points inside campus bounds for the E2E suite (seeded by scripts/e2e-reset-db.ts). */
export const campusTestFixtures = {
  buildingLat: ${lat},
  buildingLon: ${lng},
  dormLat: ${coord(lat + 0.0005)},
  dormLon: ${coord(lng + 0.0008)},
} as const;

export const campusCommunity = {
  // TODO(fork): point these at your own community (fork:check will not flag
  // placeholders — review them yourself).
  orgUrl: ${JSON.stringify(config.siteUrl)},
  githubUrl: "https://github.com/your-org/your-fork",
  discordUrl: "",
  osaOrganizationsUrl: "",
  /** Messenger group chat invites (targets for redirect workers). */
  messengerContributeTarget: "",
  messengerMaintainTarget: "",
  /** Short links on a community subdomain (Cloudflare Worker). Delete if unused. */
  messengerShortContributeUrl: "",
  messengerShortMaintainUrl: "",
} as const;
`;
}
