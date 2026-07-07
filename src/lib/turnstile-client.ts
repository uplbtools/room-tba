import { PUBLIC_TURNSTILE_SITE_KEY } from "astro:env/client";

export function isTurnstileWidgetConfigured(): boolean {
  return Boolean(PUBLIC_TURNSTILE_SITE_KEY);
}

export function getTurnstileSiteKey(): string {
  return PUBLIC_TURNSTILE_SITE_KEY;
}
