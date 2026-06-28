import { describe, expect, test } from "bun:test";
import { handlePersistEntityResult } from "./handle-persist-result";

describe("handlePersistEntityResult", () => {
  test("syncs latest entity on conflict", () => {
    const synced: number[] = [];
    const outcome = handlePersistEntityResult<{ version: number }>(
      {
        ok: false,
        error: "Conflict",
        latest: { version: 4 },
      },
      {
        syncFromServer: (latest) => synced.push(latest.version),
        fallbackError: "Save failed.",
      },
    );

    expect(outcome.error).toBe("Conflict");
    expect(synced).toEqual([4]);
  });

  test("returns published and proposal outcomes", () => {
    const synced: string[] = [];
    const published = handlePersistEntityResult<{ id: string }>(
      { ok: true, published: { id: "b1" } },
      {
        syncFromServer: (latest) => synced.push(latest.id),
        fallbackError: "Save failed.",
      },
    );
    expect(published.error).toBeNull();
    expect(published.published).toEqual({ id: "b1" });
    expect(synced).toEqual(["b1"]);

    const proposal = handlePersistEntityResult(
      {
        ok: true,
        proposal: {
          id: 9,
          entityType: "building",
          entityId: 1,
          status: "pending",
        },
      },
      {
        syncFromServer: () => {},
        fallbackError: "Save failed.",
      },
    );
    expect(proposal.error).toBeNull();
    expect(proposal.proposal?.id).toBe(9);
  });
});
