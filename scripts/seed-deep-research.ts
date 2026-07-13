/**
 * Apply the 2026-07 deep-research data-gap findings to the database:
 * room directions (verified wing/floor anchors), dorm capacities + phones,
 * division/college website links, and DTRI place hours/socials.
 *
 * Fill-only: a field is written only when it is currently NULL/empty, so
 * curated data is never clobbered. Each write bumps `version`, records an
 * `editor_history` row, and touched tables get their sync key refreshed.
 *
 * Usage:
 *   bun run scripts/seed-deep-research.ts --dry-run   # print planned writes
 *   DATABASE_URL=... bun run scripts/seed-deep-research.ts
 *
 * Sources: see exports/deep-research report (2026-07-14). Low-confidence
 * findings (enumerated room ranges, Dairy Bar FB page, Institute of Physics
 * site) are intentionally NOT applied.
 */

import { randomUUID } from "node:crypto";
import pg from "pg";
import { loadEnv } from "./load-env";

loadEnv();

const DRY_RUN = process.argv.includes("--dry-run");
const EDITED_BY = "deep-research-seed-2026-07";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Data from the research report. Ids match production rows and are verified
// against the row's name before writing.
// ---------------------------------------------------------------------------

const COLLEGE_WEBSITES: { id: number; nameLike: string; url: string }[] = [
  { id: 1, nameLike: "Agriculture and Food", url: "https://cafs.uplb.edu.ph" },
  { id: 2, nameLike: "Arts and Sciences", url: "https://cas.uplb.edu.ph" },
  {
    id: 3,
    nameLike: "Development Communication",
    url: "https://cdc.uplb.edu.ph",
  },
  {
    id: 4,
    nameLike: "Economics and Management",
    url: "https://cem.uplb.edu.ph",
  },
  { id: 5, nameLike: "Engineering", url: "https://ceat.uplb.edu.ph" },
  { id: 6, nameLike: "Forestry", url: "https://cfnr.uplb.edu.ph" },
  { id: 7, nameLike: "Human Ecology", url: "https://che.uplb.edu.ph" },
  { id: 8, nameLike: "Veterinary Medicine", url: "https://cvm.uplb.edu.ph" },
];

const DIVISION_WEBSITES: { id: number; nameLike: string; url: string }[] = [
  {
    id: 5,
    nameLike: "Agricultural and Biosystems Engineering",
    url: "https://iabe.uplb.edu.ph",
  },
  {
    id: 6,
    nameLike: "Basic Veterinary",
    url: "https://cvm.uplb.edu.ph/faculty-reps-and-staff/department-of-basic-veterinary-sciences/",
  },
  { id: 7, nameLike: "Chemical Engineering", url: "https://dche.uplb.edu.ph" },
  { id: 8, nameLike: "Civil Engineering", url: "https://dce.uplb.edu.ph" },
  {
    id: 9,
    nameLike: "Community and Environmental",
    url: "https://www.facebook.com/UPLBDCERP",
  },
  {
    id: 19,
    nameLike: "Human and Family Development",
    url: "https://www.facebook.com/UPLBDHFDS",
  },
  {
    id: 25,
    nameLike: "Social Development Services",
    url: "https://www.facebook.com/UPLBDSDS",
  },
  {
    id: 28,
    nameLike: "Veterinary Clinical",
    url: "https://cvm.uplb.edu.ph/faculty-reps-and-staff/department-of-veterinary-clinical-sciences/",
  },
  {
    id: 29,
    nameLike: "Veterinary Paraclinical",
    url: "https://cvm.uplb.edu.ph/faculty-reps-and-staff/department-of-veterinary-paraclinical-sciences/",
  },
  {
    id: 30,
    nameLike: "Institute of Agricultural and Biosystems",
    url: "https://iabe.uplb.edu.ph",
  },
  { id: 31, nameLike: "Animal Science", url: "https://ias.uplb.edu.ph" },
  { id: 33, nameLike: "Chemistry", url: "https://ic.cas.uplb.edu.ph" },
  { id: 34, nameLike: "Computer Science", url: "https://ics.uplb.edu.ph" },
  { id: 36, nameLike: "Crop Science", url: "https://icrops.uplb.edu.ph" },
  {
    id: 38,
    nameLike: "Human Nutrition and Food",
    url: "https://ihnf.uplb.edu.ph",
  },
  {
    id: 39,
    nameLike: "Mathematical Sciences and Physics",
    url: "https://imsp.cas.uplb.edu.ph",
  },
  { id: 42, nameLike: "Statistics", url: "https://instat.uplb.edu.ph" },
  // Second research pass (2026-07-14): each URL below was HTTP-checked live
  // before inclusion. Report-claimed URLs that were dead or mis-pointed are
  // deliberately excluded: DIE ied.ceat (dead), IBS ibs.cas (dead),
  // IFST ifst.cafs (301s to the ASI site), IWEP iwep.cafs (inferred, sibling
  // proved wrong). DHK/DME/DSS have no confirmed site.
  {
    id: 1,
    nameLike: "Agricultural Systems Institute",
    url: "https://cafs.uplb.edu.ph/asi/",
  },
  {
    id: 2,
    nameLike: "Agribusiness Management",
    url: "https://cem.uplb.edu.ph",
  },
  {
    id: 3,
    nameLike: "Agricultural Machinery and Power",
    url: "https://iabe.uplb.edu.ph",
  },
  {
    id: 4,
    nameLike: "Agricultural and Applied Economics",
    url: "https://cem.uplb.edu.ph",
  },
  {
    id: 10,
    nameLike: "Development Broadcasting",
    url: "https://cdc.uplb.edu.ph",
  },
  {
    id: 11,
    nameLike: "Development Journalism",
    url: "https://cdc.uplb.edu.ph",
  },
  {
    id: 12,
    nameLike: "Department of Economics",
    url: "https://cem.uplb.edu.ph",
  },
  {
    id: 13,
    nameLike: "Educational Communication",
    url: "https://cdc.uplb.edu.ph",
  },
  {
    id: 14,
    nameLike: "Electrical Engineering",
    url: "https://ceat.uplb.edu.ph",
  },
  { id: 15, nameLike: "Engineering Science", url: "https://des.uplb.edu.ph" },
  {
    id: 16,
    nameLike: "Forest Biological Sciences",
    url: "https://cfnr.uplb.edu.ph/fbs/",
  },
  {
    id: 17,
    nameLike: "Forest Products and Paper Science",
    url: "https://cfnr.uplb.edu.ph/fpps/",
  },
  { id: 20, nameLike: "Humanities", url: "https://dhum.uplb.edu.ph" },
  {
    id: 22,
    nameLike: "Land and Water Resources Engineering",
    url: "https://iabe.uplb.edu.ph",
  },
  {
    id: 24,
    nameLike: "Science Communication",
    url: "https://cdc.uplb.edu.ph",
  },
  {
    id: 26,
    nameLike: "Social Forestry and Forest Governance",
    url: "https://dsffg.cfnr.uplb.edu.ph",
  },
  {
    id: 35,
    nameLike: "Cooperatives and Bio-Enterprise",
    url: "https://cem.uplb.edu.ph",
  },
  { id: 40, nameLike: "Institute of Physics", url: "https://iop.uplb.edu.ph" },
  {
    id: 41,
    nameLike: "Renewable Natural Resources",
    url: "https://cfnr.uplb.edu.ph/irnr/",
  },
];

// Per-hall capacities from UPLB Perspective (Aug 2025); landlines from the
// OVCSA telephone directory; OSH mobile for halls without a direct landline.
const OSH_PHONE = "+63 999 221 1483";
const OSH_EMAIL = "osh.uplb@up.edu.ph";
const DORM_UPDATES: {
  id: number;
  nameLike: string;
  capacity?: number;
  phones?: string[];
}[] = [
  { id: 1, nameLike: "Men's", capacity: 544, phones: ["(049) 544-8344"] },
  { id: 2, nameLike: "Women's", capacity: 360, phones: [OSH_PHONE] },
  { id: 3, nameLike: "VetMed", capacity: 378, phones: [OSH_PHONE] },
  { id: 4, nameLike: "New Dormitory", phones: ["(049) 572-0494"] },
  { id: 5, nameLike: "International House", phones: [OSH_PHONE] },
  { id: 6, nameLike: "ATI-NTC", phones: ["(049) 572-0496"] },
  { id: 7, nameLike: "Forestry", capacity: 148, phones: [OSH_PHONE] },
  {
    id: 8,
    nameLike: "New Forestry",
    capacity: 160,
    phones: ["(049) 536-7103"],
  },
  { id: 9, nameLike: "Makiling", capacity: 112, phones: [OSH_PHONE] },
];

// Verified wing/floor anchors. Applied per building to rooms whose code
// matches the pattern AND whose directions are currently empty.
const ROOM_DIRECTIONS: {
  buildingId: number;
  buildingNameLike: string;
  pattern: RegExp;
  directions: string;
}[] = [
  // Physical Sciences Building (F.O. Santos Hall), building 35.
  {
    buildingId: 35,
    buildingNameLike: "Physical Sciences",
    pattern: /^PS C-1\d\d/i,
    directions:
      "First floor, Wing C of the Physical Sciences Building (F.O. Santos Hall). Enter through the main Wing C entrance facing the Oblation; odd- and even-numbered rooms alternate sides of the hallway.",
  },
  {
    buildingId: 35,
    buildingNameLike: "Physical Sciences",
    pattern: /^PS C-2\d\d/i,
    directions:
      "Second floor, Wing C of the Physical Sciences Building (F.O. Santos Hall), the same floor as the Physics Division office. Enter through the main Wing C entrance facing the Oblation and go up one flight.",
  },
  {
    buildingId: 35,
    buildingNameLike: "Physical Sciences",
    pattern: /^PS C-3\d\d/i,
    directions:
      "Third floor, Wing C of the Physical Sciences Building (F.O. Santos Hall), the same floor as the Institute of Statistics offices (C-315/C-318). Enter through the main Wing C entrance facing the Oblation and go up two flights.",
  },
  {
    buildingId: 35,
    buildingNameLike: "Physical Sciences",
    pattern: /^PS ANX-3\d\d/i,
    directions:
      "Third floor of the Physical Sciences annex wing (beside the twin lecture halls), which was raised to three storeys for computer laboratories.",
  },
  // CAS Annex 1 (NCAS), building 7.
  {
    buildingId: 7,
    buildingNameLike: "CAS Annex 1",
    pattern: /^CAS A1 3\d\d$/i,
    directions:
      "CAS Annex 1 (NCAS), 3rd floor — the same floor as the UPLB Interactive Learning Center. CAS Annex 1 is the tall building to the left of Oble, beside OUR.",
  },
  {
    buildingId: 7,
    buildingNameLike: "CAS Annex 1",
    pattern: /^CAS A1 4\d\d$/i,
    directions:
      "CAS Annex 1 (NCAS), 4th floor, which houses the biology laboratories. CAS Annex 1 is the tall building to the left of Oble, beside OUR.",
  },
  // CAS Main Building, building 6 (B = basement; matches B01-B09 rooms).
  {
    buildingId: 6,
    buildingNameLike: "CAS Main",
    pattern: /^CAS B\d\d$/i,
    directions:
      "In the basement of CAS Main Building. Take the stairs in front of the OCS kiosks.",
  },
  // Biological Sciences Building, building 4. Wing letter + first digit = floor.
  {
    buildingId: 4,
    buildingNameLike: "Biological Sciences",
    pattern: /^BS ([A-E])-(\d)\d\d/i,
    directions:
      "Biological Sciences Building, Wing {wing}, floor {floor}. The BS buildings are in front of CAS A1, to the left of SEARCA; odd- and even-numbered rooms alternate sides of the hallway.",
  },
  {
    buildingId: 4,
    buildingNameLike: "Biological Sciences",
    pattern: /^IBSLH ?2$|^IBSLH ?3$/i,
    directions:
      "At the front of the Biological Sciences Building, near Wing C — the twin main lecture halls flank the CPC Auditorium (CPCLH is the one near Wing A). In front of CAS A1.",
  },
  // New Math Building, building 31. First digit = floor.
  {
    buildingId: 31,
    buildingNameLike: "New Math",
    pattern: /^MB 1\d\d/i,
    directions:
      "Ground floor of the New Math Building, the 3-storey air-conditioned building on Luz U. Oñate Street (inaugurated September 2023).",
  },
  {
    buildingId: 31,
    buildingNameLike: "New Math",
    pattern: /^MB 3\d\d/i,
    directions:
      "Third floor of the New Math Building, the 3-storey air-conditioned building on Luz U. Oñate Street. The Math Clinic (MB 209) and IMS Director's Office are one floor below.",
  },
  // CEM Function Hall, building 12.
  {
    buildingId: 12,
    buildingNameLike: "CEM",
    pattern: /^CEM ?FH$|^CEM Function Hall$/i,
    directions:
      "Inside the DAAE (Department of Agricultural and Applied Economics) office area of the CEM complex; used as a CEM student learning hub.",
  },
  // Civil Engineering Building, building 10.
  {
    buildingId: 10,
    buildingNameLike: "Civil Engineering",
    pattern: /^CE 101$/i,
    directions:
      "Lecture room in the Civil Engineering Building, also known as Senen Miranda Hall.",
  },
];

// DTRI food POIs (Task 5). Matched by exact name; fill-only.
const PLACE_UPDATES: {
  nameLike: string;
  hours?: string;
  facebookLink?: string;
}[] = [
  {
    nameLike: "%DTRI%Farm Hub%",
    hours: "Mon-Fri 7:00am-5:00pm, Sat 7:00am-4:00pm",
    facebookLink: "https://www.facebook.com/DTRIFarmHub/",
  },
  {
    nameLike: "%Dairy Training and Research%",
    facebookLink: "https://www.facebook.com/UPLBDTRI/",
  },
  {
    nameLike: "%DTRI Farm Fresh%",
    facebookLink: "https://www.facebook.com/UPLBDTRIFarmFresh/",
  },
];

// ---------------------------------------------------------------------------

const client = new pg.Client({ connectionString });
await client.connect();

let writes = 0;
const touchedTables = new Set<string>();

async function recordHistory(
  entityType: string,
  entityId: number,
  summary: string,
  versionBefore: number | null,
) {
  await client.query(
    `INSERT INTO editor_history (entity_type, entity_id, action, version_before, version_after, edited_by, summary)
     VALUES ($1, $2, 'update', $3, $4, $5, $6)`,
    [
      entityType,
      entityId,
      versionBefore,
      versionBefore === null ? null : versionBefore + 1,
      EDITED_BY,
      summary,
    ],
  );
}

/** Fill one column on one row iff it is currently NULL/empty. */
async function fillField(opts: {
  table: string;
  entityType: string;
  id: number;
  guardSql: string; // extra WHERE guard (name sanity check)
  guardParams: unknown[];
  column: string;
  value: unknown;
  label: string;
}) {
  const { rows } = await client.query(
    `SELECT id, ${opts.column} AS current, version FROM ${opts.table}
     WHERE id = $1 AND ${opts.guardSql}`,
    [opts.id, ...opts.guardParams],
  );
  const row = rows[0];
  if (!row) {
    console.warn(`SKIP (guard failed): ${opts.label}`);
    return;
  }
  const current = row.current;
  const empty =
    current === null ||
    (typeof current === "string" && current.trim() === "") ||
    (Array.isArray(current) && current.length === 0);
  if (!empty) {
    console.log(`keep  ${opts.label} (already set)`);
    return;
  }
  console.log(`${DRY_RUN ? "would" : "write"} ${opts.label}`);
  if (DRY_RUN) return;
  await client.query(
    `UPDATE ${opts.table}
     SET ${opts.column} = $2, version = version + 1, updated_at = now()
     WHERE id = $1`,
    [opts.id, opts.value],
  );
  await recordHistory(
    opts.entityType,
    opts.id,
    `deep-research seed: set ${opts.column}`,
    typeof row.version === "number" ? row.version : null,
  );
  writes++;
  touchedTables.add(opts.table);
}

// Colleges + divisions
for (const c of COLLEGE_WEBSITES) {
  await fillField({
    table: "colleges",
    entityType: "college",
    id: c.id,
    guardSql: "college_name ILIKE '%' || $2 || '%'",
    guardParams: [c.nameLike],
    column: "website_link",
    value: c.url,
    label: `colleges#${c.id} (${c.nameLike}) website_link = ${c.url}`,
  });
}
for (const d of DIVISION_WEBSITES) {
  await fillField({
    table: "divisions",
    entityType: "division",
    id: d.id,
    guardSql: "division_name ILIKE '%' || $2 || '%'",
    guardParams: [d.nameLike],
    column: "website_link",
    value: d.url,
    label: `divisions#${d.id} (${d.nameLike}) website_link = ${d.url}`,
  });
}

// Dorms
for (const d of DORM_UPDATES) {
  if (d.capacity !== undefined) {
    await fillField({
      table: "dorms",
      entityType: "dorm",
      id: d.id,
      guardSql: "dorm_name ILIKE '%' || $2 || '%'",
      guardParams: [d.nameLike],
      column: "capacity",
      value: d.capacity,
      label: `dorms#${d.id} (${d.nameLike}) capacity = ${d.capacity}`,
    });
  }
  if (d.phones) {
    await fillField({
      table: "dorms",
      entityType: "dorm",
      id: d.id,
      guardSql: "dorm_name ILIKE '%' || $2 || '%'",
      guardParams: [d.nameLike],
      column: "contact_phone",
      value: d.phones,
      label: `dorms#${d.id} (${d.nameLike}) contact_phone = ${d.phones.join(", ")}`,
    });
  }
  await fillField({
    table: "dorms",
    entityType: "dorm",
    id: d.id,
    guardSql: "dorm_name ILIKE '%' || $2 || '%' AND is_up_managed = true",
    guardParams: [d.nameLike],
    column: "contact_email",
    value: OSH_EMAIL,
    label: `dorms#${d.id} (${d.nameLike}) contact_email = ${OSH_EMAIL}`,
  });
}

// Room directions
for (const rule of ROOM_DIRECTIONS) {
  const { rows } = await client.query(
    `SELECT r.id, r.room_code, r.version FROM rooms r
     JOIN buildings b ON b.id = r.building_id
     WHERE r.building_id = $1 AND b.building_name ILIKE '%' || $2 || '%'
       AND (r.directions IS NULL OR btrim(r.directions) = '')`,
    [rule.buildingId, rule.buildingNameLike],
  );
  for (const room of rows) {
    const m = rule.pattern.exec(room.room_code as string);
    if (!m) continue;
    // {wing}/{floor} placeholders come from the capture groups (wing letter,
    // first digit of the room number).
    const directions = rule.directions
      .replace("{wing}", (m[1] ?? "").toUpperCase())
      .replace("{floor}", m[2] === "1" ? "1 (ground)" : (m[2] ?? ""));
    console.log(
      `${DRY_RUN ? "would" : "write"} rooms#${room.id} ${room.room_code}: ${directions.slice(0, 60)}…`,
    );
    if (DRY_RUN) continue;
    await client.query(
      "UPDATE rooms SET directions = $2, version = version + 1, updated_at = now() WHERE id = $1",
      [room.id, directions],
    );
    await recordHistory(
      "room",
      room.id as number,
      "deep-research seed: set directions (wing/floor anchor)",
      typeof room.version === "number" ? room.version : null,
    );
    writes++;
    touchedTables.add("rooms");
  }
}

// Places
for (const p of PLACE_UPDATES) {
  const { rows } = await client.query(
    "SELECT id, name FROM places WHERE name ILIKE $1",
    [p.nameLike],
  );
  if (rows.length === 0) {
    console.warn(`SKIP (no place matches): ${p.nameLike}`);
    continue;
  }
  for (const place of rows) {
    if (p.hours) {
      await fillField({
        table: "places",
        entityType: "place",
        id: place.id,
        guardSql: "true",
        guardParams: [],
        column: "hours",
        value: p.hours,
        label: `places#${place.id} (${place.name}) hours`,
      });
    }
    if (p.facebookLink) {
      await fillField({
        table: "places",
        entityType: "place",
        id: place.id,
        guardSql: "true",
        guardParams: [],
        column: "facebook_link",
        value: p.facebookLink,
        label: `places#${place.id} (${place.name}) facebook_link`,
      });
    }
  }
}

// Refresh sync keys so clients re-sync the touched tables.
if (!DRY_RUN) {
  for (const table of touchedTables) {
    await client.query(
      `UPDATE "update" SET sync_key = $2 WHERE table_name = $1`,
      [table, randomUUID()],
    );
  }
}

console.log(
  `${DRY_RUN ? "[dry-run] planned" : "Applied"} ${writes} writes; sync keys refreshed for: ${[...touchedTables].join(", ") || "none"}`,
);
await client.end();
