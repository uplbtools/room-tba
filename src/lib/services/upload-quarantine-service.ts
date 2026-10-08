import { inArray } from "drizzle-orm";
import { R2_PUBLIC_URL } from "astro:env/server";
import { editProposalsTable } from "@drizzle/schema";
import { db } from "@lib/db";
import {
  deleteR2Objects,
  isQuarantineKey,
  isR2Configured,
  keyFromPublicUrl,
  listQuarantineObjects,
  staleQuarantineKeys,
} from "@lib/r2-upload";

export type QuarantineCleanupResult = {
  skipped: "unconfigured" | null;
  scanned: number;
  deleted: number;
};

/** Quarantine keys still used by an open (pending / needs changes) proposal. */
async function referencedQuarantineKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ patch: editProposalsTable.proposedPatch })
    .from(editProposalsTable)
    .where(
      inArray(editProposalsTable.status, ["pending", "needs_changes"] as const),
    );
  const keys = new Set<string>();
  for (const row of rows) {
    const { imageUrl } = (row.patch ?? {}) as Record<string, unknown>;
    if (typeof imageUrl !== "string") continue;
    const key = keyFromPublicUrl(imageUrl, R2_PUBLIC_URL);
    if (isQuarantineKey(key)) keys.add(key);
  }
  return keys;
}

/**
 * Daily sweep (from the proposal-digest cron): delete quarantine uploads older
 * than 7 days that no open proposal references. Approved photos were already
 * copied out; rejected, withdrawn and abandoned ones go here.
 */
export async function cleanupQuarantinedUploads(
  now = Date.now(),
): Promise<QuarantineCleanupResult> {
  if (!isR2Configured()) {
    return { skipped: "unconfigured", scanned: 0, deleted: 0 };
  }
  const [objects, referenced] = await Promise.all([
    listQuarantineObjects(),
    referencedQuarantineKeys(),
  ]);
  const stale = staleQuarantineKeys(objects, referenced, now);
  const deleted = await deleteR2Objects(stale);
  return { skipped: null, scanned: objects.length, deleted };
}
