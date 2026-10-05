/**
 * Pure pieces of the landmark-image fetcher, split out so they are covered by
 * the bun unit suite (scripts/ itself is not).
 *
 * A manifest entry never stores imagery bytes or API keys: Street View is
 * represented as compass headings the client turns into URLs with its own key
 * (Google's terms forbid storing the pixels), and Commons photos are hotlinked
 * thumbnails with the attribution their licenses require.
 */

export type {
  CommonsImage,
  LandmarkImagesEntry,
  LandmarkImagesManifest,
} from "../../src/lib/landmark-images";
export { MAX_COMMONS_IMAGES } from "../../src/lib/landmark-images";

/** Great-circle initial bearing from `from` to `to`, degrees 0-360. */
export function bearingDegrees(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLng = toRad(to.lng - from.lng);
  const fromLat = toRad(from.lat);
  const toLat = toRad(to.lat);
  const y = Math.sin(dLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (Math.round(deg) + 360) % 360;
}

/** Haversine distance in metres. */
export function distanceMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/**
 * Facade headings around the pano-to-building bearing. One frame centered on
 * the building plus one to each side, so a frontage wider than the 90-degree
 * field of view still gets covered end to end.
 */
export const HEADING_SPREAD = 55;

export function facadeHeadings(base: number): number[] {
  return [-HEADING_SPREAD, 0, HEADING_SPREAD].map(
    (offset) => (base + offset + 360) % 360,
  );
}

const PHOTO_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
/** Geotagged campus maps and logos are rasters too. */
const NOT_A_PHOTO = /(^|[^a-z])(maps?|logo|seal|diagram)([^a-z]|$)/i;

/**
 * Keep photographs, drop maps/diagrams/documents. Commons geosearch returns
 * every geocoded file, and an SVG campus map hotlinked as a "photo" of a
 * building is worse than no photo.
 */
export function isLikelyPhotoTitle(title: string): boolean {
  return PHOTO_EXTENSIONS.test(title) && !NOT_A_PHOTO.test(title);
}

/**
 * Strip the HTML Commons wraps around artist names ("<a ...>Juan</a>").
 *
 * The Artist field is whatever a Commons editor typed, so the second replace
 * drops any angle bracket the tag pattern could not pair off ("Juan <b" keeps
 * a live "<" otherwise). Result is plain text: it can never open a tag.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Street View copyright reads "© Google" on Google's own captures and the
 * uploader's name on user-contributed photospheres. Only Google captures are
 * kept: a user photo needs that person credited, and they are often indoor
 * or off-subject anyway.
 */
export function isGoogleCapture(copyright: string | undefined): boolean {
  return /google/i.test(copyright ?? "");
}

/**
 * Organizations that occupy a place (offices, units, academic departments,
 * service desks). Student orgs, councils and publications are groups of
 * people; a photo of their pin is a photo of somebody else's building.
 */
const PHYSICAL_ORG_CATEGORIES = new Set([
  "office",
  "unit",
  "academic",
  "service",
]);

export function isPhysicalOrgCategory(category: string | null): boolean {
  return category != null && PHYSICAL_ORG_CATEGORIES.has(category);
}

/** Words too generic to say a Commons file is about this particular place. */
const GENERIC_WORDS = new Set([
  "uplb",
  "university",
  "philippines",
  "college",
  "building",
  "office",
  "center",
  "centre",
  "hall",
  // Parent-campus acronyms: every file on the IRRI or UPOU grounds says them.
  "irri",
  "upou",
  "laguna",
  "banos",
  "baños",
]);

export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !GENERIC_WORDS.has(word));
}

/**
 * Commons filter for small places (a food truck, a dorm, an office), where
 * nearest-within-radius drags in whatever is next door: a bird photographed
 * 15m from the post office is still a bird. Only files whose title names the
 * place, by a whole distinctive word, are kept.
 */
export function titleNamesPlace(title: string, name: string): boolean {
  const titleWords = new Set(nameTokens(title));
  return nameTokens(name).some((token) => titleWords.has(token));
}
