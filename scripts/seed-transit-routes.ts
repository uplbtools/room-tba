/**
 * Seed inter-town jeepney/bus routes from the 2026-07 transit research pass
 * into jeepney_routes + jeepney_stops. Idempotent: a route whose id already
 * exists is skipped whole (no partial re-insert), so this is safe to rerun.
 *
 * Scope decision: only ROUTES THAT LEAVE THE CAMPUS MAP are seeded here.
 * Campus-internal routes stay in src/constants (road-snapped geometry). The
 * report's stop coordinates were 3-decimal (~110 m) and some were plain wrong
 * (Olivarez lon off ~2 km, SM Calamba lat off ~2.7 km), so every stop below was
 * re-geocoded to 4-5 decimals; the reused hub anchors (UPLB gate, Olivarez
 * Plaza, SM Calamba, LRT Gil Puyat, San Pablo, Sta. Cruz) were web-verified,
 * mid-corridor stops are best-effort and flagged "approximate" in-row. Fares
 * for the local jeeps are report estimates predating the 2026-03-19 LTFRB
 * adjustment — indicative only.
 *
 * Usage:
 *   bun run scripts/seed-transit-routes.ts --dry-run
 *   DATABASE_URL=... bun run scripts/seed-transit-routes.ts
 */

import { randomUUID } from "node:crypto";
import pg from "pg";
import { loadEnv } from "./load-env";

loadEnv();

const DRY_RUN = process.argv.includes("--dry-run");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

type Stop = { name: string; description: string; lat: number; lon: number };
type Route = {
  id: string;
  name: string;
  description: string;
  directionNote: string;
  color: string;
  fareRegular: number;
  fareDiscounted: number;
  stops: Stop[];
};

const ROUTES: Route[] = [
  {
    id: "uplb-to-upd",
    name: "UPLB → UP Diliman (DLTB Commuter Bus)",
    description:
      "Direct DLTB commuter bus under the UPLB Green Mobility Initiative (test runs from Aug 19, 2024). Departs the Velasco Ave. loading bay near the UPLB main gate via SLEX/Skyway to Lakandula Ext. cor. E. Jacinto St. near UP Fine Arts in Diliman. Not P2P — pickups allowed at Olivarez Plaza, Calamba/SM Calamba, Skyway points. UPLB→UPD departs 5:00 AM, 1:00 PM, 6:00 PM (weekdays + Sat).",
    directionNote:
      "One-way (southern→northern campus); pair of the reverse route.",
    color: "#7B1FA2",
    fareRegular: 165,
    fareDiscounted: 132,
    stops: [
      {
        name: "UPLB Velasco Ave. loading bay",
        description: "Near UPLB main gate; terminal",
        lat: 14.16631,
        lon: 121.23976,
      },
      {
        name: "Olivarez Plaza",
        description: "Optional pickup, Los Baños Junction area",
        lat: 14.17926,
        lon: 121.23939,
      },
      {
        name: "SM Calamba",
        description: "Optional pickup/drop-off",
        lat: 14.20343,
        lon: 121.15511,
      },
      {
        name: "Metro Manila Skyway / Quezon Ave exit",
        description: "Via SLEX and Skyway; approximate",
        lat: 14.637,
        lon: 121.035,
      },
      {
        name: "Philcoa",
        description: "Optional Diliman-area stop",
        lat: 14.65658,
        lon: 121.05463,
      },
      {
        name: "UP Diliman — Lakandula Ext. cor. E. Jacinto St.",
        description: "Near UP Fine Arts College; terminus",
        lat: 14.6554,
        lon: 121.0698,
      },
    ],
  },
  {
    id: "upd-to-uplb",
    name: "UP Diliman → UPLB (DLTB Commuter Bus)",
    description:
      "Reverse of the UPLB↔UPD commuter bus. Departs UP Diliman (Lakandula Ext. cor. Jacinto St., near the CFA waiting shed) at 5:00 AM, 9:00 AM, 6:00 PM (weekdays + Sat) via Quezon Ave/Skyway/SLEX to the UPLB Velasco Ave. loading bay.",
    directionNote:
      "One-way (northern→southern campus); pair of the forward route.",
    color: "#7B1FA2",
    fareRegular: 165,
    fareDiscounted: 132,
    stops: [
      {
        name: "UP Diliman — Lakandula Ext. cor. E. Jacinto St.",
        description: "Near CFA waiting shed; terminal",
        lat: 14.6554,
        lon: 121.0698,
      },
      {
        name: "Quezon Ave. before Skyway",
        description: "Pickup point; approximate",
        lat: 14.637,
        lon: 121.035,
      },
      {
        name: "SM Calamba",
        description: "Optional drop-off",
        lat: 14.20343,
        lon: 121.15511,
      },
      {
        name: "Olivarez Plaza / Los Baños Junction",
        description: "Optional drop-off",
        lat: 14.17926,
        lon: 121.23939,
      },
      {
        name: "UPLB Velasco Ave. loading bay",
        description: "Terminus near main gate",
        lat: 14.16631,
        lon: 121.23976,
      },
    ],
  },
  {
    id: "lb-to-buendia",
    name: "Los Baños → Buendia (LRT Gil Puyat)",
    description:
      "Air-conditioned provincial buses (DLTB and others) from Los Baños toward Buendia (Sen. Gil Puyat Ave., Pasay, near LRT-1 Gil Puyat). Board at Olivarez Plaza/College; via Calamba, SM Calamba, then SLEX to Buendia/Taft. Fares shown are the DLTB dedicated-service figures; verify against the current LTFRB matrix.",
    directionNote: "One-way; pair of the reverse route.",
    color: "#1565C0",
    fareRegular: 165,
    fareDiscounted: 132,
    stops: [
      {
        name: "Olivarez Plaza / College (Los Baños)",
        description: "Boarding near Caltex; terminal area",
        lat: 14.17926,
        lon: 121.23939,
      },
      {
        name: "Los Baños (Lalakay)",
        description: "Highway stop",
        lat: 14.1804,
        lon: 121.2143,
      },
      {
        name: "Calamba (Pansol/Bucal/Crossing)",
        description: "Resort belt and Crossing",
        lat: 14.1542,
        lon: 121.1979,
      },
      {
        name: "SM Calamba",
        description: "Major stop",
        lat: 14.20343,
        lon: 121.15511,
      },
      {
        name: "Buendia — Sen. Gil Puyat Ave. cor. Taft",
        description: "LRT Gil Puyat; terminus in Pasay",
        lat: 14.5541,
        lon: 120.9972,
      },
    ],
  },
  {
    id: "buendia-to-lb",
    name: "Buendia → Los Baños",
    description:
      "Reverse of the Los Baños–Buendia service. Sta. Cruz-bound DLTB/Jac Liner/LLI buses from Buendia (~4:00 AM–10:00 PM plus a midnight trip) via SLEX, SM Calamba, Pansol, arriving at Los Baños Crossing; transfer to a UP College jeep or walk ~15 min to the UP gate.",
    directionNote: "One-way; pair of the forward route.",
    color: "#1565C0",
    fareRegular: 165,
    fareDiscounted: 132,
    stops: [
      {
        name: "Buendia — Sen. Gil Puyat Ave. (LRT Gil Puyat)",
        description: "Terminal in Pasay",
        lat: 14.5541,
        lon: 120.9972,
      },
      {
        name: "SM Calamba",
        description: "Major stop",
        lat: 14.20343,
        lon: 121.15511,
      },
      {
        name: "Pansol, Calamba",
        description: "Resort belt",
        lat: 14.1542,
        lon: 121.1979,
      },
      {
        name: "Los Baños Crossing",
        description: "Transfer to UP College jeep",
        lat: 14.1796,
        lon: 121.2389,
      },
    ],
  },
  {
    id: "lb-to-san-pablo",
    name: "Los Baños → San Pablo",
    description:
      "Jeepney from Los Baños (board at Olivarez Plaza) toward San Pablo City, via Bay and Alaminos to San Pablo (terminal near the church/Jollibee). Fare is an estimate predating the 2026-03-19 LTFRB adjustment; verify before relying on it.",
    directionNote: "One-way.",
    color: "#EF6C00",
    fareRegular: 50,
    fareDiscounted: 40,
    stops: [
      {
        name: "Olivarez Plaza (Los Baños)",
        description: "Boarding area",
        lat: 14.17926,
        lon: 121.23939,
      },
      {
        name: "Bay (Poblacion)",
        description: "Highway town",
        lat: 14.1831,
        lon: 121.2868,
      },
      {
        name: "Alaminos",
        description: "Highway town",
        lat: 14.0638,
        lon: 121.2456,
      },
      {
        name: "San Pablo City (near cathedral/Jollibee)",
        description: "Terminus",
        lat: 14.0686,
        lon: 121.3253,
      },
    ],
  },
  {
    id: "lb-to-sta-cruz",
    name: "Los Baños → Sta. Cruz",
    description:
      "Sta. Cruz-bound bus/jeep from Los Baños (College/Olivarez) via the national highway through Bay, Victoria, Pila to Sta. Cruz (Pagsawitan terminal). Fare is an estimate predating the 2026-03-19 LTFRB adjustment; verify before relying on it.",
    directionNote: "One-way.",
    color: "#00838F",
    fareRegular: 50,
    fareDiscounted: 40,
    stops: [
      {
        name: "College / Olivarez Plaza (Los Baños)",
        description: "Boarding",
        lat: 14.17926,
        lon: 121.23939,
      },
      {
        name: "Bay (Poblacion)",
        description: "Highway town",
        lat: 14.1831,
        lon: 121.2868,
      },
      {
        name: "Victoria (highway)",
        description: "Highway town",
        lat: 14.2265,
        lon: 121.3315,
      },
      {
        name: "Pila (Poblacion)",
        description: "Highway town",
        lat: 14.2328,
        lon: 121.3612,
      },
      {
        name: "Sta. Cruz (Pagsawitan/terminal)",
        description: "Terminus",
        lat: 14.2738,
        lon: 121.4148,
      },
    ],
  },
  {
    id: "lb-to-calamba",
    name: "Los Baños → Calamba",
    description:
      "Jeepney from Los Baños (Olivarez/College) to Calamba, signboarded 'Calamba Crossing' or 'Calamba Bayan.' Serves SM Calamba, Calamba Crossing and Calamba Central Terminal via the national highway/Pansol. ~₱20 jeepney fare per commuter sources; verify against the current LTFRB matrix.",
    directionNote: "One-way.",
    color: "#C62828",
    fareRegular: 20,
    fareDiscounted: 16,
    stops: [
      {
        name: "Olivarez Plaza / College (Los Baños)",
        description: "Boarding",
        lat: 14.17926,
        lon: 121.23939,
      },
      {
        name: "Bagong Kalsada / Pansol",
        description: "Resort belt",
        lat: 14.1542,
        lon: 121.1979,
      },
      {
        name: "Calamba Crossing",
        description: "Highway junction",
        lat: 14.2001,
        lon: 121.1601,
      },
      {
        name: "SM Calamba / Calamba Central Terminal",
        description: "Terminus",
        lat: 14.20343,
        lon: 121.15511,
      },
    ],
  },
];

const client = new pg.Client({ connectionString });
await client.connect();

let added = 0;
for (const route of ROUTES) {
  const existing = await client.query(
    "SELECT id FROM jeepney_routes WHERE id = $1",
    [route.id],
  );
  if (existing.rows.length > 0) {
    console.log(`keep  ${route.id} (already present)`);
    continue;
  }
  console.log(
    `${DRY_RUN ? "would add" : "add"} ${route.id} (${route.stops.length} stops, ₱${route.fareRegular}/${route.fareDiscounted})`,
  );
  if (DRY_RUN) continue;
  await client.query(
    `INSERT INTO jeepney_routes (id, name, description, direction_note, color, fare_regular, fare_discounted, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
    [
      route.id,
      route.name,
      route.description,
      route.directionNote,
      route.color,
      route.fareRegular,
      route.fareDiscounted,
    ],
  );
  let sortOrder = 0;
  for (const stop of route.stops) {
    await client.query(
      `INSERT INTO jeepney_stops (route_id, name, description, lat, lon, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)`,
      [route.id, stop.name, stop.description, stop.lat, stop.lon, sortOrder++],
    );
  }
  added++;
}

if (!DRY_RUN && added > 0) {
  for (const table of ["jeepney_routes", "jeepney_stops"]) {
    await client.query(
      `UPDATE "update" SET sync_key = $2 WHERE table_name = $1`,
      [table, randomUUID()],
    );
  }
}

console.log(
  `${DRY_RUN ? "[dry-run] would add" : "Added"} ${added} route(s); ${added > 0 && !DRY_RUN ? "sync keys refreshed" : "no sync-key change"}`,
);
await client.end();
