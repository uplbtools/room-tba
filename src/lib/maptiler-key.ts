/** Placeholder in committed map assets — replaced at runtime with PUBLIC_MAPTILER_KEY. */
export const MAPTILER_KEY_PLACEHOLDER = "__MAPTILER_KEY__";

/** MapTiler client key — set PUBLIC_MAPTILER_KEY in .env (domain-restricted on MapTiler). */
export function getMaptilerKey(): string {
  const key = import.meta.env.PUBLIC_MAPTILER_KEY;
  if (!key) {
    throw new Error("PUBLIC_MAPTILER_KEY is not set");
  }
  return key;
}

export function applyMaptilerKeyToText(text: string, key: string): string {
  return text.replaceAll(MAPTILER_KEY_PLACEHOLDER, key);
}

/** Inject the runtime key into URLs or style JSON that use __MAPTILER_KEY__ placeholders. */
export function withMaptilerKey(value: string): string {
  return applyMaptilerKeyToText(value, getMaptilerKey());
}

/** Inject the runtime key into a map style JSON that uses __MAPTILER_KEY__ placeholders. */
export function injectMaptilerKey<T>(style: T): T {
  return JSON.parse(withMaptilerKey(JSON.stringify(style))) as T;
}

export const CAMPUS_MAP_STYLE_URL = "/liberty-customized.json";

/** Load the campus MapLibre style with the runtime MapTiler key applied. */
export async function loadCampusMapStyle<T>(): Promise<T> {
  const res = await fetch(CAMPUS_MAP_STYLE_URL);
  if (!res.ok) {
    throw new Error(`Failed to load map style (${res.status})`);
  }
  return injectMaptilerKey((await res.json()) as T);
}
