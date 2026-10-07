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
 * - San Pablo and Sta. Cruz jeeps come from Calamba and never enter campus:
 *   their Los Baños stop is the Junction on the national highway, and the
 *   descriptions say to get there first.
 * - Fares as of October 2026 (maintainer): campus jeeps ₱14, ₱12 for
 *   students; Los Baños → Calamba ₱30, ₱25 discounted. The DLTB UP Diliman
 *   bus is ticketed on DLTB's site, so the app links there instead
 *   (routeTicketing in src/constants/jeepney-routes.ts).
 * - Forestry downhill trips start at the Upper Forestry Jeep Terminal; the
 *   direction note now says so.
 *
 *
 * The UP Diliman buses' Quezon Ave. / Skyway stops needed no move: their line
 * is road-routed via SLEX and the Skyway (scripts/generate-transit-geometry.ts)
 * and passes within 10 m of them.
 */

import { FORESTRY_DIRECTION_NOTE } from "../../src/constants/jeepney-routes";

export const TRANSIT_FIX_OP_KEY = "2026-10-07-transit-fixes";

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
  fareRegular: number;
  fareDiscounted: number;
  directionNote: string | null;
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

/**
 * San Pablo and Sta. Cruz jeeps start in Calamba and only pass Los Baños on
 * the national highway; riders from campus get to the Junction first.
 */
const JUNCTION: StopPatch = {
  name: "Junction (Los Baños)",
  description:
    "Wait on the national highway at the Junction, in front of Olivarez Plaza and the Caltex station. These jeeps come from Calamba and do not enter the UPLB campus.",
  lat: 14.17895,
  lon: 121.23929,
};

// The "board at the Junction" note itself lives in code
// (ROUTE_BOARDING_NOTES in src/constants/jeepney-routes.ts) so it shows
// without this script; the descriptions only drop the old boarding text and
// the unverified fare sentence.
export const SAN_PABLO_DESCRIPTION =
  "Jeepney toward San Pablo City via Bay and Calauan, ending at the terminal near the church/Jollibee.";
export const STA_CRUZ_DESCRIPTION =
  "Jeepney toward Sta. Cruz along the national highway through Bay, Victoria and Pila, ending at the Pagsawitan terminal.";

/** Stop fixes keyed by route and current stop name. */
const STOP_FIXES: { routeId: string; name: string; patch: StopPatch }[] = [
  ...[
    "Olivarez Plaza (Los Baños)",
    "College / Olivarez Plaza (Los Baños)",
    OLIVAREZ_NAME,
  ].flatMap((name) => [
    { routeId: "lb-to-san-pablo", name, patch: JUNCTION },
    { routeId: "lb-to-sta-cruz", name, patch: JUNCTION },
  ]),
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

type RoutePatch = Partial<
  Pick<
    RouteRow,
    "name" | "description" | "directionNote" | "fareRegular" | "fareDiscounted"
  >
>;

const CAMPUS_FARE: RoutePatch = { fareRegular: 14, fareDiscounted: 12 };

const ROUTE_FIXES: {
  id: string;
  patch: (route: RouteRow) => RoutePatch;
}[] = [
  { id: "kaliwa-kanan", patch: () => CAMPUS_FARE },
  {
    id: "forestry",
    patch: () => ({ ...CAMPUS_FARE, directionNote: FORESTRY_DIRECTION_NOTE }),
  },
  { id: "up-rural", patch: () => CAMPUS_FARE },
  {
    id: "lb-to-calamba",
    patch: (route) => ({
      fareRegular: 30,
      fareDiscounted: 25,
      description: route.description.replace(
        /\s*~₱20 jeepney fare per commuter sources; verify against the current LTFRB matrix\./,
        "",
      ),
    }),
  },
  {
    id: "lb-to-san-pablo",
    patch: () => ({ description: SAN_PABLO_DESCRIPTION }),
  },
  {
    id: "lb-to-sta-cruz",
    patch: () => ({ description: STA_CRUZ_DESCRIPTION }),
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
