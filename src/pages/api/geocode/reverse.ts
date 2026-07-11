import type { APIRoute } from "astro";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import { reverseGeocode } from "@lib/reverse-geocode";

export const prerender = false;

const REVERSE_GEOCODE_LIMIT = { max: 30, windowMs: 60 * 1000 };

export const GET: APIRoute = async ({ request, url }) => {
  const ip = clientIp(request);
  const rate = checkRateLimit(
    `geocode-reverse:${ip}`,
    REVERSE_GEOCODE_LIMIT.max,
    REVERSE_GEOCODE_LIMIT.windowMs,
  );
  if (!rate.allowed) {
    return rateLimitResponse(rate.resetAt);
  }

  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: "Enter valid coordinates." }, 400);
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return json({ error: "Coordinates are out of range." }, 400);
  }

  try {
    const address = await reverseGeocode(lat, lon);
    return json({ address });
  } catch (error) {
    console.error("Reverse geocode failed:", error);
    return json({ error: "Could not look up the address." }, 502);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
