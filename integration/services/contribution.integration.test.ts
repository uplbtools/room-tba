import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import pg from "pg";
import {
  integrationDatabaseUrl,
  PREVIEW_BASE,
  previewFetchInit,
  requirePreview,
  skipWithoutE2eDb,
} from "../helpers/env";
import { E2E_FIXTURES, loginViaApi } from "../helpers/http";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;
const PREFIX = "e2e-contribution";

describeIntegration("contribution ledger", () => {
  let client: pg.Client;
  let visibleUserId: number;

  async function cleanup() {
    await client.query(
      "DELETE FROM contributions WHERE user_id IN (SELECT id FROM admin_users WHERE username LIKE $1)",
      [`${PREFIX}%`],
    );
    await client.query(
      "DELETE FROM editor_history WHERE edited_by IN ('Visible Contributor', 'Hidden Contributor')",
    );
    await client.query("DELETE FROM admin_users WHERE username LIKE $1", [
      `${PREFIX}%`,
    ]);
  }

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = new pg.Client({ connectionString: url });
    await client.connect();
  });

  beforeEach(async () => {
    await cleanup();
    const { rows } = await client.query<{ id: number }>(`
      INSERT INTO admin_users (username, display_name, password_hash, role, is_active, show_in_credits)
      VALUES
        ('${PREFIX}-visible', 'Visible Contributor', '', 'contributor', true, true),
        ('${PREFIX}-hidden', 'Hidden Contributor', '', 'contributor', true, false)
      RETURNING id
    `);
    visibleUserId = rows[0]!.id;

    await client.query(
      `INSERT INTO contributions (user_id, submitter_name, entity_type, entity_id, entity_label, source, created_at)
       VALUES
         ($1, 'Visible Contributor', 'room', 1, 'Visible room', 'proposal_approved', '2026-07-01T00:00:00Z'),
         ($1, 'Visible Contributor', 'building', 2, 'Visible building', 'proposal_approved', '2026-07-02T00:00:00Z'),
         ($2, 'Hidden Contributor', 'room', 3, 'Hidden room', 'proposal_approved', '2026-07-03T00:00:00Z')`,
      [rows[0]!.id, rows[1]!.id],
    );
  });

  afterAll(async () => {
    await cleanup();
    await client?.end();
  });

  test("ranks only active contributors who opted into public credits", async () => {
    const { getContributorLeaderboard } = await import(
      "@lib/services/contribution-service"
    );
    const leaderboard = await getContributorLeaderboard("all");

    // Other integration fixtures also append ledger rows, so assert this
    // contributor's row instead of an absolute rank.
    const visible = leaderboard.find(
      (row) => row.displayName === "Visible Contributor",
    );
    expect(visible).toMatchObject({ contributionCount: 2 });
    expect(visible?.rank).toBeGreaterThanOrEqual(1);
    expect(new Date(visible?.lastContributionAt ?? "").toISOString()).toBe(
      "2026-07-02T00:00:00.000Z",
    );
    expect(leaderboard.map((row) => row.displayName)).not.toContain(
      "Hidden Contributor",
    );
  });

  test("returns a signed-in contributor's full ledger newest first", async () => {
    const { getMyContributions } = await import(
      "@lib/services/contribution-service"
    );
    await expect(getMyContributions(visibleUserId)).resolves.toMatchObject([
      { entityLabel: "Visible building" },
      { entityLabel: "Visible room" },
    ]);
  });

  test("records direct editor publishes with the editor's account", async () => {
    const { sessionPublishingActor } = await import("@lib/admin/auth");
    const { recordEditorHistory } = await import("@lib/services/admin-service");
    await recordEditorHistory({
      entityType: "room",
      entityId: 99,
      action: "update",
      before: null,
      after: { roomCode: "Direct room" },
      editedBy: sessionPublishingActor({
        id: visibleUserId,
        username: `${PREFIX}-visible`,
        displayName: "Visible Contributor",
        role: "contributor",
      }),
    });
    const { getMyContributions } = await import(
      "@lib/services/contribution-service"
    );
    const contributions = await getMyContributions(visibleUserId);
    expect(contributions[0]).toMatchObject({
      entityLabel: "Direct room",
      source: "editor_published",
    });
  });

  test("serves the signed-in contributor's ledger without exposing another account", async () => {
    await requirePreview(PREVIEW_BASE);
    const marker = `My contribution ${Date.now()}`;
    await client.query(
      `INSERT INTO contributions (user_id, submitter_name, entity_type, entity_id, entity_label, source)
       SELECT id, username, 'room', 1, $1, 'proposal_approved'
       FROM admin_users WHERE username = $2`,
      [marker, E2E_FIXTURES.users.contributor],
    );
    const cookie = await loginViaApi(E2E_FIXTURES.users.contributor);
    expect(cookie).toBeTruthy();

    const response = await fetch(
      `${PREVIEW_BASE}/api/contributions/mine`,
      previewFetchInit({ headers: { Cookie: cookie! } }),
    );
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      contributions: Array<{ entityLabel: string }>;
    };
    expect(data.contributions.map((row) => row.entityLabel)).toContain(marker);
    expect(data.contributions.map((row) => row.entityLabel)).not.toContain(
      "Visible room",
    );
  });
});
