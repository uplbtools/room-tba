import type { AppContextData } from "@lib/context";
import type { EntityNameResolver } from "./diff";

/**
 * Resolve the foreign keys that appear in edit proposals against the entity
 * lists the app already holds in context, so a reviewer reads
 * "Building  Physical Sciences → CHE Building" instead of "Building 3 → 24"
 * (#873). Returns null for anything it does not know, which leaves the raw id
 * on screen rather than inventing a name.
 */
export function appEntityNameResolver(app: AppContextData): EntityNameResolver {
  if (!app.loaded) return () => null;
  // ponytail: linear scan. Campus entity lists are in the hundreds and the
  // queue renders once; build id→name Maps if a review ever feels slow.
  return (field, id) => {
    switch (field) {
      case "buildingId":
        return app.buildings.find((b) => b.id === id)?.buildingName ?? null;
      case "collegeId":
        return app.colleges.find((c) => c.id === id)?.collegeName ?? null;
      case "divisionId":
        return app.divisions.find((d) => d.id === id)?.divisionName ?? null;
      default:
        return null;
    }
  };
}
