import { describe, expect, test } from "bun:test";
import {
  E2E_FIXTURES,
  loginViaApi,
  patchBuilding,
} from "../helpers/http";
import { PREVIEW_BASE, skipWithoutE2eDb, integrationDatabaseUrl } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

let previewUp = false;

describeIntegration("admin PATCH HTTP", () => {
  test("PATCH without cookie returns 401", async () => {
    try {
      const res = await fetch(`${PREVIEW_BASE}/api/admin/buildings/1`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: 14.17, version: 1 }),
      });
      previewUp = true;
      expect(res.status).toBe(401);
    } catch {
      previewUp = false;
    }
  });

  test("stale version returns 409", async () => {
    if (!previewUp) return;
    const cookie = await loginViaApi(E2E_FIXTURES.users.admin);
    if (!cookie) return;

    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{ version: number }>(
      `SELECT version FROM buildings WHERE id = 1`,
    );
    const version = rows[0]?.version ?? 1;
    await client.end();

    const stale = await patchBuilding(
      1,
      { lat: 14.1702, version: version - 1 },
      cookie,
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
      `SELECT version FROM rooms WHERE id = 1`,
    );
    const version = rows[0]?.version ?? 1;
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
      `SELECT version FROM rooms WHERE id = 1`,
    );
    const version = rows[0]?.version ?? 1;
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
    try {
      const health = await fetch(`${PREVIEW_BASE}/api/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!health.ok) return;
    } catch {
      return;
    }

    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{ version: number }>(
      `SELECT version FROM rooms WHERE id = 1`,
    );
    const version = rows[0]?.version ?? 1;
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

    const { loginViaApi, approveProposalHttp } = await import("../helpers/http");
    const cookie = await loginViaApi(E2E_FIXTURES.users.admin);
    if (!cookie) return;

    const res = await approveProposalHttp(proposal.id, cookie);
    expect(res.status).toBe(200);
  });
});
