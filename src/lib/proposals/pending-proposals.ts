import type { StoredProposalRef } from "./client";

const OPEN_STATUSES = new Set(["pending", "needs_changes"]);

export function isOpenProposalStatus(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

export type PendingProposalRow = StoredProposalRef & {
  entityLabel: string;
  adminNote?: string | null;
};

export function formatProposalStatusLabel(status: string): string {
  return status.replaceAll("_", " ");
}
