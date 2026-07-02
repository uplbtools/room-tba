/**
 * On-demand ISR revalidation for Vercel (x-prerender-revalidate).
 *
 * Requires ISR_BYPASS_TOKEN in Vercel env and matching bypassToken in astro.config.
 * No-op when the token is unset (local dev, previews without ISR configured).
 */

import {
  getBuildingSlug,
  getCollegeSlug,
  getDivisionSlug,
  getDormRouteSlug,
  getRoomRouteSlug,
} from "@lib/app-data";
import { SITE_URL } from "@lib/site";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  RoomData,
} from "@lib/types";

const SITEMAP_PATH = "/sitemap.xml";

export function roomIsrPath(room: Pick<RoomData, "id" | "code">): string {
  return `/room/${getRoomRouteSlug(room)}/`;
}

export function buildingIsrPath(
  building: Pick<BuildingData, "buildingName">,
): string {
  return `/building/${getBuildingSlug(building)}/`;
}

export function collegeIsrPath(
  college: Pick<CollegeData, "collegeName">,
): string {
  return `/college/${getCollegeSlug(college)}/`;
}

export function divisionIsrPath(
  division: Pick<DivisionData, "divisionName">,
): string {
  return `/division/${getDivisionSlug(division)}/`;
}

export function dormIsrPath(dorm: Pick<DormData, "id" | "dormName">): string {
  return `/dorm/${getDormRouteSlug(dorm)}/`;
}

export function eventIsrPath(slug: string): string {
  return `/event/${slug}/`;
}

/** Fire-and-forget ISR revalidation; always includes sitemap when paths are provided. */
export function revalidateIsrPaths(paths: string[] | undefined): void {
  if (!paths?.length) return;

  const token = process.env.ISR_BYPASS_TOKEN?.trim();
  if (!token) return;

  const unique = [...new Set([...paths, SITEMAP_PATH])];
  const base = SITE_URL.replace(/\/$/, "");

  void Promise.allSettled(
    unique.map((path) =>
      fetch(`${base}${path}`, {
        method: "HEAD",
        headers: { "x-prerender-revalidate": token },
      }),
    ),
  );
}
