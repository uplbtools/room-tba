/**
 * Audit trail for bulk / maintenance data operations.
 *
 * Direct-to-database corrections (merge scripts, one-off SQL, import fixups)
 * bypass the app's editor write path, so they leave no `editor_history` row
 * and an entity's history silently claims nothing happened. This writes the
 * same row shape the app writes (`recordEditorHistory` in `admin-service.ts`)
 * for work that ran outside it.
 *
 * Scripts cannot import `@lib/db` — it reads `astro:env/server`, which only
 * exists inside Astro — so the caller passes its own Drizzle instance.
 *
 * Idempotency: the operation's `opKey` is stamped into the summary as
 * `[bulk:<opKey>] <reason>`. Re-running skips any (entityType, entityId,
 * opKey) already present, so a half-finished backfill is safe to resume.
 */

import { like } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { editorHistoryTable } from "@drizzle/schema";

/** Actor label for rows written by a maintenance script rather than a person. */
export const BULK_ACTOR = "maintenance-script";

const DEFAULT_ACTION = "bulk-update";
const SUMMARY_PREFIX = "[bulk:";
/** `]` is excluded so the prefix parses back out of the summary unambiguously. */
const OP_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const OP_KEY_FROM_SUMMARY = /^\[bulk:([^\]]+)\]/;

// Column limits from `editor_history` in drizzle/schema.ts.
const MAX_ENTITY_TYPE = 32;
const MAX_ACTION = 32;
const MAX_ACTOR = 100;

export type BulkOperation = {
  /** Stable slug for this operation; the idempotency key. */
  opKey: string;
  entityType: string;
  /** The affected row's id, or `0` when the operation spans rows whose ids are not recoverable. */
  entityId: number;
  /** Defaults to `bulk-update`; use `merge`, `delete`, `create`… when it fits. */
  action?: string;
  before?: unknown;
  after?: unknown;
  /** Free text: why this ran. Stored in the summary after the op key. */
  reason: string;
  versionBefore?: number | null;
  versionAfter?: number | null;
};

export type BulkHistoryRow = typeof editorHistoryTable.$inferInsert;

type SeenRow = {
  entityType: string;
  entityId: number;
  summary: string | null;
};

export function bulkSummary(opKey: string, reason: string): string {
  return `${SUMMARY_PREFIX}${opKey}] ${reason}`;
}

/** Identity of a bulk row: same entity + same operation = already recorded. */
export function bulkRowKey(row: SeenRow): string {
  const opKey = row.summary?.match(OP_KEY_FROM_SUMMARY)?.[1] ?? "";
  return `${row.entityType}:${row.entityId}:${opKey}`;
}

function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`bulk-history: ${message}`);
}

/** Validate one operation and render it as an `editor_history` insert. */
export function toHistoryRow(
  op: BulkOperation,
  actor: string = BULK_ACTOR,
): BulkHistoryRow {
  assert(
    OP_KEY_PATTERN.test(op.opKey ?? ""),
    `opKey must match ${OP_KEY_PATTERN} (got ${JSON.stringify(op.opKey)})`,
  );
  assert(
    typeof op.entityType === "string" &&
      op.entityType.length > 0 &&
      op.entityType.length <= MAX_ENTITY_TYPE,
    `entityType must be 1-${MAX_ENTITY_TYPE} chars (op ${op.opKey})`,
  );
  assert(
    Number.isInteger(op.entityId) && op.entityId >= 0,
    `entityId must be a non-negative integer (op ${op.opKey})`,
  );
  assert(
    typeof op.reason === "string" && op.reason.trim().length > 0,
    `reason is required (op ${op.opKey})`,
  );
  const action = op.action ?? DEFAULT_ACTION;
  assert(
    action.length > 0 && action.length <= MAX_ACTION,
    `action must be 1-${MAX_ACTION} chars (op ${op.opKey})`,
  );
  assert(
    actor.length > 0 && actor.length <= MAX_ACTOR,
    `actor must be 1-${MAX_ACTOR} chars (op ${op.opKey})`,
  );

  return {
    entityType: op.entityType,
    entityId: op.entityId,
    action,
    before: op.before ?? null,
    after: op.after ?? null,
    versionBefore: op.versionBefore ?? null,
    versionAfter: op.versionAfter ?? null,
    editedBy: actor,
    summary: bulkSummary(op.opKey, op.reason.trim()),
  };
}

/** Drop rows already in `seen`, and collapse duplicates inside the batch itself. */
export function pendingRows(
  rows: BulkHistoryRow[],
  seen: Iterable<SeenRow>,
): BulkHistoryRow[] {
  const keys = new Set<string>();
  for (const row of seen) keys.add(bulkRowKey(row));
  const pending: BulkHistoryRow[] = [];
  for (const row of rows) {
    const key = bulkRowKey({
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.summary ?? null,
    });
    if (keys.has(key)) continue;
    keys.add(key);
    pending.push(row);
  }
  return pending;
}

export type BulkHistoryResult = {
  rows: BulkHistoryRow[];
  pending: BulkHistoryRow[];
  skipped: number;
  written: number;
  dryRun: boolean;
};

/**
 * Record history for a batch of maintenance operations.
 *
 * Dry run by default — writing to the audit log of a production database is
 * an explicit act, so the caller must pass `dryRun: false`.
 */
export async function recordBulkHistory(
  db: NodePgDatabase,
  operations: BulkOperation[],
  options: { actor?: string; dryRun?: boolean } = {},
): Promise<BulkHistoryResult> {
  const { actor = BULK_ACTOR, dryRun = true } = options;
  const rows = operations.map((op) => toHistoryRow(op, actor));

  // ponytail: one unfiltered scan of the bulk rows. `editor_history` holds
  // thousands of rows and only bulk ones match the prefix; add an opKey
  // filter if a backfill ever gets big enough to notice.
  const seen = await db
    .select({
      entityType: editorHistoryTable.entityType,
      entityId: editorHistoryTable.entityId,
      summary: editorHistoryTable.summary,
    })
    .from(editorHistoryTable)
    .where(like(editorHistoryTable.summary, `${SUMMARY_PREFIX}%`));

  const pending = pendingRows(rows, seen);
  if (pending.length > 0 && !dryRun) {
    await db.insert(editorHistoryTable).values(pending);
  }
  return {
    rows,
    pending,
    skipped: rows.length - pending.length,
    written: dryRun ? 0 : pending.length,
    dryRun,
  };
}
