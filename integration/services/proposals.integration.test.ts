import { describe, expect, test, beforeAll } from "bun:test";
import {
  E2E_FIXTURES,
  approveProposalHttp,
  loginViaApi,
  patchBuilding,
  submitProposal as submitProposalHttp,
  withdrawProposalHttp,
} from "../helpers/http";
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
      submitterName: "E2E Anonymous",
      submitterUserId: null,
      proposalId: null,
    });
    expect(proposal.status).toBe("pending");
  });

  test("anonymous proposal cannot use a registered contributor's name", async () => {
    if (!integrationDatabaseUrl()) return;
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{
      version: number;
      username: string;
    }>(
      "SELECT r.version, u.username FROM rooms r, admin_users u WHERE r.id = 1 LIMIT 1",
    );
    const version = readEntityVersion(rows);
    const username = rows[0]?.username;
    await client.end();
    if (!username) return; // no accounts seeded — nothing to reserve

    const { submitProposal, ProposalValidationError } = await import(
      "@lib/services/proposal-service"
    );
    // Case/spacing variants collapse to the reserved account name.
    await expect(
      submitProposal({
        entityType: "room",
        entityId: 1,
        baseVersion: version,
        patch: { directions: "Impersonation attempt" },
        submitterName: ` ${username.toUpperCase()} `,
        submitterUserId: null,
        proposalId: null,
      }),
    ).rejects.toThrow(ProposalValidationError);
  });

  test("revises a signed-in contributor proposal without creating another row", async () => {
    if (!integrationDatabaseUrl()) return;
    const marker = `QA-255 revise ${Date.now()}`;
    const revisedDirections = `${marker} revised`;
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{
      version: number;
      id: number;
      username: string;
    }>(
      `
      SELECT r.version, u.id, u.username
      FROM rooms r
      CROSS JOIN admin_users u
      WHERE r.id = 1 AND u.username = $1
    `,
      [E2E_FIXTURES.users.contributor],
    );
    const version = readEntityVersion(rows);
    const contributor = rows[0];
    await client.end();
    if (!contributor) throw new Error("Contributor fixture was not seeded.");

    const { submitProposal } = await import("@lib/services/proposal-service");
    const created = await submitProposal({
      entityType: "room",
      entityId: 1,
      baseVersion: version,
      patch: { directions: marker },
      submitterName: contributor.username,
      submitterUserId: contributor.id,
      proposalId: null,
    });
    const revised = await submitProposal({
      entityType: "room",
      entityId: 1,
      baseVersion: version,
      patch: { directions: revisedDirections },
      submitterName: contributor.username,
      submitterUserId: contributor.id,
      proposalId: created.id,
    });

    expect(revised.id).toBe(created.id);
    expect(revised.status).toBe("pending");
    expect(revised.proposedPatch).toMatchObject({
      directions: revisedDirections,
    });

    const verifyClient = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await verifyClient.connect();
    const count = await verifyClient.query<{ count: string }>(
      "SELECT count(*) FROM edit_proposals WHERE submitter_user_id = $1 AND proposed_patch->>'directions' = $2",
      [contributor.id, revisedDirections],
    );
    await verifyClient.end();
    expect(Number(count.rows[0]?.count)).toBe(1);
  });

  test("withdraw route enforces ownership and open status", async () => {
    if (!integrationDatabaseUrl()) return;
    await requirePreview(PREVIEW_BASE);
    const marker = `QA-255 withdraw ${Date.now()}`;
    const contributorCookie = await loginViaApi(E2E_FIXTURES.users.contributor);
    const otherCookie = await loginViaApi(E2E_FIXTURES.users.editor);
    expect(contributorCookie).toBeTruthy();
    expect(otherCookie).toBeTruthy();

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

    const submitted = await submitProposalHttp(
      {
        entityType: "room",
        entityId: 1,
        baseVersion: version,
        patch: { directions: marker },
      },
      contributorCookie!,
    );
    expect(submitted.status).toBe(201);
    const { proposal } = (await submitted.json()) as {
      proposal: { id: number };
    };

    expect((await withdrawProposalHttp(proposal.id, otherCookie!)).status).toBe(
      403,
    );
    const withdrawn = await withdrawProposalHttp(
      proposal.id,
      contributorCookie!,
    );
    expect(withdrawn.status).toBe(200);
    expect(
      ((await withdrawn.json()) as { proposal: { status: string } }).proposal
        .status,
    ).toBe("withdrawn");
    expect(
      (await withdrawProposalHttp(proposal.id, contributorCookie!)).status,
    ).toBe(409);
  });

  test("stale proposal approval returns 409 and rolls back its review claim", async () => {
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
      patch: { directions: `QA-255 stale ${Date.now()}` },
      submitterName: "E2E Anonymous",
      submitterUserId: null,
      proposalId: null,
    });

    const { updateRoom } = await import("@lib/services/admin-service");
    await updateRoom(
      1,
      { directions: `QA-255 competing update ${Date.now()}` },
      version,
      E2E_FIXTURES.users.admin,
    );

    const cookie = await loginViaApi(E2E_FIXTURES.users.admin);
    expect(cookie).toBeTruthy();
    expect((await approveProposalHttp(proposal.id, cookie!)).status).toBe(409);

    const verifyClient = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await verifyClient.connect();
    const proposalRow = await verifyClient.query<{
      status: string;
      reviewed_by: string | null;
      reviewed_at: string | null;
    }>(
      "SELECT status, reviewed_by, reviewed_at FROM edit_proposals WHERE id = $1",
      [proposal.id],
    );
    await verifyClient.end();
    expect(proposalRow.rows[0]).toMatchObject({
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
    });
  }, 15_000);

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
      submitterName: "E2E Anonymous",
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

  test("approval appends one ledger row for a signed-in contributor", async () => {
    if (!integrationDatabaseUrl()) return;
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await client.connect();
    const { rows } = await client.query<{
      version: number;
      contributor_id: number;
      contributor_name: string;
      reviewer_id: number;
      reviewer_name: string;
    }>(
      `
      SELECT
        r.version,
        contributor.id AS contributor_id,
        contributor.username AS contributor_name,
        reviewer.id AS reviewer_id,
        reviewer.username AS reviewer_name
      FROM rooms r
      CROSS JOIN admin_users contributor
      CROSS JOIN admin_users reviewer
      WHERE r.id = 1
        AND contributor.username = $1
        AND reviewer.username = $2
      LIMIT 1
    `,
      [E2E_FIXTURES.users.contributor, E2E_FIXTURES.users.admin],
    );
    const fixture = rows[0];
    await client.end();
    if (!fixture) throw new Error("Contributor fixtures were not seeded.");

    const { approveProposal, submitProposal } = await import(
      "@lib/services/proposal-service"
    );
    const proposal = await submitProposal({
      entityType: "room",
      entityId: 1,
      baseVersion: fixture.version,
      patch: { directions: `Ledger approval ${Date.now()}` },
      submitterName: fixture.contributor_name,
      submitterUserId: fixture.contributor_id,
      proposalId: null,
    });
    await approveProposal(proposal.id, {
      id: fixture.reviewer_id,
      username: fixture.reviewer_name,
      displayName: fixture.reviewer_name,
      role: "admin",
    });

    const verifyClient = new pg.default.Client({
      connectionString: integrationDatabaseUrl()!,
    });
    await verifyClient.connect();
    const ledger = await verifyClient.query<{
      user_id: number;
      proposal_id: number;
      source: string;
    }>(
      "SELECT user_id, proposal_id, source FROM contributions WHERE proposal_id = $1",
      [proposal.id],
    );
    await verifyClient.end();
    expect(ledger.rows).toEqual([
      {
        user_id: fixture.contributor_id,
        proposal_id: proposal.id,
        source: "proposal_approved",
      },
    ]);
  });
});
