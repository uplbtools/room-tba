export type AppScreenPath = "planner" | "today" | "finals" | "calendar";

const SCREEN_PATHS: Record<string, AppScreenPath> = {
  planner: "planner",
  today: "today",
  "final-exams": "finals",
  calendar: "calendar",
};

/**
 * Full-screen app route for a pathname, or null for the map.
 *
 * Online, /planner and friends are their own Astro pages and pass an
 * `openPlanner`-style prop. Offline, the service worker answers those
 * navigations with the precached map shell (index.html), which carries no
 * prop, so the shell reads the path itself. Must run before EntityUrlSync
 * normalizes the URL to "/".
 */
export function appScreenFromPath(pathname: string): AppScreenPath | null {
  const segment = pathname.replace(/^\/+|\/+$/g, "");
  return SCREEN_PATHS[segment] ?? null;
}
