/**
 * Appearance: System / Light / Dark (Jakob audit macro 13).
 *
 * Components keep their light colors as the fallback of a token, e.g.
 * `background: var(--theme-surface, #fff)`. Light mode defines no tokens, so
 * it renders exactly as before; dark mode defines them all on <html> from
 * DARK_THEME_TOKENS below. The resolved theme lives on
 * `<html data-theme="light|dark">`, set before first paint by the inline
 * script in Layout.astro (which cannot import this module, so it repeats
 * THEME_STORAGE_KEY by hand; theme.test.ts keeps the two in step).
 *
 * Plain module, not `.svelte.ts`, so the bun unit suite and Map.svelte can
 * both use it; Svelte consumers subscribe with onThemeChange().
 */

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "room-tba:theme";
/** Fired on window whenever the resolved theme may have changed. */
export const THEME_CHANGE_EVENT = "room-tba:themechange";

export const THEME_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemDark ? "dark" : "light";
  return preference;
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function systemPrefersDark(): boolean {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function getResolvedTheme(): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset["theme"] === "dark"
    ? "dark"
    : "light";
}

/** Persist the choice and repaint immediately. */
export function setThemePreference(preference: ThemePreference): void {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode: still apply for this page view.
  }
  document.documentElement.dataset["theme"] = resolveTheme(
    preference,
    systemPrefersDark(),
  );
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Subscribe to resolved-theme changes. Returns an unsubscribe function. */
export function onThemeChange(
  listener: (theme: ResolvedTheme) => void,
): () => void {
  const handler = () => listener(getResolvedTheme());
  window.addEventListener(THEME_CHANGE_EVENT, handler);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, handler);
}

/**
 * Dark values for every `--theme-*` token the components reference. Warm
 * neutrals to sit with the maroon brand. Text pairs are held to WCAG AA
 * (4.5:1) on every surface in theme.test.ts. The maroon brand (#7b1113) is
 * ~1.4:1 on these surfaces, so maroon text/icons use the lighter tint
 * `accent-text`, and filled maroon buttons use a brighter `accent-fill` that
 * still carries white text above 4.5:1.
 */
export const DARK_THEME_TOKENS = {
  surface: "#211d1c",
  "surface-2": "#2a2625",
  "surface-3": "#36312f",
  "surface-translucent": "rgb(33 29 28 / 0.9)",
  "surface-faint": "rgb(33 29 28 / 0.35)",
  text: "#efe9e4",
  "text-2": "#d3cac3",
  "text-muted": "#b3aaa3",
  "text-faint": "#8e8580",
  border: "#4a4442",
  "border-strong": "#7a716d",
  "accent-text": "#f2a69c",
  "accent-soft": "#3a2422",
  "accent-border": "#8a4a44",
  "accent-fill": "#a8362b",
  "danger-text": "#f2b8b5",
  "amber-text": "#f3cf7a",
  "amber-soft": "#3a3020",
  "amber-border": "#7a6233",
  "green-text": "#86d9b4",
  "green-soft": "#1d332b",
  "green-border": "#3c6b58",
  "blue-text": "#9cc5f7",
  "blue-soft": "#1f2b3d",
  "blue-border": "#40597d",
  "purple-text": "#d7b4f2",
  "purple-soft": "#33263d",
  "purple-border": "#634a78",
} as const;

export type ThemeToken = keyof typeof DARK_THEME_TOKENS;

/**
 * CSS for the dark tokens. Screen only, so printing a page always comes out
 * light. Scoped to app pages (data-app-page); static pages such as /donate
 * still have only light styles.
 */
export function darkThemeCss(): string {
  const decls = Object.entries(DARK_THEME_TOKENS)
    .map(([name, value]) => `--theme-${name}:${value};`)
    .join("");
  return (
    "@media screen{" +
    `:root[data-theme="dark"][data-app-page]{color-scheme:dark;${decls}}` +
    ':root[data-theme="dark"][data-app-page] body{background:var(--theme-surface);color:var(--theme-text);}' +
    "}"
  );
}
