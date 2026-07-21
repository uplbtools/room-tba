/// <reference types="astro/client" />

import type { SupabaseClient, User } from "@supabase/supabase-js";

declare namespace App {
  interface Locals {
    supabase?: SupabaseClient;
    supabaseUser?: User;
    supabaseCacheHeaders?: Record<string, string>;
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
