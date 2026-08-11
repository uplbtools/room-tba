import type { WaybackItem, WaybackMetadata } from "@esri/wayback-core";

export const WAYBACK_MIN_YEAR = 2015;
export const WAYBACK_ATTRIBUTION_URL =
  "https://livingatlas.arcgis.com/wayback/";

export type WaybackSnapshot = {
  releaseNum: number;
  releaseDate: string;
  acquisitionDate: string | null;
  tileUrl: string;
};

type Point = { latitude: number; longitude: number };

export function toWaybackTileUrl(itemUrl: string): string {
  return itemUrl
    .replace("{level}", "{z}")
    .replace("{row}", "{y}")
    .replace("{col}", "{x}");
}

/** Keep the latest locally changed release for each available year. */
export function selectWaybackYears(items: WaybackItem[]): WaybackItem[] {
  const years = new Map<number, WaybackItem>();
  for (const item of items) {
    const year = new Date(item.releaseDatetime).getUTCFullYear();
    if (year >= WAYBACK_MIN_YEAR && !years.has(year)) years.set(year, item);
  }
  return [...years.values()].sort(
    (a, b) => b.releaseDatetime - a.releaseDatetime,
  );
}

function dateLabel(timestamp: number | undefined): string | null {
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : null;
}

export async function loadWaybackSnapshots(
  point: Point,
  zoom: number,
  signal?: AbortSignal,
): Promise<WaybackSnapshot[]> {
  const { getMetadata, getWaybackItemsWithLocalChanges } = await import(
    "@esri/wayback-core"
  );
  const items = selectWaybackYears(
    await getWaybackItemsWithLocalChanges(point, Math.round(zoom), { signal }),
  );
  const metadata = await Promise.all(
    items.map(async (item) => {
      try {
        return await getMetadata(point, Math.round(zoom), item.releaseNum);
      } catch {
        return null;
      }
    }),
  );

  return items.map((item, index) => ({
    releaseNum: item.releaseNum,
    releaseDate: item.releaseDateLabel,
    acquisitionDate: dateLabel(
      (metadata[index] as WaybackMetadata | null)?.date,
    ),
    tileUrl: toWaybackTileUrl(item.itemURL),
  }));
}
