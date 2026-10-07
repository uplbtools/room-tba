/**
 * 2026-10-06 transit data corrections, as a pure plan over the current rows so
 * the runner (scripts/fix-transit-data.ts) can print it, test it, and apply
 * it with history. Found by the mobile transit audit:
 *
 * - Stops kilometres off their own route line. Each new position is the town
 *   centre (OpenMapTiles place label) snapped onto the route's drawn line in
 *   src/constants/jeepney-geometries.json:
 *   - San Pablo: "Alaminos" (7.1 km off) is not on the Los Baños road at all;
 *     the jeep runs Bay → Calauan → San Pablo. Calauan is 33 m from the line.
 *   - Sta. Cruz: "Victoria (highway)" sat 2.9 km off; moved onto the highway.
 *   - Calamba and both Buendia buses: the Pansol stops shared one point
 *     1.4–2 km south of the national highway; moved onto it.
 * - Olivarez Plaza went by six names ("Olivarez Plaza / College (Los Baños)",
 *   "Los Baños Crossing", …), so searching "olivarez" missed a route. One
 *   name now, with the signboard names kept in the description.
 * - Paired bus names read "Los Baños → Buendia (LRT Gil Puyat)" one way and
 *   "Buendia → Los Baños" the other.
 *
 *
 * The UP Diliman buses' Quezon Ave. / Skyway stops needed no move: their line
 * is road-routed via SLEX and the Skyway (scripts/generate-transit-geometry.ts)
 * and passes within 10 m of them.
 */

export const TRANSIT_FIX_OP_KEY = "2026-10-06-transit-stop-fixes";

export const OLIVAREZ_NAME = "Olivarez Plaza Mall";
const OLIVAREZ_ALIASES =
  "Also signboarded COLLEGE or OLIVAREZ; some riders call it Los Baños Crossing.";

export type StopRow = {
  id: number;
  routeId: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
  version: number;
};

export type RouteRow = {
  id: string;
  name: string;
  description: string;
  version: number;
};

type StopPatch = Partial<Pick<StopRow, "name" | "description" | "lat" | "lon">>;

const PANSOL = {
  name: "Pansol (national highway)",
  description:
    "Stop on the national highway at Pansol, Calamba, by the hot-spring resorts.",
  lat: 14.17645,
  lon: 121.18739,
};

/** Stop fixes keyed by route and current stop name. */
const STOP_FIXES: { routeId: string; name: string; patch: StopPatch }[] = [
  {
    routeId: "lb-to-san-pablo",
    name: "Alaminos",
    patch: {
      name: "Calauan (Poblacion)",
      description: "Stop on the national highway through Calauan town proper.",
      lat: 14.14537,
      lon: 121.3147,
    },
  },
  {
    routeId: "lb-to-sta-cruz",
    name: "Victoria (highway)",
    patch: {
      name: "Victoria (national highway)",
      description:
        "Stop where the national highway passes Victoria, before Pila.",
      lat: 14.20823,
      lon: 121.35032,
    },
  },
  { routeId: "lb-to-calamba", name: "Bagong Kalsada / Pansol", patch: PANSOL },
  {
    routeId: "lb-to-buendia",
    name: "Calamba (Pansol/Bucal/Crossing)",
    patch: PANSOL,
  },
  { routeId: "buendia-to-lb", name: "Pansol, Calamba", patch: PANSOL },
];

const ROUTE_FIXES: {
  id: string;
  patch: (route: RouteRow) => Partial<Pick<RouteRow, "name" | "description">>;
}[] = [
  {
    id: "lb-to-san-pablo",
    patch: (route) => ({
      description: route.description.replaceAll("Alaminos", "Calauan"),
    }),
  },
  {
    id: "buendia-to-lb",
    patch: () => ({ name: "Buendia (LRT Gil Puyat) → Los Baños" }),
  },
];

export type TransitFix =
  | {
      table: "jeepney_stops";
      id: number;
      label: string;
      before: StopPatch;
      after: StopPatch;
      version: number;
    }
  | {
      table: "jeepney_routes";
      id: string;
      label: string;
      before: Partial<RouteRow>;
      after: Partial<RouteRow>;
      version: number;
    };

function changed<T extends object>(row: T, patch: Partial<T>) {
  const before: Partial<T> = {};
  const after: Partial<T> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    if (patch[key] !== undefined && patch[key] !== row[key]) {
      before[key] = row[key];
      after[key] = patch[key];
    }
  }
  return Object.keys(after).length > 0 ? { before, after } : null;
}

/** Append a sentence, ending the existing text with a full stop first. */
function withSentence(text: string, sentence: string): string {
  const base = text.trim();
  if (!base) return sentence;
  return `${base}${/[.!?]$/.test(base) ? "" : "."} ${sentence}`;
}

/** Every correction still needed against the current rows (idempotent). */
export function planTransitFixes(
  routes: RouteRow[],
  stops: StopRow[],
  campusRouteIds: ReadonlySet<string>,
): TransitFix[] {
  const fixes: TransitFix[] = [];

  for (const stop of stops) {
    const fix = STOP_FIXES.find(
      (f) => f.routeId === stop.routeId && f.name === stop.name,
    );
    let patch: StopPatch | null = fix ? fix.patch : null;
    if (
      !patch &&
      !campusRouteIds.has(stop.routeId) &&
      stop.name !== OLIVAREZ_NAME &&
      /olivarez|los baños crossing/i.test(stop.name)
    ) {
      patch = {
        name: OLIVAREZ_NAME,
        description: stop.description.includes(OLIVAREZ_ALIASES)
          ? stop.description
          : withSentence(stop.description, OLIVAREZ_ALIASES),
      };
    }
    const diff = patch ? changed(stop, patch) : null;
    if (diff) {
      fixes.push({
        table: "jeepney_stops",
        id: stop.id,
        label: `${stop.routeId}: ${stop.name}`,
        ...diff,
        version: stop.version,
      });
    }
  }

  for (const route of routes) {
    const fix = ROUTE_FIXES.find((f) => f.id === route.id);
    const diff = fix ? changed(route, fix.patch(route)) : null;
    if (diff) {
      fixes.push({
        table: "jeepney_routes",
        id: route.id,
        label: route.id,
        ...diff,
        version: route.version,
      });
    }
  }
  return fixes;
}
