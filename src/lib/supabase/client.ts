import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

let browserClient: SupabaseClient | undefined;

/** Browser Supabase client (singleton). Use in Svelte components and client scripts. */
export function createBrowserSupabaseClient(): SupabaseClient {
  browserClient ??= createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
  return browserClient;
}
