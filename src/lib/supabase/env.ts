import {
  PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SUPABASE_URL,
} from "astro:env/client";

export function isSupabaseConfigured(): boolean {
  return Boolean(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabaseUrl(): string {
  if (!PUBLIC_SUPABASE_URL) {
    throw new Error(
      "PUBLIC_SUPABASE_URL is not configured. Add it to .env and astro.config.mjs.",
    );
  }
  return PUBLIC_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  if (!PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured. Add it to .env and astro.config.mjs.",
    );
  }
  return PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}
