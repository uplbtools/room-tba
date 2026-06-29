type SyncTelemetryEvent = {
  type: "sync-start" | "sync-complete" | "sync-error" | "sync-retry";
  table?: string;
  durationMs?: number;
  error?: string;
  timestamp: number;
};

const MAX_EVENTS = 50;
let events: SyncTelemetryEvent[] = [];

export function recordSyncTelemetry(
  event: Omit<SyncTelemetryEvent, "timestamp">,
) {
  events.push({ ...event, timestamp: Date.now() });
  if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);

  if (typeof console !== "undefined") {
    const label =
      event.type === "sync-error" ? "[SyncTelemetry] ERROR" : "[SyncTelemetry]";
    console.log(label, event);
  }
}

export function getSyncTelemetry(): readonly SyncTelemetryEvent[] {
  return events;
}

export function clearSyncTelemetry() {
  events = [];
}
