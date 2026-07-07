import { describe, expect, test, beforeAll } from "bun:test";
import { E2E_FIXTURES, loginViaApi, patchBuilding } from "../helpers/http";
import {
  PREVIEW_BASE,
  requirePreview,
  previewFetchInit,
  skipWithoutE2eDb,
  integrationDatabaseUrl,
} from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

function readEntityVersion(
  rows: Array<{ version: number | string | null | undefined }>,
): number {
  const version = Number(rows[0]?.version ?? 1);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Expected entity version >= 1, got ${rows[0]?.version}`);
  }
  return version;
}

describeIntegration("admin PATCH HTTP", () => {
  beforeAll(async () => {
    await requirePreview(PREVIEW_BASE);
  });

  test("PATCH without cookie returns 401", async () => {
    const res = await fetch(
      `${PREVIEW_BASE}/api/admin/buildings/1`,
      previewFetchInit({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: 14.17, version: 1 }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test("stale version returns 409", async () => {
    const cookie = await loginViaApi(E2E_FIXTURES.users.admin);
    expect(cookie).toBeTruthy();

    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{ version: number }>(
      "SELECT version FROM buildings WHERE id = 1",
    );
    const version = readEntityVersion(rows);
    await client.end();

    const stale = await patchBuilding(
      1,
      { lat: 14.1702, version: version - 1 },
      cookie!,
    );
    expect(stale.status).toBe(409);
  });
});

describeIntegration("room service", () => {
  test("updateRoom bumps version", async () => {
    if (!integrationDatabaseUrl()) return;
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{ version: number }>(
      "SELECT version FROM rooms WHERE id = 1",
    );
    const version = readEntityVersion(rows);
    await client.end();

    const { updateRoom } = await import("@lib/services/admin-service");
    const updated = await updateRoom(
      1,
      { directions: "Integration test directions" },
      version,
      "e2e-admin",
    );
    expect(updated!.version).toBe(version + 1);
  });
});

describeIntegration("proposals service", () => {
  test("submit room proposal", async () => {
    if (!integrationDatabaseUrl()) return;
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{ version: number }>(
      "SELECT version FROM rooms WHERE id = 1",
    );
    const version = readEntityVersion(rows);
    await client.end();

    const { submitProposal } = await import("@lib/services/proposal-service");
    const proposal = await submitProposal({
      entityType: "room",
      entityId: 1,
      baseVersion: version,
      patch: { directions: "Proposed directions" },
      submitterName: "E2E Contributor",
      submitterUserId: null,
      proposalId: null,
    });
    expect(proposal.status).toBe("pending");
  });

  test("approve proposal via HTTP when preview is up", async () => {
    if (!integrationDatabaseUrl()) return;
    await requirePreview(PREVIEW_BASE);

    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{ version: number }>(
      "SELECT version FROM rooms WHERE id = 1",
    );
    const version = readEntityVersion(rows);
    await client.end();

    const { submitProposal } = await import("@lib/services/proposal-service");
    const proposal = await submitProposal({
      entityType: "room",
      entityId: 1,
      baseVersion: version,
      patch: { directions: `Approve flow ${Date.now()}` },
      submitterName: "E2E Contributor",
      submitterUserId: null,
      proposalId: null,
    });

    const { loginViaApi, approveProposalHttp } = await import(
      "../helpers/http"
    );
    const cookie = await loginViaApi(E2E_FIXTURES.users.admin);
    expect(cookie).toBeTruthy();

    const res = await approveProposalHttp(proposal.id, cookie!);
    expect(res.status).toBe(200);
  });
});
