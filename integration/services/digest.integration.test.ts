import {
  describe,
  expect,
  test,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { connectE2eClient, type E2eClient } from "../../scripts/e2e-schema";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

const PREFIX = "e2e-digest";

describeIntegration("digest service integration (#272 follow-up)", () => {
  let client: E2eClient;

  const cleanup = async () => {
    await client.query("DELETE FROM admin_users WHERE username LIKE $1", [
      `${PREFIX}%`,
    ]);
  };

  beforeAll(async () => {
    const url = integrationDatabaseUrl();
    if (!url) return;
    client = await connectE2eClient(url);
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

    // Only confirmed addresses get notification mail (0053): verify all
    // but the "unverified" editor added below.
    await client.query(
      `INSERT INTO admin_user_auth (user_id, verified_email, email_verified_at)
       SELECT id, lower(email), now() FROM admin_users
       WHERE username LIKE $1 AND email IS NOT NULL`,
      [`${PREFIX}%`],
    );
    await client.query(
      `INSERT INTO admin_users (username, password_hash, role, email, is_active)
       VALUES ($1, 'x', 'editor', $2, true)`,
      [`${PREFIX}-unverified`, `${PREFIX}-unverified@example.com`],
    );

    const { listDigestRecipients } = await import(
      "@lib/services/digest-service"
    );
    const recipients = await listDigestRecipients();

    expect(recipients).not.toContain(`${PREFIX}-unverified@example.com`);
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
