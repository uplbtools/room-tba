/**
 * Read-only sweep for the three campus-data failure modes that reached users.
 *
 *   bun run audit:campus-data            # PROD_DATABASE_URL, else DATABASE_URL
 *   bun run audit:campus-data --limit 5  # trim each section, for a quick look
 *
 * Maintainer reports surfaced three distinct classes, and only the first had
 * ever been swept for:
 *   1. wrong building assignment  - rooms filed under the wrong building
 *      (the SDS case sent students to the veterinary building)
 *   2. wrong coordinates          - the Graduate School pin sat 159 m away, on
 *      Dioscoro L. Umali Hall, contradicting its own directions text (#886)
 *   3. missing entity             - the Office for Athletics and Sports
 *      Development did not exist in the data at all
 *
 * Detections 1-4 below cover 2 and 3 by cross-checking the prose the data
 * already carries against the stored pins; detection 5 tracks the class-1
 * backlog. Everything is reported, nothing is applied: inferred links are
 * printed as suggestions for a human to accept in the editor.
 *
 * READ-ONLY BY CONSTRUCTION, not by convention:
 *   - the session is set `TRANSACTION READ ONLY`, so the server rejects any
 *     write this script could ever be edited to attempt;
 *   - `read()` is the only function with access to the client, and it refuses
 *     any statement that is not a SELECT.
 * There is no drizzle insert/update/delete import anywhere in this file.
 */

import { config } from "dotenv";
import pg from "pg";
import {
  type AuditEntity,
  buildNameIndex,
  centroid,
  clusterByProximity,
  entityRef,
  nearestOf,
  parseDirectionsReferences,
  parseLocatedAt,
  resolveReference,
  spreadMeters,
} from "@lib/campus-audit";
import { distanceMeters } from "@lib/campus-route";

config({ path: ".env", quiet: true });

/**
 * Thresholds, calibrated against the 59 buildings / 53 places / 15 dorms / 362
 * organizations on the UPLB prod dataset rather than guessed. UPLB is ~2 km
 * across, and pins are single points on buildings that are themselves 30-80 m
 * long, so "adjacent" is never 0 m.
 */
const THRESHOLDS = {
  /**
   * "behind/beside/in front of X" while X's pin is further than this.
   * Calibration: of the resolved adjacency references on prod, the bulk sit
   * under 120 m and the distribution thins out past there; 150 m keeps the
   * long-building cases (Copeland Gym, CEAT complex) out of the report while
   * still catching the 159 m Graduate School error that started this.
   */
  adjacencyMax: 150,
  /**
   * A tenant linked by `building_id` should be inside its host's footprint.
   * That link is a hard assertion by an editor, so the bar is tight.
   */
  tenantMax: 80,
  /**
   * A tenant that only *mentions* its host in prose gets a much looser bar.
   * "Located at: Physical Sciences complex" is a soft claim about a complex,
   * not a survey, and at 80 m it reported every large cluster on campus.
   */
  describedTenantMax: 250,
  /** A building's own tenants agreeing on a spot this far from its pin. */
  pinSuspect: 120,
  /** ...and agreeing with each other to within this, so it is not just noise. */
  tenantCluster: 60,
  /** Unlinked tenant this close to a building: the link is inferable. */
  linkSuggest: 25,
  /** Distinct entities this close are one pin copied, not two measurements. */
  duplicateCoord: 3,
} as const;

const limitArg = process.argv.indexOf("--limit");
const LIMIT =
  limitArg > -1
    ? Number(process.argv[limitArg + 1] || "20")
    : Number.MAX_SAFE_INTEGER;

const connectionString =
  process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "Set PROD_DATABASE_URL (or DATABASE_URL) in .env. This script only reads.",
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString });

/**
 * The only database access in this file. Anything but a SELECT throws before
 * it reaches the connection, and the session is read-only besides.
 */
async function read<T>(sql: string): Promise<T[]> {
  if (!/^\s*select\b/i.test(sql)) {
    throw new Error(
      `audit-campus-data is read-only, refused: ${sql.slice(0, 60)}`,
    );
  }
  const result = await client.query(sql);
  return result.rows as T[];
}

const meters = (m: number) => `${Math.round(m)} m`;
const entityKey = (e: AuditEntity) => `${e.kind}#${e.id}`;

/**
 * NaN, not 0, for a null coordinate. `Number(null)` is 0, which is a real
 * point in the Gulf of Guinea 13,486 km away, and every unpinned org silently
 * became a finding until this existed.
 */
const coord = (value: unknown): number =>
  value === null || value === undefined ? Number.NaN : Number(value);

type Row = Record<string, unknown>;

type Tenant = AuditEntity & {
  buildingId: number | null;
  roomId: number | null;
  description: string | null;
};

type BuildingRow = AuditEntity & { directions: string };

/** A tenant plus the reason it is attributed to a host. */
type ClaimingTenant = Tenant & { via: string };

async function main(): Promise<void> {
  await client.connect();
  await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");

  const buildingRows = await read<Row>(
    "select id, building_name, lat, lon, coalesce(directions, '') as directions from buildings",
  );
  const orgRows = await read<Row>(
    "select id, name, building_id, room_id, lat, lon, description from organizations",
  );
  const placeRows = await read<Row>(
    "select id, name, lat, lon, description from places",
  );
  const dormRows = await read<Row>(
    "select id, dorm_name, short_name, lat, lon, description from dorms",
  );
  const roomRows = await read<Row>(
    "select id, room_code, building_id from rooms",
  );
  const buildingClassRows = await read<Row>(
    `select r.building_id, count(*)::int as classes
       from classes c join rooms r on r.id = c.room_id
      where r.building_id is not null
      group by r.building_id`,
  );
  const orphanRoomRows = await read<Row>(
    `select r.id, r.room_code, count(c.id)::int as classes
       from rooms r left join classes c on c.room_id = r.id
      where r.building_id is null
      group by r.id, r.room_code
      order by classes desc, r.room_code`,
  );

  const buildings: BuildingRow[] = buildingRows
    .filter((r) => r.lat !== null && r.lon !== null)
    .map((r) => ({
      kind: "building",
      id: Number(r.id),
      name: String(r.building_name),
      lat: Number(r.lat),
      lon: Number(r.lon),
      directions: String(r.directions),
    }));

  const orgs: Tenant[] = orgRows.map((r) => ({
    kind: "organization",
    id: Number(r.id),
    name: String(r.name),
    lat: coord(r.lat),
    lon: coord(r.lon),
    buildingId: r.building_id === null ? null : Number(r.building_id),
    roomId: r.room_id === null ? null : Number(r.room_id),
    description: r.description === null ? null : String(r.description),
  }));

  const places: Tenant[] = placeRows.map((r) => ({
    kind: "place",
    id: Number(r.id),
    name: String(r.name),
    lat: coord(r.lat),
    lon: coord(r.lon),
    buildingId: null,
    roomId: null,
    description: r.description === null ? null : String(r.description),
  }));

  const dorms: Tenant[] = dormRows.map((r) => ({
    kind: "dorm",
    id: Number(r.id),
    name: String(r.dorm_name),
    lat: coord(r.lat),
    lon: coord(r.lon),
    aliases: r.short_name ? [String(r.short_name)] : [],
    buildingId: null,
    roomId: null,
    description: r.description === null ? null : String(r.description),
  }));

  const pinned = (t: Tenant) =>
    Number.isFinite(t.lat) && Number.isFinite(t.lon);
  const tenants = [...orgs, ...places, ...dorms].filter(pinned);
  const allPinned: AuditEntity[] = [...buildings, ...tenants];
  const index = buildNameIndex(allPinned);

  const buildingById = new Map(buildings.map((b) => [b.id, b]));
  const roomBuilding = new Map(
    roomRows.map((r) => [
      Number(r.id),
      r.building_id === null ? null : Number(r.building_id),
    ]),
  );
  const classesByBuilding = new Map(
    buildingClassRows.map((r) => [Number(r.building_id), Number(r.classes)]),
  );
  const classCount = (buildingId: number | null | undefined) =>
    buildingId == null ? 0 : (classesByBuilding.get(buildingId) ?? 0);

  const out: string[] = [];
  const say = (line = "") => out.push(line);

  say("# Campus data audit");
  say();
  say(
    `Read-only sweep of ${buildings.length} buildings, ${orgs.length} organizations, ` +
      `${places.length} places, ${dorms.length} dorms, ${roomRows.length} rooms.`,
  );
  say();
  say(
    "Thresholds: " +
      Object.entries(THRESHOLDS)
        .map(([k, v]) => `\`${k}\`=${v} m`)
        .join(", ") +
      ".",
  );

  // ---------------------------------------------------------------- 1
  // Pin contradicts its own directions. Buildings are the only table with
  // both a directions field and coordinates; rooms have directions but
  // inherit their building's pin, so they are covered by detection 5 instead.
  const contradictions: {
    building: BuildingRow;
    relation: string;
    phrase: string;
    nearest: { entity: AuditEntity; meters: number };
    candidates: AuditEntity[];
    classes: number;
  }[] = [];

  for (const building of buildings) {
    for (const ref of parseDirectionsReferences(building.directions)) {
      const matches = resolveReference(ref.phrase, index, building);
      if (matches.length === 0) continue;
      const candidates = matches.map((m) => m.entity);
      // Nearest candidate, so an ambiguous name never invents a contradiction.
      const nearest = nearestOf(building, candidates);
      if (!nearest || nearest.meters <= THRESHOLDS.adjacencyMax) continue;
      contradictions.push({
        building,
        relation: ref.relation,
        phrase: ref.phrase,
        nearest,
        candidates,
        classes: classCount(building.id),
      });
    }
  }
  contradictions.sort(
    (a, b) => b.classes - a.classes || b.nearest.meters - a.nearest.meters,
  );

  say();
  say(`## 1. Pin contradicts its own directions (${contradictions.length})`);
  say();
  say(
    "The entity's `directions` text says it touches something, and that something's pin is far away. " +
      "This is the class that #886 (Graduate School Building) belongs to.",
  );
  say();
  for (const c of contradictions.slice(0, LIMIT)) {
    say(
      `- **${entityRef(c.building)}** - ${meters(c.nearest.meters)} from ${entityRef(c.nearest.entity)}, ` +
        `which its own directions say it is *${c.relation}*. ${c.classes} classes affected.`,
    );
    say(`  - pin: \`${c.building.lat}, ${c.building.lon}\``);
    say(
      `  - directions: "${c.building.directions.replace(/\s+/g, " ").trim()}"`,
    );
    say(`  - reference read as: *${c.relation}* "${c.phrase}"`);
    if (c.candidates.length > 1) {
      say(
        `  - name matched ${c.candidates.length} entities; nearest one used: ${c.candidates.map(entityRef).join("; ")}`,
      );
    }
  }

  // ---------------------------------------------------------------- 2
  // Tenants scattered from the building they claim.
  type Scatter = {
    tenant: Tenant;
    host: AuditEntity;
    meters: number;
    via: string;
    classes: number;
  };
  const scattered: Scatter[] = [];
  /** host key -> tenants that claim it, for the inverse check below. */
  const tenantsByHost = new Map<string, ClaimingTenant[]>();

  for (const tenant of tenants) {
    let host: AuditEntity | null = null;
    let via = "";
    let linked = false;

    if (tenant.buildingId != null) {
      host = buildingById.get(tenant.buildingId) ?? null;
      if (host) {
        via = `building_id = ${tenant.buildingId}`;
        linked = true;
      }
    }
    // Every entity the prose could be naming. 2a below judges the tenant
    // against the *nearest* of these, so an ambiguous name never invents a
    // contradiction; the inverse check registers all of them, so a building
    // still hears from a tenant whose wording also fits its resident org.
    let claimed: AuditEntity[] = host ? [host] : [];
    if (!host) {
      const locatedAt = parseLocatedAt(tenant.description);
      if (locatedAt) {
        claimed = resolveReference(locatedAt, index, tenant).map(
          (m) => m.entity,
        );
        const nearest = nearestOf(tenant, claimed);
        if (nearest) {
          host = nearest.entity;
          via = `description "Located at: ${locatedAt}"`;
        }
      }
    }
    if (!host) continue;

    for (const candidate of claimed) {
      const key = entityKey(candidate);
      tenantsByHost.set(key, [
        ...(tenantsByHost.get(key) ?? []),
        { ...tenant, via },
      ]);
    }

    const away = distanceMeters(tenant, host);
    const bar = linked ? THRESHOLDS.tenantMax : THRESHOLDS.describedTenantMax;
    if (away > bar) {
      scattered.push({
        tenant,
        host,
        meters: away,
        via,
        classes: host.kind === "building" ? classCount(host.id) : 0,
      });
    }
  }
  scattered.sort((a, b) => b.classes - a.classes || b.meters - a.meters);

  say();
  say(
    `## 2a. Tenants scattered from the building they name (${scattered.length})`,
  );
  say();
  say(
    "An office/org/place whose own record names a host, but whose pin sits far from that host's pin. " +
      "Either the tenant pin or the host pin is wrong; both are user-visible.",
  );
  say();
  for (const s of scattered.slice(0, LIMIT)) {
    say(
      `- **${entityRef(s.tenant)}** - ${meters(s.meters)} from its host ${entityRef(s.host)}` +
        `${s.classes ? `, ${s.classes} classes in that building` : ""}.`,
    );
    say(`  - tenant pin: \`${s.tenant.lat}, ${s.tenant.lon}\``);
    say(`  - host pin: \`${s.host.lat}, ${s.host.lon}\``);
    say(`  - linked by: ${s.via}`);
  }

  // The inverse: a building whose known tenants agree on somewhere that is not
  // the building's own pin. This is what would have caught #886 automatically.
  const suspectPins: {
    building: BuildingRow;
    tenants: ClaimingTenant[];
    meters: number;
    spread: number;
    classes: number;
  }[] = [];

  for (const building of buildings) {
    const claimed = tenantsByHost.get(`building#${building.id}`) ?? [];
    if (claimed.length < 2) continue;
    // The largest group of tenants that agree with *each other*, rather than
    // all of them: one correctly-placed tenant must not mask the fact that
    // three others agree on somewhere else entirely.
    const agreeing = clusterByProximity(claimed, THRESHOLDS.tenantCluster).sort(
      (a, b) => b.length - a.length,
    )[0];
    if (!agreeing || agreeing.length < 2) continue;
    const away = distanceMeters(building, centroid(agreeing));
    if (away <= THRESHOLDS.pinSuspect) continue;
    suspectPins.push({
      building,
      tenants: agreeing,
      meters: away,
      spread: spreadMeters(agreeing),
      classes: classCount(building.id),
    });
  }
  suspectPins.sort((a, b) => b.classes - a.classes || b.meters - a.meters);

  say();
  say(
    `## 2b. Building pin contradicted by its own tenants (${suspectPins.length})`,
  );
  say();
  say(
    "Two or more tenants of the same building agree on a spot (within " +
      `\`tenantCluster\`=${THRESHOLDS.tenantCluster} m of each other) that is more than ` +
      `\`pinSuspect\`=${THRESHOLDS.pinSuspect} m from the building's own pin. The building pin is the odd one out.`,
  );
  say();
  for (const s of suspectPins.slice(0, LIMIT)) {
    const c = centroid(s.tenants);
    say(
      `- **${entityRef(s.building)}** - ${s.tenants.length} tenants cluster ${meters(s.meters)} away ` +
        `(they agree to within ${meters(s.spread)}). ${s.classes} classes affected.`,
    );
    say(`  - building pin: \`${s.building.lat}, ${s.building.lon}\``);
    say(`  - tenant centroid: \`${c.lat.toFixed(7)}, ${c.lon.toFixed(7)}\``);
    for (const t of s.tenants) {
      say(`  - ${entityRef(t)} @ \`${t.lat}, ${t.lon}\` via ${t.via}`);
    }
  }

  // ---------------------------------------------------------------- 3
  // Unlinked tenants sitting on top of a building.
  const unlinked: {
    org: Tenant;
    building: BuildingRow;
    meters: number;
    via: string;
  }[] = [];

  for (const org of orgs) {
    if (org.buildingId != null) continue;
    if (org.roomId != null) {
      const fromRoom = roomBuilding.get(org.roomId);
      if (fromRoom != null) {
        const building = buildingById.get(fromRoom);
        if (building) {
          unlinked.push({
            org,
            building,
            meters: pinned(org) ? distanceMeters(org, building) : 0,
            via: `room_id = ${org.roomId} -> rooms.building_id = ${fromRoom}`,
          });
          continue;
        }
      }
    }
    if (!pinned(org)) continue;
    const nearest = nearestOf(org, buildings);
    if (!nearest || nearest.meters > THRESHOLDS.linkSuggest) continue;
    unlinked.push({
      org,
      building: nearest.entity as BuildingRow,
      meters: nearest.meters,
      via: `pin sits ${meters(nearest.meters)} from the building`,
    });
  }
  unlinked.sort((a, b) => a.meters - b.meters);

  say();
  say(
    `## 3. Unlinked tenants whose building is inferable (${unlinked.length})`,
  );
  say();
  say(
    "`building_id` is null but the pin sits within " +
      `\`linkSuggest\`=${THRESHOLDS.linkSuggest} m of a building (or a linked room already names one). ` +
      "**Suggestions only, nothing was applied.**",
  );
  say();
  for (const u of unlinked.slice(0, LIMIT)) {
    say(
      `- **${entityRef(u.org)}** -> suggest \`building_id = ${u.building.id}\` (${u.building.name}); ${u.via}.`,
    );
  }

  // ---------------------------------------------------------------- 4
  // Near-identical coordinates: one pin copied from another.
  const clusters = clusterByProximity(allPinned, THRESHOLDS.duplicateCoord);
  /** A tenant sitting exactly on its own host is correct data, not a copy. */
  const hostsOf = new Map<string, Set<string>>();
  for (const [key, claims] of tenantsByHost) {
    for (const claim of claims) {
      const claimant = entityKey(claim);
      hostsOf.set(claimant, (hostsOf.get(claimant) ?? new Set()).add(key));
    }
  }
  /**
   * Explained when one entity accounts for the whole cluster: every other
   * member claims it as their host. The six vice-chancellor offices stacked on
   * B.M. Gonzalez Hall are co-tenancy, not a copied pin, and the hall itself
   * is a member of that cluster.
   */
  const explains = (members: AuditEntity[], anchor: string) =>
    members.every(
      (m) => entityKey(m) === anchor || hostsOf.get(entityKey(m))?.has(anchor),
    );
  const ranked = clusters
    .map((members) => ({
      members,
      expected: members.some((m) => explains(members, entityKey(m))),
    }))
    .sort(
      (a, b) =>
        Number(a.expected) - Number(b.expected) ||
        b.members.length - a.members.length,
    );
  const unexpected = ranked.filter((r) => !r.expected);

  say();
  say(
    `## 4. Entities sharing near-identical coordinates (${clusters.length} clusters, ${unexpected.length} unexplained)`,
  );
  say();
  say(
    `Distinct entities within \`duplicateCoord\`=${THRESHOLDS.duplicateCoord} m of each other. ` +
      "Co-tenants of one host legitimately share a pin, so clusters where every member claims the same host are marked *expected*; " +
      "the rest usually mean one pin was copied from another.",
  );
  say();
  for (const cluster of ranked.slice(0, LIMIT)) {
    const tag = cluster.expected ? "expected co-tenancy" : "**unexplained**";
    say(
      `- ${tag}: ${cluster.members.length} entities at \`${cluster.members[0].lat}, ${cluster.members[0].lon}\` (spread ${meters(spreadMeters(cluster.members))})`,
    );
    for (const m of cluster.members) {
      const hosts = [...(hostsOf.get(entityKey(m)) ?? [])];
      say(
        `  - ${entityRef(m)}${hosts.length ? ` (claims ${hosts.join(", ")})` : ""}`,
      );
    }
  }

  // ---------------------------------------------------------------- 5
  // Rooms that hold classes but no building: the class-1 backlog.
  const orphans = orphanRoomRows.map((r) => ({
    id: Number(r.id),
    code: String(r.room_code),
    classes: Number(r.classes),
  }));
  const withClasses = orphans.filter((r) => r.classes > 0);
  const orphanClassRows = withClasses.reduce((s, r) => s + r.classes, 0);

  say();
  say(`## 5. Rooms with classes but no building (${withClasses.length})`);
  say();
  say(
    `${withClasses.length} of ${orphans.length} building-less rooms hold ${orphanClassRows} class rows. ` +
      "A student searching these gets a schedule with no place to go. " +
      "The earlier sweep counted 61; track this number down.",
  );
  say();
  for (const r of withClasses.slice(0, LIMIT)) {
    say(`- \`${r.code}\` (rooms#${r.id}) - ${r.classes} classes`);
  }

  say();
  say("---");
  say();
  say("### Headline counts");
  say();
  say(`| Detection | Findings |`);
  say(`| --- | --- |`);
  say(`| 1. Pin contradicts its own directions | ${contradictions.length} |`);
  say(`| 2a. Tenants scattered from their building | ${scattered.length} |`);
  say(
    `| 2b. Building pin contradicted by its tenants | ${suspectPins.length} |`,
  );
  say(`| 3. Unlinked tenants (suggestions) | ${unlinked.length} |`);
  say(`| 4. Unexplained coordinate clusters | ${unexpected.length} |`);
  say(`| 5. Rooms with classes but no building | ${withClasses.length} |`);

  console.log(out.join("\n"));
}

try {
  await main();
} finally {
  await client.end();
}
