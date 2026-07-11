import timestamps from "../generated/release-timestamps.json";

const MAP = timestamps as Record<string, string>;

const FORMATTER = new Intl.DateTimeFormat("en-PH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

/** Exact publish time for a release version ("1.45.0"), or null if unknown. */
export function releaseTimestampLabel(version: string): string | null {
  const iso = MAP[version.replace(/^v/, "")];
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return FORMATTER.format(date);
}
