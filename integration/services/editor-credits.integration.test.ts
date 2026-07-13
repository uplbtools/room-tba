import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import pg from "pg";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;
const PREFIX = "e2e-editor-credits";

describeIntegration("editor credits service (#274)", () => {
  let client: pg.Client;

  async function cleanup() {
    await client.query(
      "DELETE FROM contributions WHERE user_id IN (SELECT id FROM admin_users WHERE username LIKE $1)",
      [`${PREFIX}%`],
    );
    await client.query("DELETE FROM editor_history WHERE edited_by LIKE $1", [
      `${PREFIX}%`,
    ]);
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
    await client.query(`
      INSERT INTO admin_users (
        username, display_name, password_hash, role, is_active, show_in_credits, legacy_credit, avatar_url
      )
      VALUES
        ('${PREFIX}-editor', 'Direct Editor', '', 'editor', true, true, false, NULL),
        ('${PREFIX}-contributor', 'Approved Contributor', '', 'contributor', true, true, false, NULL),
        ('${PREFIX}-hidden', 'Hidden Person', '', 'editor', true, false, false, NULL),
        ('${PREFIX}-inactive', 'Inactive Person', '', 'editor', false, true, false, NULL),
        ('${PREFIX}-legacy', 'Legacy Editor', '', 'editor', false, true, true, NULL),
        ('${PREFIX}-legacy-profile', 'Legacy Profile', '', 'editor', false, true, true, '/contributors/rosh-almario.png')
    `);
    await client.query(
      `INSERT INTO editor_history (entity_type, entity_id, action, edited_by)
       VALUES ('room', 1, 'update', $1), ('room', 2, 'update', $2), ('room', 3, 'update', $3)`,
      ["Direct Editor", "Hidden Person", "Inactive Person"],
    );
    await client.query(
      `INSERT INTO contributions (user_id, submitter_name, entity_type, entity_id, entity_label, source)
       SELECT id, display_name, 'room', 1, 'E2E Room', 'proposal_approved'
       FROM admin_users WHERE username = $1`,
      [`${PREFIX}-contributor`],
    );
  });

  afterAll(async () => {
    await cleanup();
    await client?.end();
  });

  test("includes active editor/contributor and legacy records, without private fields", async () => {
    const { getEditorCredits } = await import(
      "@lib/services/editor-credits-service"
    );
    const credits = await getEditorCredits();
    const names = credits.map((credit) => credit.name);

    expect(names).toContain("Direct Editor");
    expect(names).toContain("Approved Contributor");
    expect(names).not.toContain("Hidden Person");
    expect(names).not.toContain("Inactive Person");
    expect(names).toContain("Legacy Editor");
    expect(credits.find((credit) => credit.name === "Legacy Profile")).toEqual({
      name: "Legacy Profile",
      avatarUrl: "/contributors/rosh-almario.png",
      profileUrl: null,
    });
    expect(Object.keys(credits[0] ?? {}).sort()).toEqual([
      "avatarUrl",
      "name",
      "profileUrl",
    ]);
  });
});
