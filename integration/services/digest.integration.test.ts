import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import pg from "pg";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

const PREFIX = "e2e-digest";

describeIntegration("digest service integration (#272 follow-up)", () => {
  let client: pg.Client;

  const cleanup = async () => {
    await client.query(`DELETE FROM admin_users WHERE username LIKE $1`, [
      `${PREFIX}%`,
    ]);
  };

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = new pg.Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await cleanup();
    await client?.end();
  });

  beforeEach(cleanup);

  test("listDigestRecipients only includes active admins/editors with an email", async () => {
    await client.query(
      `INSERT INTO admin_users (username, password_hash, role, email, is_active) VALUES
         ($1, 'x', 'editor', $2, true),
         ($3, 'x', 'admin', $4, true),
         ($5, 'x', 'contributor', $6, true),
         ($7, 'x', 'editor', NULL, true),
         ($8, 'x', 'editor', $9, false)`,
      [
        `${PREFIX}-editor`,
        `${PREFIX}-editor@example.com`,
        `${PREFIX}-admin`,
        `${PREFIX}-ADMIN@Example.com`,
        `${PREFIX}-contributor`,
        `${PREFIX}-contributor@example.com`,
        `${PREFIX}-no-email`,
        `${PREFIX}-inactive`,
        `${PREFIX}-inactive@example.com`,
      ],
    );

    const { listDigestRecipients } = await import(
      "@lib/services/digest-service"
    );
    const recipients = await listDigestRecipients();

    expect(recipients).toContain(`${PREFIX}-editor@example.com`);
    // normalized to lowercase
    expect(recipients).toContain(`${PREFIX}-admin@example.com`);
    expect(recipients).not.toContain(`${PREFIX}-contributor@example.com`);
    expect(recipients).not.toContain(`${PREFIX}-inactive@example.com`);
  });

  test("sendProposalDigest skips cleanly when Resend is unconfigured", async () => {
    const { sendProposalDigest } = await import("@lib/services/digest-service");
    const result = await sendProposalDigest();
    // Integration harness never sets RESEND_API_KEY/RESEND_FROM_EMAIL.
    expect(result.skipped).toBe("unconfigured");
    expect(result.pendingCount).toBe(0);
    expect(result.recipientCount).toBe(0);
  });
});
