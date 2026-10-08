import { TURNSTILE_SECRET_KEY } from "astro:env/server";
import {
  turnstileMayBeUnconfigured,
  verifyTurnstileToken as verifyTurnstileTokenCore,
} from "./turnstile-core";

export function isTurnstileConfigured(): boolean {
  return Boolean(TURNSTILE_SECRET_KEY);
}

/** Fails closed without a secret except in dev or with the explicit flag. */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  _remoteIp?: string,
): Promise<boolean> {
  return verifyTurnstileTokenCore(token, TURNSTILE_SECRET_KEY ?? "", {
    allowUnconfigured: turnstileMayBeUnconfigured({
      dev: import.meta.env.DEV,
      flag: allowUnconfiguredFlag(),
    }),
  });
}

function allowUnconfiguredFlag(): string | undefined {
  const { TURNSTILE_ALLOW_UNCONFIGURED } = process.env;
  return TURNSTILE_ALLOW_UNCONFIGURED;
}
