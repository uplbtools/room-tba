// src/constants/data-catalog.ts

/** When room/course catalog data was last reviewed for public display. */
export const DATA_CATALOG_UPDATED = "2026-06-29";

const catalogUpdatedFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** Stable display label, e.g. "Jun 29, 2026". */
export function formatCatalogUpdatedDate(): string {
  return catalogUpdatedFormatter.format(
    new Date(`${DATA_CATALOG_UPDATED}T12:00:00.000Z`),
  );
}
