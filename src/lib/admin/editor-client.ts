export type AdminEditableEntity = "building" | "dorm";

type AdminPatchResponse<TEntity> = {
  success: boolean;
  building?: TEntity;
  dorm?: TEntity;
};

type AdminConflictResponse<TEntity> = {
  error?: string;
  latest?: TEntity | null;
};

export class ClientEditConflictError<TEntity> extends Error {
  latest: TEntity | null;

  constructor(message: string, latest: TEntity | null) {
    super(message);
    this.name = "ClientEditConflictError";
    this.latest = latest;
  }
}

export async function patchAdminField<TEntity>(
  entityType: AdminEditableEntity,
  id: number,
  field: string,
  value: unknown,
  version: number,
): Promise<TEntity> {
  const endpoint =
    entityType === "building"
      ? `/api/admin/buildings/${id}`
      : `/api/admin/dorms/${id}`;
  const res = await fetch(endpoint, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ [field]: value, version }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as
      | AdminConflictResponse<TEntity>
      | { error?: string };

    if (res.status === 409) {
      const conflict = data as AdminConflictResponse<TEntity>;
      throw new ClientEditConflictError<TEntity>(
        conflict.error ?? "This item was changed by another editor.",
        conflict.latest ?? null,
      );
    }

    throw new Error(data.error ?? `Save failed (${res.status})`);
  }

  const data = (await res.json()) as AdminPatchResponse<TEntity>;
  const updated = entityType === "building" ? data.building : data.dorm;
  if (!updated) throw new Error("Save response did not include updated data.");

  return updated;
}
