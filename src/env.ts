import { defineEnvVars } from '@sveltejs/kit/env';

// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
export const variables = defineEnvVars({
	KUBO_ROOM_TBA_DIRECTORY_URL: { schema: (input) => input ?? '' },
	ASTRO_E2E_SKIP_LOGIN_RATE_LIMIT: { schema: (input) => input ?? '' },
	PAYMONGO_SECRET_KEY: { schema: (input) => input ?? '' },
	CRON_SECRET: { schema: (input) => input ?? '' },
	R2_PUBLIC_URL: { schema: (input) => input ?? '' },
	ANTHROPIC_API_KEY: { schema: (input) => input ?? '' },
	DATABASE_URL: { schema: (input) => input ?? '' },
	PUBLIC_GOOGLE_MAPS_API_KEY: { public: true, schema: (input) => input ?? '' }
});
