import { describe, expect, it } from "bun:test";
import { readAmisPageMeta } from "@lib/amis/fetch-classes";

describe("readAmisPageMeta", () => {
  it("reads nested classes pagination fields", () => {
    expect(
      readAmisPageMeta(
        {
          classes: {
            total: 12228,
            last_page: 13,
            to: 1000,
            data: [],
          },
        },
        1,
      ),
    ).toEqual({ total: 12228, lastPage: 13 });
  });

  it("treats a full final page as the last page", () => {
    expect(
      readAmisPageMeta(
        {
          classes: {
            total: 12228,
            last_page: 13,
            to: 12228,
            data: [],
          },
        },
        13,
      ),
    ).toEqual({ total: 12228, lastPage: 13 });
  });

  it("falls back to the current page when metadata is missing", () => {
    expect(readAmisPageMeta({ classes: { data: [{}] } }, 1)).toEqual({
      total: null,
      lastPage: 1,
    });
  });
});
