/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Signed-in editor identity resolved by middleware (HMAC cookie). */
    editorUser?: import("@lib/admin/auth").SessionUser;
  }
}

/** Cloudflare Turnstile client widget (#443), loaded lazily via <script>. */
interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface Window {
  turnstile?: {
    render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
    remove: (widgetId: string) => void;
  };
}
