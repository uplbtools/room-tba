/** Open a lat/lon pin in Google Maps (same URL shape used across entity panels). */
export function getGoogleMapsPinUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}
