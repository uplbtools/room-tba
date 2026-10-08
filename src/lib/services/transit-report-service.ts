import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  jeepReportsTable,
  roomsTable,
} from "@drizzle/schema";
import { db } from "@lib/db";
import { resolveTermWindow, type TermWindow } from "@lib/academic-calendar";
import { distanceMeters } from "@lib/campus-route";
import {
  type ClassChangePeak,
  NEARBY_BUILDING_M,
  classChangePeaks,
} from "@lib/transit-crowding";
import {
  type CooldownDecision,
  type JeepReport,
  type ReportDirection,
  type ReportSubmission,
  REPORT_COOLDOWN_MS,
  REPORT_WINDOW_MS,
  cooldownDecision,
} from "@lib/transit-reports";
import { getDefaultTerm } from "./term-service";

/** Rows older than this carry no signal; pruned on a sample of writes. */
const REPORT_TTL_HOURS = 24;
const PRUNE_SAMPLE_RATE = 0.05;
/** Upper bound on rows one read returns; an hour at a stop is far fewer. */
const MAX_REPORT_ROWS = 500;

function toReport(row: {
  routeId: string;
  stopKey: string;
  direction: string | null;
  isFull: boolean;
  createdAt: Date;
}): JeepReport {
  return {
    routeId: row.routeId,
    stopKey: row.stopKey,
    direction:
      row.direction === "forward" || row.direction === "reverse"
        ? (row.direction as ReportDirection)
        : null,
    full: row.isFull,
    at: row.createdAt.toISOString(),
  };
}

const reportColumns = {
  routeId: jeepReportsTable.routeId,
  stopKey: jeepReportsTable.stopKey,
  direction: jeepReportsTable.direction,
  isFull: jeepReportsTable.isFull,
  createdAt: jeepReportsTable.createdAt,
};

function windowStart(): Date {
  return new Date(Date.now() - REPORT_WINDOW_MS);
}

/** Last hour of reports at these stop keys (any route), newest first. */
export async function getStopReports(
  stopKeys: string[],
): Promise<JeepReport[]> {
  const rows = await db
    .select(reportColumns)
    .from(jeepReportsTable)
    .where(
      and(
        inArray(jeepReportsTable.stopKey, stopKeys),
        gte(jeepReportsTable.createdAt, windowStart()),
      ),
    )
    .orderBy(desc(jeepReportsTable.createdAt))
    .limit(MAX_REPORT_ROWS);
  return rows.map(toReport);
}

/** Last hour of reports anywhere on one route, newest first. */
export async function getRouteReports(routeId: string): Promise<JeepReport[]> {
  const rows = await db
    .select(reportColumns)
    .from(jeepReportsTable)
    .where(
      and(
        eq(jeepReportsTable.routeId, routeId),
        gte(jeepReportsTable.createdAt, windowStart()),
      ),
    )
    .orderBy(desc(jeepReportsTable.createdAt))
    .limit(MAX_REPORT_ROWS);
  return rows.map(toReport);
}

/**
 * Store one tap, honouring the per-device cooldown. Returns what happened so
 * the route can answer 201 / 200 / 429.
 */
export async function recordJeepReport(
  submission: ReportSubmission,
): Promise<CooldownDecision> {
  const since = new Date(Date.now() - REPORT_COOLDOWN_MS);
  const [previous] = await db
    .select({
      id: jeepReportsTable.id,
      isFull: jeepReportsTable.isFull,
      createdAt: jeepReportsTable.createdAt,
    })
    .from(jeepReportsTable)
    .where(
      and(
        eq(jeepReportsTable.deviceId, submission.deviceId),
        eq(jeepReportsTable.routeId, submission.routeId),
        eq(jeepReportsTable.stopKey, submission.stopKey),
        submission.direction === null
          ? sql`${jeepReportsTable.direction} IS NULL`
          : eq(jeepReportsTable.direction, submission.direction),
        gte(jeepReportsTable.createdAt, since),
      ),
    )
    .orderBy(desc(jeepReportsTable.createdAt))
    .limit(1);

  const decision = cooldownDecision(
    previous
      ? { at: previous.createdAt.getTime(), full: previous.isFull }
      : null,
    submission.full,
    Date.now(),
  );

  if (decision === "insert") {
    await db.insert(jeepReportsTable).values({
      routeId: submission.routeId,
      stopKey: submission.stopKey,
      direction: submission.direction,
      deviceId: submission.deviceId,
      isFull: submission.full,
    });
    // ponytail: sampled prune on the write path, like /api/presence; move to
    // a cron if reports ever outgrow a DELETE on an indexed column.
    if (Math.random() < PRUNE_SAMPLE_RATE) {
      await db
        .delete(jeepReportsTable)
        .where(
          lt(
            jeepReportsTable.createdAt,
            sql`now() - make_interval(hours => ${REPORT_TTL_HOURS})`,
          ),
        );
    }
  } else if (decision === "mark-full" && previous) {
    await db
      .update(jeepReportsTable)
      .set({ isFull: true })
      .where(eq(jeepReportsTable.id, previous.id));
  }
  return decision;
}

export type StopPeaks = {
  termWindow: TermWindow | null;
  peaks: ClassChangePeak[];
  /** Buildings whose classes fed the peaks. */
  buildings: number;
};

const PEAKS_TTL_MS = 60 * 60_000;
const peaksCache = new Map<string, { at: number; value: StopPeaks }>();

/**
 * Class-change peaks for the default term in buildings near a stop. Classes
 * change once a term, so each stop's answer is memoised for an hour.
 */
export async function getStopPeaks(stop: {
  lat: number;
  lon: number;
}): Promise<StopPeaks> {
  const key = `${stop.lat},${stop.lon}`;
  const cached = peaksCache.get(key);
  if (cached && Date.now() - cached.at < PEAKS_TTL_MS) return cached.value;

  const [term, buildings] = await Promise.all([
    getDefaultTerm(),
    db
      .select({
        id: buildingsTable.id,
        lat: buildingsTable.lat,
        lon: buildingsTable.lon,
      })
      .from(buildingsTable),
  ]);
  const nearby = buildings
    .filter((b) => distanceMeters(b, stop) <= NEARBY_BUILDING_M)
    .map((b) => b.id);

  let value: StopPeaks = { termWindow: null, peaks: [], buildings: 0 };
  if (term && nearby.length > 0) {
    const rows = await db
      .select({ schedule: classesTable.schedule })
      .from(classesTable)
      .innerJoin(roomsTable, eq(roomsTable.id, classesTable.roomId))
      .where(
        and(
          eq(classesTable.termId, term.id),
          inArray(roomsTable.buildingId, nearby),
        ),
      );
    value = {
      termWindow: resolveTermWindow(term),
      peaks: classChangePeaks(rows.map((r) => r.schedule)),
      buildings: nearby.length,
    };
  }
  peaksCache.set(key, { at: Date.now(), value });
  return value;
}
