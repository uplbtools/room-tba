/**
 * Browser side of "Jeep is here" reports and the stop crowding hint. Every
 * fetch resolves to null on failure so the UI can show nothing instead of a
 * claim it cannot back ("No recent reports" only ever means the server said
 * so).
 */
import type { ClassChangePeak } from "./transit-crowding";
import type { TermWindow } from "./academic-calendar";
import type { JeepReport, ReportDirection } from "./transit-reports";

const DEVICE_KEY = "room-tba:transit-device-id";
let memoryDeviceId: string | null = null;

/**
 * Anonymous per-device id for the report cooldown: a random UUID kept in
 * localStorage, never tied to an account. Falls back to one per page load
 * when storage is blocked.
 */
export function transitDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    memoryDeviceId ??= crypto.randomUUID();
    return memoryDeviceId;
  }
}

export type ReportsResponse = {
  reports: JeepReport[];
  /** Server clock minus this device's clock, so "4 min ago" is not skewed. */
  skewMs: number;
};

async function getReports(query: string): Promise<ReportsResponse | null> {
  try {
    const res = await fetch(`/api/transit/reports?${query}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { now?: string; reports?: unknown };
    if (!Array.isArray(body.reports)) return null;
    const serverNow = body.now ? Date.parse(body.now) : Number.NaN;
    return {
      reports: body.reports as JeepReport[],
      skewMs: Number.isFinite(serverNow) ? serverNow - Date.now() : 0,
    };
  } catch {
    return null;
  }
}

export function fetchStopReports(stopKeys: string[]) {
  const params = new URLSearchParams();
  for (const key of stopKeys) params.append("stop", key);
  return getReports(params.toString());
}

export function fetchRouteReports(routeId: string) {
  return getReports(new URLSearchParams({ route: routeId }).toString());
}

export type StopPeaksResponse = {
  termWindow: TermWindow | null;
  peaks: ClassChangePeak[];
};

export async function fetchStopPeaks(
  stopKey: string,
): Promise<StopPeaksResponse | null> {
  try {
    const res = await fetch(
      `/api/transit/stop-peaks?${new URLSearchParams({ stop: stopKey })}`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<StopPeaksResponse>;
    if (!Array.isArray(body.peaks)) return null;
    return { termWindow: body.termWindow ?? null, peaks: body.peaks };
  } catch {
    return null;
  }
}

export type PostReportResult = { ok: true } | { ok: false; error: string };

export async function postJeepReport(input: {
  routeId: string;
  stopKey: string;
  direction: ReportDirection | null;
  full: boolean;
  /** Only when the rider already shared it (map location on); never asked. */
  location: { lat: number; lon: number } | null;
}): Promise<PostReportResult> {
  try {
    const res = await fetch("/api/transit/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: input.routeId,
        stopKey: input.stopKey,
        direction: input.direction,
        full: input.full,
        deviceId: transitDeviceId(),
        ...(input.location ?? {}),
      }),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    return { ok: false, error: body?.error ?? "Could not send the report." };
  } catch {
    return { ok: false, error: "You seem to be offline. Try again." };
  }
}
