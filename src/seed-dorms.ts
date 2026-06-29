// Legacy export/seed script only — uses bun:sqlite for local data prep.
// Not part of the runtime app; production uses Supabase Postgres + Drizzle.

// src/seed-dorms.ts

import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { dormsTable } from "@drizzle/schema";

const client = new Database("data/info.db");
const db = drizzle({ client });

const dorms = [
  {
    dorm_name: "Men's Residence Hall",
    short_name: "MRH",
    lat: 14.1611408,
    lon: 121.2404668,
    gender: "male",
    capacity: null,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Study area",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/139810607",
    description:
      "A male-exclusive residence hall located along Waling-Waling Street in the main campus area. Managed by the Office of Student Housing under the OVCSA.",
  },
  {
    dorm_name: "Women's Residence Hall",
    short_name: "WRH",
    lat: 14.1621023,
    lon: 121.2402602,
    gender: "female",
    capacity: null,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Study area",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/96322507",
    description:
      "A female-exclusive residence hall located along Waling-Waling Street in the main campus area.",
  },
  {
    dorm_name: "VetMed Residence Hall",
    short_name: "VMRH",
    lat: 14.160671,
    lon: 121.2401222,
    gender: "female",
    capacity: 378,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/96323118",
    description:
      "A female-exclusive residence hall located near the College of Veterinary Medicine, along Getulio B. Viado Street.",
  },
  {
    dorm_name: "New Dormitory Residence Hall",
    short_name: "New Dorm",
    lat: 14.1556481,
    lon: 121.2409975,
    gender: "female",
    capacity: 300,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/54603534",
    description:
      "A female-exclusive residence hall with recently rehabilitated third floor facilities, near the VetMed area.",
  },
  {
    dorm_name: "International House Residence Hall",
    short_name: "IH",
    lat: 14.1635129,
    lon: 121.23913,
    gender: "coed",
    capacity: null,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Transient accommodations",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/37331964",
    description:
      "A coed residence hall along Jose B. Juliano Avenue. Historically prioritizes graduate and international students; also offers transient accommodations.",
  },
  {
    dorm_name: "ATI-NTC Residence Hall",
    short_name: "ATI-NTC",
    lat: 14.1562751,
    lon: 121.2413868,
    gender: "male",
    capacity: 122,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/118883281",
    description:
      "A male-exclusive residence hall located in the lower campus area (Batong Malake). Named after the Agricultural Training Institute - National Training Center.",
  },
  {
    dorm_name: "Forestry Residence Hall",
    short_name: "FRH",
    lat: 14.1525521,
    lon: 121.2348842,
    gender: "female",
    capacity: null,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/96698725",
    description:
      "A female-exclusive residence hall located on Felix O. Chinte Sr. Street in the upper campus, near the College of Forestry and Natural Resources (CFNR).",
  },
  {
    dorm_name: "New Forestry Residence Hall",
    short_name: "NFRH",
    lat: 14.1521024,
    lon: 121.2343802,
    gender: "male",
    capacity: null,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/relation/1954827",
    description:
      "A male-exclusive residence hall on Makiling Road in the upper campus, near CFNR.",
  },
  {
    dorm_name: "Makiling Residence Hall",
    short_name: "MAREHA",
    lat: 14.1517194,
    lon: 121.2351275,
    gender: "female",
    capacity: null,
    managing_office: "Office of Student Housing (OSH)",
    contact_email: "osh.uplb@up.edu.ph",
    amenities: JSON.stringify([
      "Shared rooms",
      "Laundry facilities",
      "Kitchen facilities",
      "MAREHA Learning Hub",
      "Bed with mattress",
      "Study table & chair",
      "Locker",
    ]),
    osm_link: "https://www.openstreetmap.org/way/96698729",
    description:
      "A female-exclusive residence hall on Felix O. Chinte Sr. Street in the upper campus. Features the MAREHA Learning Hub, a co-working and study space inaugurated in 2024.",
  },
];

console.log("Seeding dorms table...");

// Create the table if it doesn't exist
client.run(`CREATE TABLE IF NOT EXISTS dorms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dorm_name TEXT NOT NULL,
  short_name TEXT,
  lat REAL,
  lon REAL,
  gender TEXT NOT NULL,
  capacity INTEGER,
  managing_office TEXT,
  contact_email TEXT,
  amenities TEXT,
  osm_link TEXT,
  description TEXT
)`);

await db.insert(dormsTable).values(dorms);

console.log(`Seeded ${dorms.length} dorms successfully!`);
console.log(await db.select().from(dormsTable));
