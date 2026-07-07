import { TURNSTILE_SECRET_KEY } from "astro:env/server";
import { verifyTurnstileToken as verifyTurnstileTokenCore } from "./turnstile-core";

export function isTurnstileConfigured(): boolean {
  return Boolean(TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<boolean> {
  return verifyTurnstileTokenCore(token, TURNSTILE_SECRET_KEY, remoteIp);
}
