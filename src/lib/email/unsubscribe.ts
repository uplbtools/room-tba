import { createSignedToken, verifySignedToken } from "@lib/admin/signed-token";
import {
  type EmailTopic,
  isEmailTopic,
  listUnsubscribeHeaders,
  unsubscribeFooter,
  unsubscribeUrls,
} from "@lib/email/unsubscribe-core";
import { SITE_URL } from "@lib/site";

/** Long-lived: people unsubscribe from mail that is months old. */
const UNSUBSCRIBE_TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60;

type UnsubscribeTokenPayload = {
  purpose: "unsubscribe";
  userId: number;
  topic: EmailTopic;
};

export function createUnsubscribeToken(
  userId: number,
  topic: EmailTopic,
): string {
  return createSignedToken<UnsubscribeTokenPayload>(
    { purpose: "unsubscribe", userId, topic },
    UNSUBSCRIBE_TOKEN_TTL_SECONDS,
  );
}

export function verifyUnsubscribeToken(
  token: string,
): { userId: number; topic: EmailTopic } | null {
  try {
    const payload = verifySignedToken<UnsubscribeTokenPayload>(token);
    if (
      payload?.purpose !== "unsubscribe" ||
      !Number.isInteger(payload.userId) ||
      !isEmailTopic(payload.topic)
    ) {
      return null;
    }
    return { userId: payload.userId, topic: payload.topic };
  } catch {
    return null;
  }
}

/** Footer text + headers for one recipient of a non-transactional email. */
export function unsubscribeParts(
  userId: number,
  topic: EmailTopic,
): { footer: string; headers: Record<string, string> } {
  const urls = unsubscribeUrls(SITE_URL, createUnsubscribeToken(userId, topic));
  return {
    footer: unsubscribeFooter(topic, urls.page),
    headers: listUnsubscribeHeaders(urls.oneClick),
  };
}
