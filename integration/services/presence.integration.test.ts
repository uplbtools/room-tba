import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import { integrationDatabaseUrl, skipWithoutE2eDb } from "../helpers/env";
import { connectE2eClient } from "../../scripts/e2e-schema";

const describeIntegration = skipWithoutE2eDb() ? describe.skip : describe;

/** Every sid this suite writes starts with this, so cleanup never touches real rows. */
const TEST_PREFIX = "itest";

function testSid(label: string): string {
  // Kept inside /^[a-zA-Z0-9-]{8,64}$/ on purpose — dashes and alnum only.
  return `${TEST_PREFIX}-${label}-${Date.now()}`;
}

async function callPresence(body: unknown): Promise<Response> {
  const { POST } = await import("../../src/pages/api/presence");
  const request = new Request("http://localhost/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  // The handler only reads `request`; the rest of APIContext is unused.
  return (await (POST as (ctx: { request: Request }) => Promise<Response>)({
    request,
  })) as Response;
}

async function withClient<T>(
  run: (client: Awaited<ReturnType<typeof connectE2eClient>>) => Promise<T>,
): Promise<T> {
  const client = await connectE2eClient(integrationDatabaseUrl()!);
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function purgeTestRows(): Promise<void> {
  await withClient((client) =>
    client.query("DELETE FROM presence WHERE sid LIKE $1", [
      `${TEST_PREFIX}-%`,
    ]),
  );
}

/** Rows the endpoint would count as online right now. */
async function onlineSids(): Promise<string[]> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ sid: string }>(
      "SELECT sid FROM presence WHERE last_seen_at > now() - interval '90 seconds'",
    );
    return rows.map((row) => row.sid);
  });
}

async function sidRowCount(sid: string): Promise<number> {
  return withClient(async (client) => {
    const { rows } = await client.query<{ count: string }>(
      "SELECT count(*)::int AS count FROM presence WHERE sid = $1",
      [sid],
    );
    return Number(rows[0]?.count ?? 0);
  });
}

async function seedRow(sid: string, ageInterval: string): Promise<void> {
  await withClient((client) =>
    client.query(
      `INSERT INTO presence (sid, last_seen_at) VALUES ($1, now() - interval '${ageInterval}')
       ON CONFLICT (sid) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`,
      [sid],
    ),
  );
}

describeIntegration("presence endpoint", () => {
  beforeAll(purgeTestRows);
  afterAll(purgeTestRows);

  describe("sid validation", () => {
    test("rejects junk sids without writing a row", async () => {
      const before = await withClient(async (client) => {
        const { rows } = await client.query<{ count: string }>(
          "SELECT count(*)::int AS count FROM presence",
        );
        return Number(rows[0]?.count ?? 0);
      });

      for (const junk of [
        "short",
        "a".repeat(65),
        "'; DROP TABLE presence; --",
        "has spaces in it",
        "under_scores_not_allowed",
        42,
        null,
        { sid: "nested" },
      ]) {
        const res = await callPresence({ sid: junk });
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "invalid sid" });
      }

      const after = await withClient(async (client) => {
        const { rows } = await client.query<{ count: string }>(
          "SELECT count(*)::int AS count FROM presence",
        );
        return Number(rows[0]?.count ?? 0);
      });
      expect(after).toBe(before);
    });

    test("rejects a body that is not JSON", async () => {
      const res = await callPresence("not json at all");
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid body" });
    });

    test("accepts a real crypto.randomUUID() and never caches the response", async () => {
      const sid = testSid("uuid");
      const res = await callPresence({ sid });

      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      const body = (await res.json()) as { online: number };
      expect(body.online).toBeGreaterThanOrEqual(1);
      expect(await onlineSids()).toContain(sid);
    });
  });

  test("upsert is idempotent for the same sid", async () => {
    const sid = testSid("idem");

    const first = (await (await callPresence({ sid })).json()) as {
      online: number;
    };
    const firstSeen = await withClient(async (client) => {
      const { rows } = await client.query<{ last_seen_at: string }>(
        "SELECT last_seen_at FROM presence WHERE sid = $1",
        [sid],
      );
      return rows[0]?.last_seen_at;
    });

    const second = (await (await callPresence({ sid })).json()) as {
      online: number;
    };
    const third = (await (await callPresence({ sid })).json()) as {
      online: number;
    };

    // One session is one row no matter how many heartbeats it sends.
    expect(await sidRowCount(sid)).toBe(1);
    expect(second.online).toBe(first.online);
    expect(third.online).toBe(first.online);

    // …and the heartbeat still refreshes the timestamp.
    const lastSeen = await withClient(async (client) => {
      const { rows } = await client.query<{ last_seen_at: string }>(
        "SELECT last_seen_at FROM presence WHERE sid = $1",
        [sid],
      );
      return rows[0]?.last_seen_at;
    });
    expect(new Date(lastSeen!).getTime()).toBeGreaterThanOrEqual(
      new Date(firstSeen!).getTime(),
    );
  });

  test("count reflects only sessions inside the 90s window", async () => {
    const live = testSid("live");
    const stale = testSid("stale");

    // Older than the window but younger than the 10 min prune TTL.
    await seedRow(stale, "5 minutes");
    const res = (await (await callPresence({ sid: live })).json()) as {
      online: number;
    };

    const counted = await onlineSids();
    expect(counted).toContain(live);
    expect(counted).not.toContain(stale);

    // The stale session is excluded from the count but still on the table.
    expect(await sidRowCount(stale)).toBe(1);
    expect(res.online).toBe(counted.length);
  });

  describe("prune", () => {
    const realRandom = Math.random;
    afterEach(() => {
      Math.random = realRandom;
    });

    test("removes rows past the 10 minute TTL", async () => {
      const live = testSid("prune-live");
      const dead = testSid("prune-dead");
      const borderline = testSid("prune-borderline");

      await seedRow(dead, "11 minutes");
      await seedRow(borderline, "9 minutes");
      expect(await sidRowCount(dead)).toBe(1);

      // Prune is sampled at 10% of requests; force this one to take the branch.
      Math.random = () => 0;
      const res = await callPresence({ sid: live });
      expect(res.status).toBe(200);

      expect(await sidRowCount(dead)).toBe(0);
      expect(await sidRowCount(borderline)).toBe(1);
      expect(await sidRowCount(live)).toBe(1);
    });

    test("leaves stale rows alone when the request is not sampled", async () => {
      const live = testSid("nosample-live");
      const dead = testSid("nosample-dead");

      await seedRow(dead, "11 minutes");

      Math.random = () => 0.99;
      await callPresence({ sid: live });

      expect(await sidRowCount(dead)).toBe(1);
    });
  });
});
