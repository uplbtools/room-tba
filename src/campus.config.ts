/**
 * Single source of truth for campus-specific config.
 *
 * A fork changes this file (and the data — see /wiki/fork-for-your-campus).
 * Run `bun run fork:check` after editing to catch stray UPLB strings elsewhere.
 *
 * Values are plain literals so astro.config.mjs can import this module at
 * config-eval time (no process.env reads at module top level).
 */

export const campusSite = {
  url: "https://room-tba.uplb.tools",
  name: "Room TBA",
  title: "Room TBA | Find Rooms, Buildings, Colleges, and Divisions at UPLB",
  description:
    "Room TBA helps UPLB students find rooms, buildings, colleges, and divisions across the Los Banos campus.",
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
    // West/south: Mt. Makiling foothills, BSP Jamboree site, National Arts Center corridor.
    [121.168, 14.095],
    [121.335, 14.215],
  ],
  /** Default camera: center [lng, lat], zoom, pitch (0 = top-down, 60 = tilted 3D), bearing. */
  defaultCamera: {
    center: [121.24125948460573, 14.16323736946326],
    zoom: 15.81,
    pitch: 60,
    bearing: -154.48,
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
  enabled: true,
  /** TileJSON for the elevation source; __MAPTILER_KEY__ is replaced with PUBLIC_MAPTILER_KEY at runtime. */
  demTilesUrl:
    "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=__MAPTILER_KEY__",
  /** [lng, lat] corners the terrain view may cover (Mount Makiling and surroundings). */
  maxBounds: [
    [121.168, 14.095],
    [121.34, 14.22],
  ],
  /** Camera the map flies to when terrain mode turns on. */
  camera: { center: [121.218, 14.142], zoom: 13.25, pitch: 68, bearing: 190 },
};

export const campusTransit: {
  enabled: boolean;
  label: string;
  routeDataModule: string;
} = {
  /** Campus transit overlay: map layer, sidebar browse tab, /transit/ links, sitemap entries. */
  enabled: true,
  /** Menu / browse-tab label; title case and singular copy are derived from it. */
  label: "Jeepney routes",
  /** Bundled route/stop data a fork replaces (runtime rows come from the transit tables). */
  routeDataModule: "src/constants/jeepney-routes.ts",
};

/** Reference points inside campus bounds for the E2E suite (seeded by scripts/e2e-reset-db.ts). */
export const campusTestFixtures = {
  buildingLat: 14.1655,
  buildingLon: 121.2412,
  dormLat: 14.166,
  dormLon: 121.242,
} as const;

export const campusCommunity = {
  orgUrl: "https://uplb.tools",
  githubUrl: "https://github.com/uplbtools/room-tba",
  discordUrl: "https://discord.uplbtools.me",
  facebookUrl: "https://facebook.com/uplb.tools",
  instagramUrl: "https://instagram.com/uplb.tools",
  osaOrganizationsUrl: "https://uplbosa.org/orgs",
  /** Messenger group chat invites (targets for redirect workers). */
  messengerContributeTarget: "https://m.me/j/Aba1V0prvQyLrafZ/",
  messengerMaintainTarget: "https://m.me/j/AbZtqMU8UUTiwQfn/",
  /** Short links on a community subdomain (Cloudflare Worker). Delete if unused. */
  messengerShortContributeUrl: "https://messenger.uplbtools.me/contribute",
  messengerShortMaintainUrl: "https://messenger.uplbtools.me/maintain",
} as const;
