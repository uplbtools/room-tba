/**
 * Which basemap actually served the tiles (#885).
 *
 * `loadCampusMapStyle()` falls back to a keyless basemap when MapTiler rejects
 * the key, but the attribution credited MapTiler unconditionally, naming a
 * vendor that served nothing. Nothing legally required is missing either way
 * (the OpenStreetMap data credit shows in every case, and OpenFreeMap asks for
 * none), but crediting the wrong vendor is still wrong.
 *
 * Deliberately a plain module rather than a `.svelte.ts` rune: `maptiler-key`
 * imports this, and `maptiler-key` is covered by the bun unit suite, which has
 * no Svelte compiler. A `$state` here fails at import with "$state is not
 * defined" and takes every one of those tests down with it. Svelte consumers
 * subscribe instead.
 */
export type BasemapProvider = "maptiler" | "openfreemap" | "osm-raster";

let current: BasemapProvider = "maptiler";
const listeners = new Set<(provider: BasemapProvider) => void>();

export function setBasemapProvider(provider: BasemapProvider): void {
  if (provider === current) return;
  current = provider;
  for (const listener of listeners) listener(provider);
}

export function getBasemapProvider(): BasemapProvider {
  return current;
}

/** Subscribe to provider changes. Returns an unsubscribe function. */
export function onBasemapProviderChange(
  listener: (provider: BasemapProvider) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
