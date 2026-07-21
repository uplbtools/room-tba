import { describe, expect, test } from "vitest";
import { assertLocalDatabase, KUBO_DORM_SEED } from "./seed-kubo-dorms";

describe("Kubo dorm local seed", () => {
  test.each(["localhost", "127.0.0.1", "[::1]"])(
    "allows loopback host %s",
    (host) => {
      expect(() =>
        assertLocalDatabase(
          `postgresql://roomtba:roomtba@${host}:5432/room_tba`,
        ),
      ).not.toThrow();
    },
  );

  test("rejects remote databases", () => {
    expect(() =>
      assertLocalDatabase(
        "postgresql://roomtba:roomtba@db.example.supabase.co:5432/postgres",
      ),
    ).toThrow("Refusing to seed non-local database host");
  });

  test("includes mapped and unmapped dorm fixtures", () => {
    expect(
      KUBO_DORM_SEED.filter((dorm) => dorm.hasKuboListing).map(
        (dorm) => dorm.id,
      ),
    ).toEqual([12, 15]);
    expect(
      KUBO_DORM_SEED.filter((dorm) => !dorm.hasKuboListing).map(
        (dorm) => dorm.id,
      ),
    ).toEqual([10, 11, 13, 14]);
  });
});
