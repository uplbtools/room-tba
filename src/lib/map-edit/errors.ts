import type { EventData } from "../types";
import type { EditableVersionedPosition } from "./types";

export class ClientEditConflictError extends Error {
  latest: EditableVersionedPosition | null;

  constructor(message: string, latest: EditableVersionedPosition | null) {
    super(message);
    this.name = "ClientEditConflictError";
    this.latest = latest;
  }
}

export class ClientEventConflictError extends Error {
  latest: EventData | null;

  constructor(message: string, latest: EventData | null) {
    super(message);
    this.name = "ClientEventConflictError";
    this.latest = latest;
  }
}

export function editErrorMessage(
  name: string,
  fallback: string,
  error: unknown,
): string {
  const reason = error instanceof Error ? error.message : fallback;
  const normalizedReason = reason.toLowerCase().replace(/[.?!]+$/, "");
  const genericReasons = new Set([
    fallback.toLowerCase().replace(/[.?!]+$/, ""),
    "failed to save building",
    "failed to save dorm",
    "failed to save building position",
    "failed to save dorm position",
    "failed to save event location",
  ]);

  if (genericReasons.has(normalizedReason)) {
    return `${name} failed to save.`;
  }

  return `${name} failed to save: ${reason}`;
}
