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

/**
 * Keep photographs, drop maps/diagrams/documents. Commons geosearch returns
 * every geocoded file, and an SVG campus map hotlinked as a "photo" of a
 * building is worse than no photo.
 */
export function isLikelyPhotoTitle(title: string): boolean {
  return PHOTO_EXTENSIONS.test(title);
}

/** Strip the HTML Commons wraps around artist names ("<a ...>Juan</a>"). */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
