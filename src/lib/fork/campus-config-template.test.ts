import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  campusSlug,
  generateCampusConfig,
  vercelDeployUrl,
  type ForkConfig,
} from "./campus-config-template";

const sample: ForkConfig = {
  name: "Sample State University",
  siteUrl: "https://ssu-room-tba.vercel.app",
  center: [121.241259484605, 14.1632373694632],
  bounds: [
    [121.168, 14.095],
    [121.335, 14.215],
  ],
  defaultZoom: 15.813,
  transitOverlay: true,
  transitLabel: "Jeepney routes",
  terrain: false,
};

/**
 * Write the generated text to a temp file and import it: proves the output
 * parses as a module and lets the exported shapes be asserted directly,
 * instead of regex-matching source text.
 */
async function loadGenerated(config: ForkConfig) {
  const dir = mkdtempSync(join(tmpdir(), "fork-config-"));
  const file = join(dir, "campus.config.ts");
  writeFileSync(file, generateCampusConfig(config));
  try {
    return await import(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("campusSlug", () => {
  test("slugifies a campus name", () => {
    expect(campusSlug("University of the Philippines Diliman")).toBe(
      "university-of-the-philippines-diliman",
    );
  });

  test("strips punctuation and collapses spaces", () => {
    expect(campusSlug("  St. Mary's   College! ")).toBe("st-mary-s-college");
  });
});

describe("vercelDeployUrl", () => {
  test("prefills repo, env prompts, and slug-derived project name", () => {
    const url = vercelDeployUrl("ssu");
    expect(url.startsWith("https://vercel.com/new/clone?")).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get("repository-url")).toBe(
      "https://github.com/uplbtools/room-tba",
    );
    expect(params.get("env")).toBe(
      "DATABASE_URL,ADMIN_PASSWORD,ADMIN_SESSION_SECRET,ISR_BYPASS_TOKEN",
    );
    expect(params.get("project-name")).toBe("ssu-room-tba");
  });

  test("URL-encodes the raw href", () => {
    expect(vercelDeployUrl("ssu")).toContain(
      "repository-url=https%3A%2F%2Fgithub.com%2Fuplbtools%2Froom-tba",
    );
  });
});

describe("generateCampusConfig", () => {
  const output = generateCampusConfig(sample);

  test("mirrors every export the app, scripts, and E2E suite import", () => {
    expect(output).toContain("export const campusSite");
    expect(output).toContain("export const campusMap");
    expect(output).toContain("export const campusTerrain");
    expect(output).toContain("export const campusTransit");
    expect(output).toContain("export const campusTestFixtures");
    expect(output).toContain("export const campusCommunity");
  });

  test("swaps in the campus name, URL, camera, and bounds", () => {
    expect(output).toContain(
      "Find Rooms and Buildings at Sample State University",
    );
    expect(output).toContain('url: "https://ssu-room-tba.vercel.app"');
    // Coordinates trimmed to 6 decimals, zoom to 2.
    expect(output).toContain("center: [121.241259, 14.163237]");
    expect(output).toContain("zoom: 15.81");
    expect(output).toContain("[121.168, 14.095]");
    expect(output).toContain("[121.335, 14.215]");
  });

  test("quotes names that would otherwise break the generated source", async () => {
    const module = await loadGenerated({
      ...sample,
      name: 'The "Big" College \\ Annex',
      transitLabel: 'Shuttle "loop"',
    });
    expect(module.campusSite.title).toContain('The "Big" College \\ Annex');
    expect(module.campusTransit.label).toBe('Shuttle "loop"');
  });

  test("generated module exports the values the fork asked for", async () => {
    const module = await loadGenerated(sample);
    expect(module.campusSite.url).toBe("https://ssu-room-tba.vercel.app");
    expect(module.campusMap.maxBounds).toEqual([
      [121.168, 14.095],
      [121.335, 14.215],
    ]);
    expect(module.campusMap.defaultCamera.center).toEqual([
      121.241259, 14.163237,
    ]);
    expect(module.campusMap.defaultCamera.zoom).toBe(15.81);
    // E2E fixtures must sit inside the campus bounds the fork just drew.
    const { buildingLon, buildingLat, dormLon, dormLat } =
      module.campusTestFixtures;
    for (const [lon, lat] of [
      [buildingLon, buildingLat],
      [dormLon, dormLat],
    ]) {
      expect(lon).toBeGreaterThan(121.168);
      expect(lon).toBeLessThan(121.335);
      expect(lat).toBeGreaterThan(14.095);
      expect(lat).toBeLessThan(14.215);
    }
  });

  test("transit and terrain off strip the features but keep the exports", async () => {
    const module = await loadGenerated({
      ...sample,
      transitOverlay: false,
      terrain: false,
    });
    expect(module.campusTransit.enabled).toBe(false);
    expect(module.campusTransit.label).toBe("Jeepney routes");
    expect(module.campusTransit.routeDataModule).toBe(
      "src/constants/jeepney-routes.ts",
    );
    expect(module.campusTerrain.enabled).toBe(false);
    // Flat map when the fork has no terrain (and likely no MapTiler key).
    expect(module.campusMap.defaultCamera.pitch).toBe(0);
  });

  test("terrain on tilts the default camera and keeps a rounded terrain zoom", async () => {
    const module = await loadGenerated({ ...sample, terrain: true });
    expect(module.campusTerrain.enabled).toBe(true);
    expect(module.campusMap.defaultCamera.pitch).toBe(60);
    expect(module.campusTerrain.camera.zoom).toBe(13.31);
    expect(module.campusTerrain.maxBounds).toEqual(module.campusMap.maxBounds);
  });

  test("leaves community links as blank placeholders, not upstream ones", () => {
    expect(output).toContain("TODO(fork)");
    expect(output).not.toContain("uplbtools");
    expect(output).not.toContain("m.me");
  });
});
