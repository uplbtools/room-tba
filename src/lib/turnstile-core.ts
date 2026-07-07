const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Turnstile token from the client widget (#443). Always returns
 * true when `secret` is empty (Turnstile unconfigured — local dev).
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  secret: string,
  remoteIp?: string,
): Promise<boolean> {
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error) {
    console.error("Turnstile siteverify failed:", error);
    return false;
  }
}
