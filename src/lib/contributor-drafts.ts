import type { ProposalCreateType } from "@lib/services/proposal-service";
import type { EventPlacementDraft } from "@lib/store.svelte";

const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_DEBOUNCE_MS = 400;

type StoredEnvelope<T> = {
  savedAt: number;
  data: T;
};

export const CONTRIBUTOR_DRAFT_KEYS = {
  submitterName: "room-tba-contributor-submitter-name",
  suggestAddition: "room-tba-contributor-draft-suggest-addition",
  proposeEvent: "room-tba-contributor-draft-propose-event",
  entity: (entityType: string, entityId: number) =>
    `room-tba-contributor-draft-entity-${entityType}-${entityId}`,
} as const;

export type SuggestAdditionDraft = {
  kind: ProposalCreateType;
  buildingName: string;
  buildingDirections: string;
  buildingType: "admin" | "non-admin";
  eventTitle: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventCategory: "tradition" | "fair" | "ceremony" | "sports" | "other";
  eventImageUrl: string | null;
  dormName: string;
  dormGender: string;
  roomCode: string;
  roomDirections: string;
  collegeName: string;
  divisionCollegeDraft: string;
  divisionName: string;
  draftPin: { lat: number; lon: number } | null;
};

export type ProposeEventDraft = {
  draft: EventPlacementDraft;
  submitterName: string;
  proposing: boolean;
};

export type EntityContributorDraft = {
  editing: boolean;
  fields: Record<string, unknown>;
};

function readEnvelope<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as StoredEnvelope<T>;
    if (
      typeof envelope.savedAt !== "number" ||
      envelope.data === undefined ||
      Date.now() - envelope.savedAt > DRAFT_TTL_MS
    ) {
      localStorage.removeItem(key);
      return null;
    }
    return envelope.data;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeEnvelope<T>(key: string, data: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    const envelope: StoredEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Storage can be unavailable or full.
  }
}

export function clearContributorDraft(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function readSubmitterName(): string {
  return readEnvelope<string>(CONTRIBUTOR_DRAFT_KEYS.submitterName) ?? "";
}

export function writeSubmitterName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) {
    clearContributorDraft(CONTRIBUTOR_DRAFT_KEYS.submitterName);
    return;
  }
  writeEnvelope(CONTRIBUTOR_DRAFT_KEYS.submitterName, trimmed);
}

export function readSuggestAdditionDraft(): SuggestAdditionDraft | null {
  return readEnvelope<SuggestAdditionDraft>(
    CONTRIBUTOR_DRAFT_KEYS.suggestAddition,
  );
}

export function writeSuggestAdditionDraft(data: SuggestAdditionDraft): void {
  writeEnvelope(CONTRIBUTOR_DRAFT_KEYS.suggestAddition, data);
}

export function clearSuggestAdditionDraft(): void {
  clearContributorDraft(CONTRIBUTOR_DRAFT_KEYS.suggestAddition);
}

export function readProposeEventDraft(): ProposeEventDraft | null {
  return readEnvelope<ProposeEventDraft>(CONTRIBUTOR_DRAFT_KEYS.proposeEvent);
}

export function writeProposeEventDraft(data: ProposeEventDraft): void {
  writeEnvelope(CONTRIBUTOR_DRAFT_KEYS.proposeEvent, data);
}

export function clearProposeEventDraft(): void {
  clearContributorDraft(CONTRIBUTOR_DRAFT_KEYS.proposeEvent);
}

export function readEntityContributorDraft(
  entityType: string,
  entityId: number,
): EntityContributorDraft | null {
  return readEnvelope<EntityContributorDraft>(
    CONTRIBUTOR_DRAFT_KEYS.entity(entityType, entityId),
  );
}

export function writeEntityContributorDraft(
  entityType: string,
  entityId: number,
  data: EntityContributorDraft,
): void {
  writeEnvelope(CONTRIBUTOR_DRAFT_KEYS.entity(entityType, entityId), data);
}

export function clearEntityContributorDraft(
  entityType: string,
  entityId: number,
): void {
  clearContributorDraft(CONTRIBUTOR_DRAFT_KEYS.entity(entityType, entityId));
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }) as T & { cancel: () => void };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

const debouncedWriters = new Map<string, ReturnType<typeof debounce>>();

export function scheduleContributorDraftSave<T>(
  key: string,
  getData: () => T,
  write: (data: T) => void,
): void {
  let writer = debouncedWriters.get(key);
  if (!writer) {
    writer = debounce(() => {
      write(getData());
    }, DRAFT_DEBOUNCE_MS);
    debouncedWriters.set(key, writer);
  }
  writer();
}

export function scheduleSubmitterNameSave(name: string): void {
  scheduleContributorDraftSave(
    CONTRIBUTOR_DRAFT_KEYS.submitterName,
    () => name,
    writeSubmitterName,
  );
}

export function scheduleSuggestAdditionDraftSave(
  getData: () => SuggestAdditionDraft,
): void {
  scheduleContributorDraftSave(
    CONTRIBUTOR_DRAFT_KEYS.suggestAddition,
    getData,
    writeSuggestAdditionDraft,
  );
}

export function scheduleProposeEventDraftSave(
  getData: () => ProposeEventDraft,
): void {
  scheduleContributorDraftSave(
    CONTRIBUTOR_DRAFT_KEYS.proposeEvent,
    getData,
    writeProposeEventDraft,
  );
}

export function scheduleEntityContributorDraftSave(
  entityType: string,
  entityId: number,
  getData: () => EntityContributorDraft,
): void {
  scheduleContributorDraftSave(
    CONTRIBUTOR_DRAFT_KEYS.entity(entityType, entityId),
    getData,
    (data) => writeEntityContributorDraft(entityType, entityId, data),
  );
}
