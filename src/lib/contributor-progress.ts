import { fetchJsonWithRetry } from "@lib/local/data/fetch-json";

export const ROOM_FIELD_CATEGORIES = [
  "directions",
  "schedule",
  "position",
] as const;

export type RoomFieldCategory = (typeof ROOM_FIELD_CATEGORIES)[number];

export const ROOM_FIELD_LABELS: Record<RoomFieldCategory, string> = {
  directions: "Directions",
  schedule: "Schedule",
  position: "Floor plan pin",
};

export type ProgressCount = {
  filled: number;
  total: number;
};

export type RoomProgressInput = {
  id: number;
  code: string;
  buildingId: number | null;
  directions: string | null;
  classCount: number;
  hasPosition: boolean;
};

export type RoomProgressRow = {
  id: number;
  code: string;
  buildingId: number | null;
  fields: Record<RoomFieldCategory, boolean>;
  missingFields: RoomFieldCategory[];
};

export type BuildingProgressBreakdown = {
  buildingId: number;
  buildingName: string;
  roomTotal: number;
  directions: ProgressCount;
  schedule: ProgressCount;
  position: ProgressCount;
  gapScore: number;
};

export type CampusContributorProgress = {
  scope: "campus";
  termId: number | null;
  termLabel: string | null;
  rooms: Record<RoomFieldCategory, ProgressCount>;
  buildings: {
    total: number;
    pins: ProgressCount;
    directions: ProgressCount;
  };
  topBuildings: BuildingProgressBreakdown[];
};

export type BuildingContributorProgress = {
  scope: "building";
  buildingId: number;
  buildingName: string;
  termId: number | null;
  termLabel: string | null;
  rooms: Record<RoomFieldCategory, ProgressCount>;
  roomRows: RoomProgressRow[];
};

export type MineContributorProgress = {
  scope: "mine";
  editedBy: string;
  totalEdits: number;
  byEntityType: Record<string, number>;
};

export type ContributorProgressResponse =
  | CampusContributorProgress
  | BuildingContributorProgress
  | MineContributorProgress;

export const TOP_BUILDINGS_LIMIT = 10;

export function isNonEmptyText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasBuildingPin(
  lat: number | null | undefined,
  lon: number | null | undefined,
): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon);
}

export function progressPercent(filled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.floor((filled / total) * 100);
}

export function emptyProgressCount(total: number): ProgressCount {
  return { filled: 0, total };
}

export function summarizeFieldCounts(
  rows: RoomProgressRow[],
): Record<RoomFieldCategory, ProgressCount> {
  const total = rows.length;
  const counts: Record<RoomFieldCategory, ProgressCount> = {
    directions: emptyProgressCount(total),
    schedule: emptyProgressCount(total),
    position: emptyProgressCount(total),
  };

  for (const row of rows) {
    for (const category of ROOM_FIELD_CATEGORIES) {
      if (row.fields[category]) {
        counts[category].filled += 1;
      }
    }
  }

  return counts;
}

export function buildRoomProgressRow(room: RoomProgressInput): RoomProgressRow {
  const fields: Record<RoomFieldCategory, boolean> = {
    directions: isNonEmptyText(room.directions),
    schedule: room.classCount > 0,
    position: room.hasPosition,
  };
  const missingFields = ROOM_FIELD_CATEGORIES.filter(
    (category) => !fields[category],
  );

  return {
    id: room.id,
    code: room.code,
    buildingId: room.buildingId,
    fields,
    missingFields,
  };
}

export function buildRoomProgressRows(
  rooms: RoomProgressInput[],
): RoomProgressRow[] {
  return rooms.map(buildRoomProgressRow);
}

export function buildingGapScore(
  counts: Record<RoomFieldCategory, ProgressCount>,
): number {
  return ROOM_FIELD_CATEGORIES.reduce((score, category) => {
    const { filled, total } = counts[category];
    return score + Math.max(0, total - filled);
  }, 0);
}

export function computeBuildingBreakdown(
  rows: RoomProgressRow[],
  buildingNames: Map<number, string>,
): BuildingProgressBreakdown[] {
  const grouped = new Map<number, RoomProgressRow[]>();

  for (const row of rows) {
    if (row.buildingId == null) continue;
    const list = grouped.get(row.buildingId) ?? [];
    list.push(row);
    grouped.set(row.buildingId, list);
  }

  const breakdown: BuildingProgressBreakdown[] = [];

  for (const [buildingId, buildingRows] of grouped) {
    const counts = summarizeFieldCounts(buildingRows);
    breakdown.push({
      buildingId,
      buildingName: buildingNames.get(buildingId) ?? `Building ${buildingId}`,
      roomTotal: buildingRows.length,
      directions: counts.directions,
      schedule: counts.schedule,
      position: counts.position,
      gapScore: buildingGapScore(counts),
    });
  }

  return breakdown.sort((a, b) => {
    if (b.gapScore !== a.gapScore) return b.gapScore - a.gapScore;
    return a.buildingName.localeCompare(b.buildingName);
  });
}

export function topBuildingsByGap(
  breakdown: BuildingProgressBreakdown[],
  limit = TOP_BUILDINGS_LIMIT,
): BuildingProgressBreakdown[] {
  return breakdown.slice(0, limit);
}

export function aggregateHistoryByEntityType(
  rows: Array<{ entityType: string; count: number }>,
): { totalEdits: number; byEntityType: Record<string, number> } {
  const byEntityType: Record<string, number> = {};
  let totalEdits = 0;

  for (const row of rows) {
    byEntityType[row.entityType] = row.count;
    totalEdits += row.count;
  }

  return { totalEdits, byEntityType };
}

export function missingFieldLabel(
  roomCode: string,
  category: RoomFieldCategory,
): string {
  return `${roomCode} — ${ROOM_FIELD_LABELS[category].toLowerCase()} missing`;
}

type ContributorProgressApiResponse = {
  success: boolean;
  data?: ContributorProgressResponse;
  error?: string;
};

export async function fetchContributorProgress(
  scope: "campus",
): Promise<CampusContributorProgress>;
export async function fetchContributorProgress(
  scope: "building",
  buildingId: number,
): Promise<BuildingContributorProgress>;
export async function fetchContributorProgress(
  scope: "mine",
): Promise<MineContributorProgress>;
export async function fetchContributorProgress(
  scope: "campus" | "building" | "mine",
  buildingId?: number,
): Promise<ContributorProgressResponse> {
  const params = new URLSearchParams({ scope });
  if (scope === "building") {
    if (!Number.isFinite(buildingId)) {
      throw new Error("Building scope requires a building id.");
    }
    params.set("buildingId", String(buildingId));
  }

  const payload = await fetchJsonWithRetry<ContributorProgressApiResponse>(
    `/api/contributor-progress?${params.toString()}`,
    { attempts: 3, timeoutMs: 20_000, baseDelayMs: 500, maxDelayMs: 4_000 },
  );

  if (!payload.success || !payload.data) {
    throw new Error(payload.error ?? "Failed to load contributor progress.");
  }

  return payload.data;
}
