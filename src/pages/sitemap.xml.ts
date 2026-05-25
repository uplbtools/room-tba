import type { APIRoute } from "astro";
import {
  getBuildingSlug,
  getCollegeSlug,
  getDivisionSlug,
  getDormRouteSlug,
  getRoomRouteSlug,
  loadAppData,
} from "../lib/app-data";
import { absoluteUrl } from "../lib/site";

export const GET: APIRoute = async () => {
  const { rooms, buildings, divisions, colleges, dorms } = await loadAppData();

  const urls = [
    "/",
    "/changelog",
    "/room/",
    "/building/",
    "/division/",
    "/college/",
    "/dorm/",
    ...rooms.map((room) => `/room/${getRoomRouteSlug(room, rooms)}/`),
    ...buildings.map((building) => `/building/${getBuildingSlug(building)}/`),
    ...divisions.map((division) => `/division/${getDivisionSlug(division)}/`),
    ...colleges.map((college) => `/college/${getCollegeSlug(college)}/`),
    ...dorms.map((dorm) => `/dorm/${getDormRouteSlug(dorm, dorms)}/`),
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
