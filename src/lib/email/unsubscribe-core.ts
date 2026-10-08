/** Pure unsubscribe helpers (no astro:env/db imports) so bun test can load them. */

/** Non-transactional email kinds a user can switch off (auth audit item 20). */
export type EmailTopic = "digest" | "review_notices";

export const EMAIL_TOPICS: readonly EmailTopic[] = ["digest", "review_notices"];

export const EMAIL_TOPIC_LABELS: Record<EmailTopic, string> = {
  digest: "the daily review digest",
  review_notices: "review notices about suggested edits",
};

export function isEmailTopic(value: unknown): value is EmailTopic {
  return value === "digest" || value === "review_notices";
}

export function unsubscribeUrls(
  siteUrl: string,
  token: string,
): { page: string; oneClick: string } {
  const q = `token=${encodeURIComponent(token)}`;
  return {
    page: `${siteUrl}/unsubscribe?${q}`,
    oneClick: `${siteUrl}/api/email/unsubscribe?${q}`,
  };
}

/**
 * RFC 2369 + RFC 8058 headers: mail clients show their own "Unsubscribe"
 * button and POST to the one-click URL without opening a page.
 */
export function listUnsubscribeHeaders(
  oneClickUrl: string,
): Record<string, string> {
  return {
    "List-Unsubscribe": `<${oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

/** Plain-text footer every non-transactional email ends with. */
export function unsubscribeFooter(topic: EmailTopic, pageUrl: string): string {
  return [
    "",
    "--",
    `To stop receiving ${EMAIL_TOPIC_LABELS[topic]}, open ${pageUrl}`,
    "or change it any time in Account settings, Email notifications.",
  ].join("\n");
}
