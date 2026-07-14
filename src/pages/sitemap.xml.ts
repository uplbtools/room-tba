// src/pages/sitemap.xml.ts

export const prerender = false;

import type { APIRoute } from "astro";
import {
  getBuildingSlug,
  getCollegeSlug,
  getDivisionSlug,
  getDormRouteSlug,
  getEventSlug,
  getRoomRouteSlug,
  loadAppData,
} from "@lib/app-data";
import { absoluteUrl } from "@lib/site";
import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
import {
  getTransitRoutePath,
  getTransitStopPath,
  TRANSIT_INDEX_PATH,
} from "@lib/transit-urls";

export const GET: APIRoute = async () => {
  const { rooms, buildings, divisions, colleges, dorms, events } =
    await loadAppData();

  const urls = [
    "/",
    "/changelog",
    "/privacy",
    "/terms",
    "/wiki",
    "/wiki/section-times",
    "/room/",
    "/building/",
    "/division/",
    "/college/",
    "/dorm/",
    "/event/",
    TRANSIT_INDEX_PATH,
    ...rooms.map((room) => `/room/${getRoomRouteSlug(room)}/`),
    ...buildings.map((building) => `/building/${getBuildingSlug(building)}/`),
    ...divisions.map((division) => `/division/${getDivisionSlug(division)}/`),
    ...colleges.map((college) => `/college/${getCollegeSlug(college)}/`),
    ...dorms.map((dorm) => `/dorm/${getDormRouteSlug(dorm)}/`),
    ...events
      .filter((event) => event.includeInSeo)
      .map((event) => `/event/${getEventSlug(event)}/`),
    ...JEEPNEY_ROUTES.flatMap((route) => [
      getTransitRoutePath(route.id),
      ...route.stops.map((_, index) => getTransitStopPath(route.id, index)),
    ]),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${absoluteUrl(url)}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
