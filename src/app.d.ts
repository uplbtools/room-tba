// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { SeoData } from '#lib/components/seo/seo-data.js';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase?: SupabaseClient;
			supabaseUser?: User;
			supabaseCacheHeaders?: Record<string, string>;
		}
		interface PageData {
			/** Set by entity routes; the (app) layout renders it into <head>. */
			seo?: SeoData;
		}
		// interface PageState {}
		// interface Platform {}
	}

	/** Cloudflare Turnstile client widget (#443), loaded lazily via <script>. */
	interface TurnstileRenderOptions {
		sitekey: string;
		callback?: (token: string) => void;
		'expired-callback'?: () => void;
		'error-callback'?: () => void;
	}

	interface Window {
		turnstile?: {
			render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
			remove: (widgetId: string) => void;
		};
	}

	/** Chromium-only install prompt event; not in lib.dom. */
	interface BeforeInstallPromptEvent extends Event {
		prompt(): Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	}
}
