import type { ProposalEntityType } from "../services/proposal-service";

export type StoredProposalRef = {
  id: number;
  entityType: ProposalEntityType;
  entityId: number;
  status: string;
};

const STORAGE_KEY = "room-tba-proposal-refs";

export function readStoredProposals(): StoredProposalRef[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "[]") as StoredProposalRef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberProposal(ref: StoredProposalRef) {
  const existing = readStoredProposals().filter((item) => item.id !== ref.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([ref, ...existing]));
}

export function getStoredProposalForEntity(
  entityType: ProposalEntityType,
  entityId: number,
): StoredProposalRef | null {
  return (
    readStoredProposals().find(
      (item) =>
        item.entityType === entityType &&
        item.entityId === entityId &&
        ["pending", "needs_changes"].includes(item.status),
    ) ?? null
  );
}

const FIELD_LABELS: Record<string, string> = {
  buildingName: "Building name",
  directions: "Directions",
  buildingType: "Building type",
  lat: "Latitude",
  lon: "Longitude",
  dormName: "Dorm name",
  shortName: "Short name",
  gender: "Gender",
  capacity: "Capacity",
  roomCode: "Room code",
  collegeName: "College name",
  divisionName: "Division name",
  description: "Description",
  managingOffice: "Managing office",
  contactEmail: "Contact email",
  isUpManaged: "UP managed",
  title: "Title",
  category: "Category",
  startsAt: "Starts",
  endsAt: "Ends",
  sourceUrl: "Source URL",
  recurrence: "Recurrence",
  routes: "Routes",
  locations: "Map locations",
};

export function summarizeProposalPatch(
  patch: Record<string, unknown>,
): string[] {
  if (Array.isArray(patch.locations)) {
    return [`Event map pin / ${patch.locations.length} location(s)`];
  }
  if (
    patch.lat !== undefined &&
    patch.lon !== undefined &&
    Object.keys(patch).length <= 2
  ) {
    return [`Map pin: ${patch.lat}, ${patch.lon}`];
  }
  return Object.entries(patch).map(([key, value]) => {
    const label = FIELD_LABELS[key] ?? key;
    const rendered =
      typeof value === "string" || typeof value === "number"
        ? String(value)
        : JSON.stringify(value);
    return `${label}: ${rendered}`;
  });
}

type PersistEntityChangeInput = {
  entityType: ProposalEntityType;
  entityId: number;
  baseVersion: number;
  patch: Record<string, unknown>;
  entityLabel: string;
  canPublish: boolean;
  submitterName?: string;
  proposalId?: number | null;
};

export async function persistEntityChange(
  input: PersistEntityChangeInput,
): Promise<{
  ok: boolean;
  error?: string;
  published?: unknown;
  proposal?: StoredProposalRef;
  latest?: unknown;
}> {
  if (input.canPublish) {
    const result = await publishEntityPatch(
      input.entityType,
      input.entityId,
      input.baseVersion,
      input.patch,
    );
    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? `${input.entityLabel} failed to save.`,
        latest: result.latest,
      };
    }
    return { ok: true, published: result.data };
  }

  const result = await submitEntityProposal({
    entityType: input.entityType,
    entityId: input.entityId,
    baseVersion: input.baseVersion,
    patch: input.patch,
    submitterName: input.submitterName,
    proposalId: input.proposalId,
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error ??
        `Proposal for ${input.entityLabel} could not be submitted.`,
    };
  }

  return { ok: true, proposal: result.proposal };
}

export function adminPatchPath(
  entityType: ProposalEntityType,
  entityId: number,
): string {
  switch (entityType) {
    case "building":
      return `/api/admin/buildings/${entityId}`;
    case "dorm":
      return `/api/admin/dorms/${entityId}`;
    case "room":
      return `/api/admin/rooms/${entityId}`;
    case "college":
      return `/api/admin/colleges/${entityId}`;
    case "division":
      return `/api/admin/divisions/${entityId}`;
    case "event":
      return `/api/admin/events/${entityId}`;
    case "event_locations":
      return `/api/admin/events/${entityId}/locations`;
  }
}

export async function publishEntityPatch(
  entityType: ProposalEntityType,
  entityId: number,
  baseVersion: number,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; latest?: unknown; data?: unknown }> {
  const body =
    entityType === "event_locations"
      ? { version: baseVersion, locations: patch.locations }
      : { version: baseVersion, ...patch };

  const res = await fetch(adminPatchPath(entityType, entityId), {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: (data as { error?: string }).error,
      latest: (data as { latest?: unknown }).latest,
    };
  }
  const payload = data as Record<string, unknown>;
  const entity =
    payload.building ??
    payload.dorm ??
    payload.room ??
    payload.college ??
    payload.division ??
    payload.event;
  return { ok: true, data: entity ?? payload };
}

export async function submitEntityProposal(input: {
  entityType: ProposalEntityType;
  entityId: number;
  baseVersion: number;
  patch: Record<string, unknown>;
  submitterName?: string;
  proposalId?: number | null;
}): Promise<{ ok: boolean; error?: string; proposal?: StoredProposalRef }> {
  const res = await fetch("/api/proposals", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string }).error };
  }
  const proposal = (
    data as { proposal?: StoredProposalRef & { status: string } }
  ).proposal;
  if (proposal) {
    const ref: StoredProposalRef = {
      id: proposal.id,
      entityType: input.entityType,
      entityId: input.entityId,
      status: proposal.status,
    };
    rememberProposal(ref);
    return { ok: true, proposal: ref };
  }
  return { ok: true };
}

export async function submitPinPositionProposal(input: {
  pinType: "building" | "dorm" | "event";
  entityId: number;
  baseVersion: number;
  lat: number;
  lon: number;
  entityLabel: string;
  submitterName?: string;
  proposalId?: number | null;
  eventLocations?: unknown[];
}): Promise<{ ok: boolean; error?: string; proposal?: StoredProposalRef }> {
  if (input.pinType === "event") {
    if (!input.eventLocations) {
      return { ok: false, error: "Event location data is missing." };
    }
    return submitEntityProposal({
      entityType: "event_locations",
      entityId: input.entityId,
      baseVersion: input.baseVersion,
      patch: { locations: input.eventLocations },
      submitterName: input.submitterName,
      proposalId: input.proposalId,
    });
  }

  return submitEntityProposal({
    entityType: input.pinType,
    entityId: input.entityId,
    baseVersion: input.baseVersion,
    patch: { lat: input.lat, lon: input.lon },
    submitterName: input.submitterName,
    proposalId: input.proposalId,
  });
}

export function resolveSubmitterName(input: {
  displayName?: string | null;
  username?: string | null;
  draftName?: string;
}) {
  return (
    input.displayName?.trim() ||
    input.username?.trim() ||
    input.draftName?.trim() ||
    ""
  );
}
