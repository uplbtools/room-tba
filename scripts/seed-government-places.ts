/**
 * Seed off-campus government and community places into the `places` table.
 *
 * Usage:
 *   DATABASE_URL="..." bun run scripts/seed-government-places.ts
 *   DATABASE_URL="..." bun run scripts/seed-government-places.ts --dry-run
 *
 * Coordinates sourced from OpenStreetMap Nominatim (Aug 2026).
 * All entries use the `government` place category.
 */

import { config } from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { placesTable } from "@drizzle/schema";
import { eq } from "drizzle-orm";

config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

interface PlaceSeed {
  name: string;
  category: string;
  lat: number;
  lon: number;
  description: string;
  hours: string | null;
  websiteLink: string | null;
  facebookLink: string | null;
}

const GOVERNMENT_PLACES: PlaceSeed[] = [
  // ── Municipal hall ────────────────────────────────────────────────
  {
    name: "Los Baños Municipal Hall",
    category: "government",
    lat: 14.1767391,
    lon: 121.2220395,
    description:
      "Municipal government center of Los Baños, Laguna. Located along the National Highway in Barangay Timugan.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: "https://www.losbanos.gov.ph",
    facebookLink: "https://www.facebook.com/MunicipalityOfLosBanos",
  },

  // ── Barangay halls ────────────────────────────────────────────────
  {
    name: "Batong Malake Barangay Hall",
    category: "government",
    lat: 14.1715295,
    lon: 121.2418104,
    description:
      "Barangay hall of Batong Malake, the barangay adjacent to the main UPLB gate and commercial area.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: null,
    facebookLink: null,
  },
  {
    name: "Timugan Barangay Hall",
    category: "government",
    lat: 14.1793655,
    lon: 121.2245772,
    description:
      "Barangay hall of Timugan, along Pantua Extension near the National Highway.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: null,
    facebookLink: null,
  },
  {
    name: "Maahas Barangay Hall",
    category: "government",
    lat: 14.1764558,
    lon: 121.2566279,
    description:
      "Barangay hall of Maahas, along the National Highway east of UPLB campus.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: null,
    facebookLink: null,
  },
  {
    name: "Anos Barangay Hall",
    category: "government",
    lat: 14.1812791,
    lon: 121.2322517,
    description:
      "Barangay hall of Anos, along the National Highway near San Isidro Village.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: null,
    facebookLink: null,
  },
  {
    name: "Mayondon Barangay Hall",
    category: "government",
    lat: 14.1911502,
    lon: 121.236346,
    description:
      "Barangay hall of Mayondon, on B. A. Villanueva Street near the Mayondon Sports Complex.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: null,
    facebookLink: null,
  },

  // ── DOST offices ──────────────────────────────────────────────────
  {
    name: "DOST-PCAARRD",
    category: "government",
    lat: 14.1774374,
    lon: 121.2219597,
    description:
      "Philippine Council for Agriculture, Aquatic and Natural Resources Research and Development. Located at Paseo de Valmayor, Brgy. Timugan.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: "https://www.pcaarrd.dost.gov.ph",
    facebookLink: "https://www.facebook.com/dostpcaarrd",
  },
  {
    name: "DOST-FPRDI",
    category: "government",
    lat: 14.156754,
    lon: 121.2358104,
    description:
      "Forest Products Research and Development Institute. Located within the UPLB campus along Domingo M. Lantican Avenue.",
    hours: "Mon–Fri 8:00 AM – 5:00 PM",
    websiteLink: "https://www.fprdi.dost.gov.ph",
    facebookLink: "https://www.facebook.com/DOSTFPRDI",
  },
];

async function main() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log(
    dryRun ? "🔍 Dry run — no changes will be made" : "🌱 Seeding places...",
  );
  console.log(`   ${GOVERNMENT_PLACES.length} government/community places\n`);

  let inserted = 0;
  let skipped = 0;

  for (const place of GOVERNMENT_PLACES) {
    // Check if a place with the same name already exists
    const existing = await db
      .select({ id: placesTable.id })
      .from(placesTable)
      .where(eq(placesTable.name, place.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭️  skip (exists): ${place.name}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `  📌 would insert: ${place.name} (${place.lat}, ${place.lon})`,
      );
    } else {
      await db.insert(placesTable).values({
        name: place.name,
        category: place.category,
        lat: place.lat,
        lon: place.lon,
        description: place.description,
        hours: place.hours,
        websiteLink: place.websiteLink,
        facebookLink: place.facebookLink,
      });
      console.log(`  ✅ inserted: ${place.name}`);
    }
    inserted++;
  }

  console.log(
    `\n${dryRun ? "Would insert" : "Inserted"} ${inserted}, skipped ${skipped}.`,
  );

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
