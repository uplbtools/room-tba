import { RESEND_API_KEY, RESEND_FROM_EMAIL } from "astro:env/server";
import { recordEmailAttempt } from "@lib/email/email-log";

export function isResendConfigured(): boolean {
  return Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL);
}

/** Abort a stuck Resend call; callers log the failure in email_log. */
const RESEND_TIMEOUT_MS = 10_000;

export type SendEmailInput = {
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  /** Short template name for email_log, e.g. `password-reset`, `digest`. */
  template?: string;
  /**
   * Resend Idempotency-Key: the same key within 24h returns the first send
   * instead of mailing again, so a retried cron or request cannot double-send.
   */
  idempotencyKey?: string;
  /** Extra headers, e.g. List-Unsubscribe on non-transactional mail. */
  headers?: Record<string, string>;
};

/**
 * Send an email via the Resend REST API (no SDK dependency).
 * Throws on non-2xx so callers can log per-recipient failures. Every attempt
 * (sent or failed) is recorded in email_log for the staff dashboard.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<{ id: string | null }> {
  if (!isResendConfigured()) {
    throw new Error(
      "Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL).",
    );
  }
  const template = input.template ?? "generic";
  const log = (
    status: "sent" | "failed",
    providerId: string | null,
    error?: string,
  ) =>
    recordEmailAttempt({
      to: input.to,
      template,
      status,
      providerId,
      error: error ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
    });

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
        ...(input.idempotencyKey
          ? { "Idempotency-Key": input.idempotencyKey.slice(0, 256) }
          : {}),
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: input.to,
        ...(input.cc?.length ? { cc: input.cc } : {}),
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      }),
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log("failed", null, message);
    throw error;
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message = `Resend API error ${res.status}: ${detail.slice(0, 300)}`;
    await log("failed", null, message);
    throw new Error(message);
  }
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  const id = typeof data.id === "string" ? data.id : null;
  await log("sent", id);
  return { id };
}
