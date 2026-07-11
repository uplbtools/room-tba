import { SITE_NAME, SITE_URL } from "@lib/site";

const cache = new Map<string, string | null>();

export function reverseGeocodeCacheKey(lat: number, lon: number) {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

type NominatimAddress = {
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
};

type NominatimResult = {
  display_name?: string;
  address?: NominatimAddress;
};

export function formatNominatimAddress(result: NominatimResult): string | null {
  const address = result.address;
  if (!address) return result.display_name?.trim() || null;
  const parts = [
    address.road,
    address.neighbourhood || address.suburb,
    address.city || address.county,
    address.state,
  ].filter((part): part is string => Boolean(part?.trim()));
  if (parts.length) return parts.join(", ");
  return result.display_name?.trim() || null;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<string | null> {
  const key = reverseGeocodeCacheKey(lat, lon);
  if (cache.has(key)) return cache.get(key) ?? null;

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "18");

  const response = await fetch(url, {
    headers: {
      "User-Agent": `${SITE_NAME}/1.0 (${SITE_URL}; campus map)`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    cache.set(key, null);
    return null;
  }

  const data = (await response.json()) as NominatimResult;
  const formatted = formatNominatimAddress(data);
  cache.set(key, formatted);
  return formatted;
}
