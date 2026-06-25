// src/seed-private-dorms.ts

import Database from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { dormsTable } from "../drizzle/schema";

const client = new Database("data/info.db");
const db = drizzle({ client });

// Add new columns to existing dorms table
try {
  client.run(
    `ALTER TABLE dorms ADD COLUMN is_up_managed INTEGER NOT NULL DEFAULT 1`,
  );
  console.log("Added is_up_managed column");
} catch (e: any) {
  if (e.message?.includes("duplicate column"))
    console.log("is_up_managed column already exists");
  else throw e;
}
try {
  client.run(`ALTER TABLE dorms ADD COLUMN price_range TEXT`);
  console.log("Added price_range column");
} catch (e: any) {
  if (e.message?.includes("duplicate column"))
    console.log("price_range column already exists");
  else throw e;
}
try {
  client.run(`ALTER TABLE dorms ADD COLUMN contact_phone TEXT`);
  console.log("Added contact_phone column");
} catch (e: any) {
  if (e.message?.includes("duplicate column"))
    console.log("contact_phone column already exists");
  else throw e;
}

// Update existing UP dorms with price range info
client.run(
  `UPDATE dorms SET price_range = '₱400-₱800/mo (SLAS bracket)' WHERE is_up_managed = 1`,
);
console.log("Updated UP dorm price ranges");

// Now seed the 10 non-UP dorms
const privateDorms = [
  {
    dorm_name: "Centtro Residences",
    short_name: "Centtro",
    lat: 14.1706661,
    lon: 121.2442563,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: "centtroresidences@gmail.com",
    contact_phone: "(049) 544-6649 / 0999-227-0957",
    amenities: JSON.stringify([
      "Air conditioning",
      "Private bathroom",
      "Flat-screen TV",
      "Refrigerator",
      "Free WiFi",
      "Fitness center",
      "Café",
      "Free parking",
      "Elevator",
      "24-hour front desk",
      "Room service",
    ]),
    osm_link: null,
    description:
      "A hotel-style residence at Centtro Mall, Lopez Ave., Batong Malake. Offers dormitory-style rooms up to presidential suites. Popular for transient stays and long-term student housing.",
    is_up_managed: false,
    price_range: "₱4,370-₱9,250/night (transient) — inquire for monthly",
  },
  {
    dorm_name: "Koru Residences",
    short_name: "Koru",
    lat: 14.1695,
    lon: 121.244,
    gender: "female",
    capacity: null,
    managing_office: null,
    contact_email: null,
    contact_phone: "0905-249-2202 / 0916-775-2931 / 0921-857-1143",
    amenities: JSON.stringify([
      "Female-exclusive",
      "24-hour staff",
      "CCTV",
      "RFID card access",
      "Fiber WiFi (100 Mbps)",
      "Weekly room servicing",
      "Common study areas",
      "Social areas",
      "Custom bed frames",
      "Built-in closets",
      "Study desks",
      "Individual utility meters",
    ]),
    osm_link: null,
    description:
      "A female-exclusive boutique dormitel on Lopez Avenue, Grove area. Features modern amenities including RFID security, fiber-optic internet, and weekly housekeeping.",
    is_up_managed: false,
    price_range: "Inquire for rates",
  },
  {
    dorm_name: "Arable Premier Residences",
    short_name: "Arable",
    lat: 14.1663791,
    lon: 121.2381389,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: "arablepremier@gmail.com",
    contact_phone: "0912-372-2936 / 0998-972-8559",
    amenities: JSON.stringify([
      "Air conditioning",
      "TV",
      "En suite bathroom with heater",
      "WiFi",
      "Microwave access",
      "Parking",
      "Cabinet",
      "Coffee table & chairs",
    ]),
    osm_link: null,
    description:
      "A private residence on Jose R. Velasco Ave., Batong Malake. Offers furnished rooms with en suite bathrooms. Near Sacay Grand Villas Gate and UPLB Main Library.",
    is_up_managed: false,
    price_range: "~₱1,250/night solo — inquire for monthly",
  },
  {
    dorm_name: "Westbrook Residences",
    short_name: "Westbrook",
    lat: 14.1676929,
    lon: 121.2388231,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: null,
    contact_phone: "(049) 536-4094 / 0998-550-3490 / 0917-500-6180",
    amenities: JSON.stringify([
      "Furnished rooms",
      "WiFi",
      "Parking",
      "Transient accommodations",
    ]),
    osm_link: "https://www.openstreetmap.org/way/572392470",
    description:
      "A private residence on Jose R. Velasco Ave. (Kanluran Road), Batong Malake. Offers both transient and long-term stays.",
    is_up_managed: false,
    price_range: "~₱1,000/day (transient) — inquire for monthly",
  },
  {
    dorm_name: "One Silangan Place",
    short_name: "Silangan",
    lat: 14.1672495,
    lon: 121.243932,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: null,
    contact_phone: null,
    amenities: JSON.stringify(["Furnished rooms", "Near campus gate"]),
    osm_link: null,
    description:
      "A private accommodation on Victoria M. Ela Avenue, Batong Malake. Near the UPLB campus gate.",
    is_up_managed: false,
    price_range: "Inquire for rates",
  },
  {
    dorm_name: "Scholar's Dormitory",
    short_name: "Scholar's",
    lat: 14.1600427,
    lon: 121.2405213,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: null,
    contact_phone: null,
    amenities: JSON.stringify([
      "Shared rooms",
      "Near Baker Memorial Hall",
      "Near University Housing Office",
    ]),
    osm_link: null,
    description:
      "A dormitory on Getulio B. Viado Street, near the Copeland area inside the campus. Located close to Baker Memorial Hall.",
    is_up_managed: false,
    price_range: "Inquire for rates",
  },
  {
    dorm_name: "Antonio's Boarding House",
    short_name: "Antonio's",
    lat: 14.17,
    lon: 121.2435,
    gender: "coed",
    capacity: null,
    managing_office: "Elvira Antonio c/o Ma. Carlyn Eusebio",
    contact_email: null,
    contact_phone: "(049) 536-3520",
    amenities: JSON.stringify([
      "Furnished rooms",
      "Bedspace available",
      "Apartment units",
    ]),
    osm_link: null,
    description:
      "A private boarding house offering bedspace and apartment units near Lopez Avenue. A long-standing housing option for UPLB students.",
    is_up_managed: false,
    price_range: "Inquire for rates",
  },
  {
    dorm_name: "Demarces Boarding Houses",
    short_name: "Demarces",
    lat: 14.1688,
    lon: 121.2425,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: null,
    contact_phone: null,
    amenities: JSON.stringify([
      "Multiple boarding houses",
      "Near campus",
      "Various price ranges",
    ]),
    osm_link: null,
    description:
      "Demarces is a well-known area/subdivision near UPLB with numerous private boarding houses catering to students. Walk around to find 'For Rent' signs.",
    is_up_managed: false,
    price_range: "~₱2,500-₱5,000/mo (varies by unit)",
  },
  {
    dorm_name: "Raymundo Area Boarding Houses",
    short_name: "Raymundo",
    lat: 14.1676533,
    lon: 121.241397,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: null,
    contact_phone: null,
    amenities: JSON.stringify([
      "Multiple boarding houses",
      "Near Raymundo Gate",
      "Food establishments nearby",
      "School supplies nearby",
      "Various price ranges",
    ]),
    osm_link: null,
    description:
      "The Raymundo Gate area is one of the most popular student housing hubs near UPLB. Features numerous private dorms, boarding houses, and apartments along with food and supply shops.",
    is_up_managed: false,
    price_range: "~₱2,500-₱5,000/mo (varies by unit)",
  },
  {
    dorm_name: "Catalan Compound Boarding Houses",
    short_name: "Catalan",
    lat: 14.168,
    lon: 121.2408,
    gender: "coed",
    capacity: null,
    managing_office: null,
    contact_email: null,
    contact_phone: null,
    amenities: JSON.stringify([
      "Multiple boarding houses",
      "Near campus",
      "Affordable options",
      "Various price ranges",
    ]),
    osm_link: null,
    description:
      "Catalan Compound is a popular area near UPLB with various affordable boarding house options for students. Often recommended for its proximity to the campus.",
    is_up_managed: false,
    price_range: "~₱2,000-₱4,000/mo (varies by unit)",
  },
];

console.log("Seeding private dorms...");
await db.insert(dormsTable).values(privateDorms);
console.log(`Seeded ${privateDorms.length} private dorms successfully!`);

// Verify
const allDorms = await db.select().from(dormsTable);
console.log(`Total dorms in database: ${allDorms.length}`);
console.log("UP-managed:", allDorms.filter((d) => d.is_up_managed).length);
console.log("Private:", allDorms.filter((d) => !d.is_up_managed).length);
