import { buildFieldDiffs, type FieldDiff } from "@lib/proposals/diff";

// Snapshot fields a visitor may see in the public edit history. Anything not
// listed here (contact emails and phones, image URLs, foreign keys, version,
// timestamps) never leaves the server, even when it changed.
export const PUBLIC_HISTORY_FIELDS: Record<string, readonly string[]> = {
  place: [
    "name",
    "category",
    "description",
    "hours",
    "websiteLink",
    "facebookLink",
    "lat",
    "lon",
  ],
  building: [
    "buildingName",
    "buildingType",
    "directions",
    "crFacilities",
    "lat",
    "lon",
  ],
  room: ["roomCode", "fullName", "directions", "category"],
  college: ["collegeName", "websiteLink"],
  division: ["divisionName", "websiteLink"],
  dorm: [
    "dormName",
    "shortName",
    "gender",
    "capacity",
    "managingOffice",
    "amenities",
    "description",
    "isUpManaged",
    "priceRange",
    "facebookLink",
    "lat",
    "lon",
  ],
  organization: [
    "name",
    "category",
    "description",
    "bio",
    "orgType",
    "establishedYear",
    "memberCount",
    "websiteLink",
    "facebookLink",
    "lat",
    "lon",
  ],
  event: [
    "title",
    "description",
    "category",
    "startsAt",
    "endsAt",
    "recurrence",
    "sourceUrl",
  ],
};

export type EntityAttributionRequest =
  | {
      ok: true;
      entityType: string;
      entityId: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function parseEntityAttributionRequest(
  params: URLSearchParams,
): EntityAttributionRequest {
  const entityType = params.get("entityType") ?? "";
  const entityId = Number(params.get("entityId"));

  if (!Object.hasOwn(PUBLIC_HISTORY_FIELDS, entityType)) {
    return { ok: false, status: 400, error: "Unsupported entity type." };
  }
  if (!Number.isInteger(entityId) || entityId < 1) {
    return { ok: false, status: 400, error: "Invalid entity ID." };
  }

  return { ok: true, entityType, entityId };
}

export const ROOM_TBA_TEAM = "Room TBA team";
export const ANONYMOUS_EDITOR = "A Room TBA editor";

/** Admin account facts needed to turn a stored actor into a public name. */
export type EditorAccount = {
  username: string;
  displayName: string | null;
  showInCredits: boolean;
};

/**
 * The name a visitor sees for a stored history actor. Scripts, imports, and
 * the shared "admin" login read as the team. Accounts that opted out of
 * credits, and anything shaped like an email address, stay anonymous.
 */
export function publicActorName(
  actor: string | null | undefined,
  summary: string | null | undefined,
  accounts: readonly EditorAccount[] = [],
): string | null {
  if (summary?.startsWith("[bulk:")) return ROOM_TBA_TEAM;
  const name = actor?.trim();
  if (!name) return null;
  if (/^admin$/i.test(name) || /(^|-)(seed|script|import)(-|$)/i.test(name)) {
    return ROOM_TBA_TEAM;
  }
  const account = accounts.find(
    (a) => a.username === name || a.displayName === name,
  );
  if (account && !account.showInCredits) return ANONYMOUS_EDITOR;
  const shown = account?.displayName?.trim() || name;
  return shown.includes("@") ? ANONYMOUS_EDITOR : shown;
}

/** Drizzle string timestamps carry no zone; the database runs in UTC. */
export function toIsoTimestamp(value: string): string {
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  // timestamptz text comes back as "+00": Date.parse needs "+00:00".
  if (/[+-]\d\d$/.test(iso)) return `${iso}:00`;
  return /(Z|[+-]\d\d(:?\d\d)?)$/.test(iso) ? iso : `${iso}Z`;
}

export type HistoryRow = {
  id: number;
  entityType: string;
  action: string;
  editedBy: string;
  summary: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

/** An approved proposal's credit, as stored in the contributions table. */
export type ProposalCredit = {
  entityType: string;
  submitterName: string | null;
  createdAt: string;
};

// Approval writes the history row first and the contribution right after
// (about 0.2s in production), so the credit lands just after the edit.
const CREDIT_WINDOW_MS = 10_000;

/**
 * The proposal submitter behind a history row, if the edit came from an
 * approved suggestion. Create proposals are stored as `create_<type>` with
 * entity id 0, so they are matched by type and time alone.
 */
export function creditForRow(
  row: HistoryRow,
  credits: readonly ProposalCredit[],
): string | null {
  const at = Date.parse(toIsoTimestamp(row.createdAt));
  const type =
    row.action === "create" ? `create_${row.entityType}` : row.entityType;
  let best: { name: string; delta: number } | null = null;
  for (const credit of credits) {
    if (credit.entityType !== type || !credit.submitterName) continue;
    const delta = Date.parse(toIsoTimestamp(credit.createdAt)) - at;
    if (delta < 0 || delta > CREDIT_WINDOW_MS) continue;
    if (!best || delta < best.delta) {
      best = { name: credit.submitterName, delta };
    }
  }
  return best?.name ?? null;
}

/** Public name for a history row: the credited submitter, else the actor. */
export function rowAuthor(
  row: HistoryRow,
  credits: readonly ProposalCredit[],
  accounts: readonly EditorAccount[],
): string | null {
  const credited = creditForRow(row, credits);
  return credited
    ? publicActorName(credited, null)
    : publicActorName(row.editedBy, row.summary, accounts);
}

export type PublicHistoryEntry = {
  id: number;
  action: string;
  by: string | null;
  createdAt: string;
  changes: FieldDiff[];
};

function pickPublic(
  snapshot: unknown,
  fields: readonly string[],
): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const source = snapshot as Record<string, unknown>;
  return Object.fromEntries(
    fields.filter((key) => key in source).map((key) => [key, source[key]]),
  );
}

// A trailing space trimmed off a paragraph is a real edit but reads as no
// change at all, so spacing-only diffs stay out of the public view.
function sameIgnoringSpacing(a: string | null, b: string | null): boolean {
  const squash = (value: string | null) =>
    (value ?? "").replace(/\s+/g, " ").trim();
  return squash(a) === squash(b);
}

/** The card fields a visitor can see change in this row. */
export function publicChanges(row: HistoryRow): FieldDiff[] {
  const fields = PUBLIC_HISTORY_FIELDS[row.entityType];
  if (!fields) return [];
  return buildFieldDiffs(
    pickPublic(row.before, fields),
    pickPublic(row.after, fields) ?? {},
  ).filter(
    (diff) =>
      (diff.before !== null || diff.after !== null) &&
      !(
        row.action !== "create" && sameIgnoringSpacing(diff.before, diff.after)
      ),
  );
}

/**
 * Newest-first rows from `offset` that change something visitors can see,
 * reading batches until `want` turn up, the history runs out, or `scanLimit`
 * raw rows have been read. `nextOffset` is the raw-row cursor to resume from,
 * null once the history is exhausted.
 */
export async function scanPublicRows<T extends HistoryRow>(
  fetchBatch: (offset: number) => Promise<T[]>,
  {
    offset,
    want,
    batchSize,
    scanLimit,
  }: { offset: number; want: number; batchSize: number; scanLimit: number },
): Promise<{ rows: T[]; nextOffset: number | null }> {
  const rows: T[] = [];
  let cursor = offset;
  while (cursor - offset < scanLimit) {
    const batch = await fetchBatch(cursor);
    for (const row of batch) {
      cursor += 1;
      if (publicChanges(row).length > 0) rows.push(row);
      if (rows.length >= want) return { rows, nextOffset: cursor };
    }
    if (batch.length < batchSize) return { rows, nextOffset: null };
  }
  return { rows, nextOffset: cursor };
}

/**
 * Whitelists one history row for the public history view. Returns null when
 * nothing visitors can see changed, so private-only edits drop out.
 */
export function toPublicHistoryEntry(
  row: HistoryRow,
  credits: readonly ProposalCredit[],
  accounts: readonly EditorAccount[],
): PublicHistoryEntry | null {
  const changes = publicChanges(row);
  if (changes.length === 0) return null;
  return {
    id: row.id,
    action: row.action,
    by: rowAuthor(row, credits, accounts),
    createdAt: toIsoTimestamp(row.createdAt),
    changes,
  };
}

export type EntityAttribution = {
  addedBy: string | null;
  addedAt: string | null;
  lastEditedBy: string | null;
  lastEditedAt: string | null;
};
