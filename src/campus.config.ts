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
  url: "https://room-tba.uplbtools.me",
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

export const campusCommunity = {
  orgUrl: "https://uplbtools.me",
  githubUrl: "https://github.com/uplbtools/room-tba",
  discordUrl: "https://discord.uplbtools.me",
  osaOrganizationsUrl: "https://uplbosa.org/orgs",
  /** Messenger group chat invites (targets for redirect workers). */
  messengerContributeTarget: "https://m.me/j/Aba1V0prvQyLrafZ/",
  messengerMaintainTarget: "https://m.me/j/AbZtqMU8UUTiwQfn/",
  /** Short links on a community subdomain (Cloudflare Worker). Delete if unused. */
  messengerShortContributeUrl: "https://messenger.uplbtools.me/contribute",
  messengerShortMaintainUrl: "https://messenger.uplbtools.me/maintain",
} as const;
