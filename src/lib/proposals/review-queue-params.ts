/**
 * Review queue filters and keyset cursor (auth audit item 17). Pure so the
 * parsing is unit tested and the client builds the same query string.
 */

export const REVIEW_PAGE_SIZE = 25;
export const REVIEW_PAGE_MAX = 100;

/** "Waiting longer than" choices, in days. */
export const REVIEW_AGE_OPTIONS = [1, 3, 7, 30] as const;

/**
 * Filter menu entries; values mirror PROPOSAL_ENTITY_TYPES in
 * proposal-service (a test keeps the two in step without pulling the
 * server module into the client bundle).
 */
export const REVIEW_ENTITY_TYPE_OPTIONS: readonly {
  value: string;
  label: string;
}[] = [
  { value: "room", label: "Room edits" },
  { value: "building", label: "Building edits" },
  { value: "dorm", label: "Dorm edits" },
  { value: "place", label: "Place edits" },
  { value: "college", label: "College edits" },
  { value: "division", label: "Division edits" },
  { value: "event", label: "Event edits" },
  { value: "event_locations", label: "Event location edits" },
  { value: "organization", label: "Organization edits" },
  { value: "jeepney_stop", label: "Jeepney stop edits" },
  { value: "create_room", label: "New rooms" },
  { value: "create_building", label: "New buildings" },
  { value: "create_dorm", label: "New dorms" },
  { value: "create_place", label: "New places" },
  { value: "create_college", label: "New colleges" },
  { value: "create_division", label: "New divisions" },
  { value: "create_event", label: "New events" },
  { value: "create_organization", label: "New organizations" },
  { value: "create_jeepney_stop", label: "New jeepney stops" },
];

export type ReviewQueueFilters = {
  entityType: string | null;
  submitter: string | null;
  olderThanDays: number | null;
  q: string | null;
};

export type ReviewCursor = { createdAt: string; id: number };

export type ReviewQueueQuery = ReviewQueueFilters & {
  cursor: ReviewCursor | null;
  limit: number;
};

export const EMPTY_REVIEW_FILTERS: ReviewQueueFilters = {
  entityType: null,
  submitter: null,
  olderThanDays: null,
  q: null,
};

export function encodeReviewCursor(cursor: ReviewCursor): string {
  return btoa(`${cursor.createdAt}|${cursor.id}`)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function decodeReviewCursor(raw: string | null): ReviewCursor | null {
  if (!raw) return null;
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const [createdAt, id] = atob(padded).split("|");
    const n = Number(id);
    if (!createdAt || !Number.isInteger(n) || n < 1) return null;
    if (Number.isNaN(new Date(createdAt.replace(" ", "T")).getTime())) {
      return null;
    }
    return { createdAt, id: n };
  } catch {
    return null;
  }
}

function clean(value: string | null, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function parseReviewQueueQuery(
  params: URLSearchParams,
  knownEntityTypes: readonly string[],
): ReviewQueueQuery {
  const type = clean(params.get("entityType"), 40);
  const age = Number(params.get("olderThanDays"));
  const limit = Number(params.get("limit"));
  return {
    entityType: type && knownEntityTypes.includes(type) ? type : null,
    submitter: clean(params.get("submitter"), 100),
    olderThanDays: Number.isInteger(age) && age > 0 && age <= 365 ? age : null,
    q: clean(params.get("q"), 100),
    cursor: decodeReviewCursor(params.get("cursor")),
    limit:
      Number.isInteger(limit) && limit > 0
        ? Math.min(limit, REVIEW_PAGE_MAX)
        : REVIEW_PAGE_SIZE,
  };
}

export function reviewQueueSearchParams(
  filters: ReviewQueueFilters,
  cursor: string | null = null,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.submitter) params.set("submitter", filters.submitter);
  if (filters.olderThanDays) {
    params.set("olderThanDays", String(filters.olderThanDays));
  }
  if (filters.q) params.set("q", filters.q);
  if (cursor) params.set("cursor", cursor);
  return params;
}

export function hasActiveReviewFilters(filters: ReviewQueueFilters): boolean {
  return Boolean(
    filters.entityType ||
      filters.submitter ||
      filters.olderThanDays ||
      filters.q,
  );
}
