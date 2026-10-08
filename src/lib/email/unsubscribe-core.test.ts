import { describe, expect, test } from "bun:test";
import {
  isEmailTopic,
  listUnsubscribeHeaders,
  unsubscribeFooter,
  unsubscribeUrls,
} from "./unsubscribe-core";

describe("unsubscribe helpers", () => {
  test("urls carry the encoded token to the page and one-click endpoint", () => {
    const urls = unsubscribeUrls("https://room-tba.uplb.tools", "a.b+c");
    expect(urls.page).toBe(
      "https://room-tba.uplb.tools/unsubscribe?token=a.b%2Bc",
    );
    expect(urls.oneClick).toBe(
      "https://room-tba.uplb.tools/api/email/unsubscribe?token=a.b%2Bc",
    );
  });

  test("RFC 8058 one-click headers", () => {
    expect(
      listUnsubscribeHeaders("https://x/api/email/unsubscribe?token=t"),
    ).toEqual({
      "List-Unsubscribe": "<https://x/api/email/unsubscribe?token=t>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  test("footer names the topic and the link, without interpuncts", () => {
    const footer = unsubscribeFooter("digest", "https://x/unsubscribe?token=t");
    expect(footer).toContain("the daily review digest");
    expect(footer).toContain("https://x/unsubscribe?token=t");
    expect(footer).not.toContain("·");
  });

  test("topic guard", () => {
    expect(isEmailTopic("digest")).toBe(true);
    expect(isEmailTopic("review_notices")).toBe(true);
    expect(isEmailTopic("password")).toBe(false);
  });
});
