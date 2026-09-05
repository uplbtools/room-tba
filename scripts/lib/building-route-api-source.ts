export type BuildingRouteApiRow = {
  id: number;
  buildingName: string;
  lat: number | null;
  lon: number | null;
};

function finiteNumber(value: unknown, label: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error(`building route API source: ${label} is not finite`);
  }
  return parsed;
}

function nullableCoordinate(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number | null {
  if (value === null || value === undefined) return null;
  const parsed = finiteNumber(value, label);
  if (parsed < min || parsed > max) {
    throw new Error(
      `building route API source: ${label} is outside ${min}..${max}`,
    );
  }
  return parsed;
}

export function buildingApiUrl(base: string): string {
  const trimmed = base.trim().replace(/\/$/, "");
  if (!trimmed) {
    throw new Error("building route API source: base URL is empty");
  }
  return trimmed.endsWith("/api/buildings")
    ? trimmed
    : `${trimmed}/api/buildings`;
}

export function parseBuildingRouteApiRows(payload: unknown): BuildingRouteApiRow[] {
  if (!Array.isArray(payload)) {
    throw new Error("building route API source: buildings API did not return an array");
  }
  if (payload.length === 0) {
    throw new Error("building route API source: buildings API returned no rows");
  }

  const rows = payload.map((raw, index) => {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`building route API source: row ${index} is not an object`);
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.buildingName !== "string" || !row.buildingName.trim()) {
      throw new Error(
        `building route API source: row ${index} has no buildingName`,
      );
    }

    const id = finiteNumber(row.id, `row ${index} id`);
    if (!Number.isInteger(id)) {
      throw new Error(`building route API source: row ${index} id is not an integer`);
    }

    return {
      id,
      buildingName: row.buildingName,
      lat: nullableCoordinate(row.lat, `row ${index} lat`, -90, 90),
      lon: nullableCoordinate(row.lon, `row ${index} lon`, -180, 180),
    };
  });

  const seenIds = new Set<number>();
  for (const row of rows) {
    if (seenIds.has(row.id)) {
      throw new Error(`building route API source: duplicate building id ${row.id}`);
    }
    seenIds.add(row.id);
  }

  return rows;
}

export async function fetchBuildingRouteApiRows(
  base: string,
): Promise<BuildingRouteApiRow[]> {
  const url = buildingApiUrl(base);
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "RoomTBA-building-route-audit/1.0 (https://github.com/uplbtools/room-tba)",
    },
  });
  if (!response.ok) {
    throw new Error(`building route API source: ${response.status} from ${url}`);
  }
  return parseBuildingRouteApiRows(await response.json());
}
