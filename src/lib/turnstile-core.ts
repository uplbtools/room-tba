const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Turnstile token from the client widget (#443). Always returns
 * true when `secret` is empty (Turnstile unconfigured — local dev).
 *
 * Do not send `remoteip`: behind Vercel/CDN the forwarded IP often differs
 * from what Cloudflare issued the token for, and siteverify then fails even
 * when the widget shows Success.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  secret: string,
  _remoteIp?: string,
): Promise<boolean> {
  const trimmedSecret = secret.trim();
  if (!trimmedSecret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({
      secret: trimmedSecret,
      response: token,
    });

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success === true) return true;
    console.error("Turnstile siteverify rejected token:", data["error-codes"]);
    return false;
  } catch (error) {
    console.error("Turnstile siteverify failed:", error);
    return false;
  }
}
