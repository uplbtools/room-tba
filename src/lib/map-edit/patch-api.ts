import type { EventData } from "@lib/types";
import { ClientEditConflictError, ClientEventConflictError } from "./errors";
import type {
  EditableConflictResponse,
  EditableCoords,
  EditableEntityType,
  EditableUpdateResponse,
  EditableVersionedPosition,
  EventLocationWriteValue,
  EventLocationsPatchResponse,
} from "./types";

export async function patchPosition(
  type: EditableEntityType,
  id: number,
  coords: EditableCoords,
  version: number,
): Promise<EditableVersionedPosition> {
  const endpoint =
    type === "building"
      ? `/api/admin/buildings/${id}`
      : `/api/admin/dorms/${id}`;
  const res = await fetch(endpoint, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...coords, version }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as
      | EditableConflictResponse
      | { error?: string };
    if (res.status === 409) {
      const conflict = data as EditableConflictResponse;
      throw new ClientEditConflictError(
        conflict.error ?? "This item was changed by another editor.",
        conflict.latest ?? null,
      );
    }
    throw new Error(data.error ?? `Save failed (${res.status})`);
  }

  const data = (await res.json()) as EditableUpdateResponse;
  const updated = type === "building" ? data.building : data.dorm;
  if (!updated) {
    throw new Error("Save response did not include updated data.");
  }
  return updated;
}

export async function patchEventLocations(
  event: EventData,
  locations: EventLocationWriteValue[],
  version = event.version,
): Promise<EventData> {
  const res = await fetch(`/api/admin/events/${event.id}/locations`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ version, locations }),
  });
  const data = (await res.json().catch(() => ({}))) as
    | EventLocationsPatchResponse
    | { error?: string };

  if (!res.ok) {
    if (res.status === 409) {
      const conflict = data as EventLocationsPatchResponse;
      throw new ClientEventConflictError(
        conflict.error ?? "This event was changed by another editor.",
        conflict.latest ?? null,
      );
    }
    throw new Error(data.error ?? `Save failed (${res.status})`);
  }

  const updated = (data as EventLocationsPatchResponse).event;
  if (!updated) {
    throw new Error("Save response did not include updated event.");
  }
  return updated;
}
