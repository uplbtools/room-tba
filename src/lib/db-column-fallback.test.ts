import { describe, expect, mock, test } from "bun:test";
import {
  isUndefinedColumnError,
  withUndefinedColumnFallback,
} from "./db-column-fallback";

const missingColumn = Object.assign(
  new Error('column "contributor_id" does not exist'),
  { code: "42703" },
);

describe("isUndefinedColumnError", () => {
  test("matches 42703 directly and through a drizzle cause chain", () => {
    expect(isUndefinedColumnError(missingColumn)).toBe(true);
    expect(
      isUndefinedColumnError(
        new Error("Failed query", { cause: missingColumn }),
      ),
    ).toBe(true);
  });

  test("ignores other database errors", () => {
    expect(
      isUndefinedColumnError(Object.assign(new Error("x"), { code: "42P01" })),
    ).toBe(false);
    expect(isUndefinedColumnError(null)).toBe(false);
  });
});

describe("withUndefinedColumnFallback", () => {
  test("uses the primary result when the columns exist", async () => {
    const fallback = mock(async () => "old");
    await expect(
      withUndefinedColumnFallback("t", async () => "new", fallback),
    ).resolves.toBe("new");
    expect(fallback).not.toHaveBeenCalled();
  });

  test("falls back to the pre-migration query on 42703", async () => {
    await expect(
      withUndefinedColumnFallback(
        "t",
        async () => {
          throw new Error("Failed query", { cause: missingColumn });
        },
        async () => "old",
      ),
    ).resolves.toBe("old");
  });

  test("rethrows anything else", async () => {
    const boom = Object.assign(new Error("down"), { code: "57P01" });
    const fallback = mock(async () => "old");
    await expect(
      withUndefinedColumnFallback(
        "t",
        async () => {
          throw boom;
        },
        fallback,
      ),
    ).rejects.toBe(boom);
    expect(fallback).not.toHaveBeenCalled();
  });
});
